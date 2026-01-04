import { RequiresPermissions } from "$lib/functions/requirePermissions";
import { db } from "$lib/server/db";
import { messages } from "$lib/server/db/schema";
import { normaliseChatFromDatabase, normaliseMessageFromDatabase, type Message } from "$lib/types/messages";
import { Permission } from "$lib/types/types";
import type { RequestHandler } from "@sveltejs/kit";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { produce } from 'sveltekit-sse'

let clients: {
    [chatId: string]: {
        [userId: string]: {
            [sessionId: string]: (eventName: string, data: string) => import("sveltekit-sse").Unsafe<void, Error>
        }
    }
}

// handler to get historical messages for a specified chat id
// delivers via SSE
export const HEAD: RequestHandler = async ({ request, params, locals }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    // we should be given a message id from which we get messages sent
    // before then. that param is a search query
    const messageId = new URLSearchParams(request.url).get("before");
    const sessionId = new URLSearchParams(request.url).get("sessionId");
    if (!messageId) {
        return new Response(JSON.stringify({ error: "Message ID is required" }), { status: 400 });
    }
    if (!clients[params.chatId]?.[locals.user.id]?.[sessionId]) {
        return new Response(JSON.stringify({ error: "Invalid session" }), { status: 400 });
    }

    const messages = await db.query.messages.findMany({
        where: (messages) => and(eq(messages.chatId, params.chatId), sql`${messages.id}::bigint < ${messageId}::bigint`),
        orderBy: (messages) => [desc(messages.id)],
        limit: 50
    }).then(v => v.reverse())

    const cleanedMessages = messages.map(normaliseMessageFromDatabase);

    // send messages to client
    clients[params.chatId][locals.user.id][sessionId]("historical-messages", JSON.stringify({ messages: cleanedMessages }));

    const response = new Response(null, { status: 204 });
    return response;
}

// handler to open an SSE connection for a specified chat id
export const GET: RequestHandler = async ({ params, locals }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    const chatId = params.chatId;
    if (!chatId) {
        return new Response(JSON.stringify({ error: "Chat ID is required" }), { status: 400 });
    }
    const sessionId = crypto.randomUUID();
    // make sure the user can access this chat
    return produce(async ({ emit, lock }) => {
        // register the user
        // this will mark the user as connected to this chat
        if (!clients) clients = {};
        if (!clients[chatId]) clients[chatId] = {};
        if (!clients[chatId][locals.user.id]) clients[chatId][locals.user.id] = {};
        clients[chatId][locals.user.id][sessionId] = emit;
        emit("session", JSON.stringify({ sessionId }));

        // now let's send them the last 50 messages in this chat
        try {
            const recentMessages = await db.query.messages.findMany({
                where: (messages) => eq(messages.chatId, chatId),
                orderBy: (messages) => [desc(messages.id)],
                limit: 50
            });
            // send messages in chronological order
            recentMessages.reverse().map(normaliseMessageFromDatabase).forEach(msg => {
                emit("message", JSON.stringify({ message: msg }));
            });
        } catch (e) {
            console.error(`Error retrieving recent messages for chat ${chatId}: `, e);
            emit("error", JSON.stringify({ error: "Internal server error" }));
            lock.set(false)
        }

        // now announce that this guy is online
        for (const userId in clients?.[chatId] ?? {}) {
            if (userId === locals.user.id) continue; // don't send to self
            for (const sessionId in clients[chatId][userId]) {
                clients[chatId][userId][sessionId]("presence", JSON.stringify({ userId: locals.user.id, status: "online" }));
            }
        }
    }, {
        stop() {
            // unregister the user
            if (clients?.[chatId]?.[locals.user.id]) {
                delete clients[chatId][locals.user.id][sessionId];
            }
        }
    })
}

// handler to send a message to a specified chat id
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    let formData = await request.formData();
    let chatId = formData.get("chatId") as string;
    let content = formData.get("content") as string;
    if (!chatId || !content) {
        return new Response(JSON.stringify({ error: "Please provide all required fields" }), { status: 400 });
    }

    // let's make sure the user is in the chat
    try {
        const chatRecord = await db.query.chats.findFirst({
            where: (chats) => eq(chats.id, chatId),
            with: {
                participants: {
                    columns: {
                        userId: true
                    }
                }
            }
        }).then(res => {
            if (!res) throw new Error("Chat not found");
            return normaliseChatFromDatabase(res);
        });
        if (!chatRecord) {
            return new Response(JSON.stringify({ error: "Chat not found" }), { status: 404 });
        }
        if (!chatRecord.participantIds.includes(locals.user.id)) {
            return new Response(JSON.stringify({ error: "You are not a participant in this chat" }), { status: 403 });
        }
    } catch (e) {
        if (e.message === "Chat not found") {
            return new Response(JSON.stringify({ error: "Chat not found" }), { status: 404 });
        }
        console.error(`${request.url}: Error retrieving chat: `, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }

    let item: Message;
    try {
        // now we can create the message in the database
        item = await db.insert(messages).values({
            chatId,
            author: locals.user.id,
            content
        }).returning().then(res => res[0]);

        const normalisedItem = normaliseMessageFromDatabase(item as any);

        // async notify other clients
        new Promise<void>((res) => {
            for (const userId in clients?.[chatId] ?? {}) {
                if (userId === locals.user.id) continue; // don't send to self
                for (const sessionId in clients[chatId][userId]) {
                    clients[chatId][userId][sessionId]("message", JSON.stringify({ message: normalisedItem }));
                }
            }
            res()
        })
    } catch (e) {
        console.error(`${request.url}: Error creating message: `, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
    // Placeholder implementation
    return new Response(JSON.stringify({ message: normaliseMessageFromDatabase(item as any) }), { status: 201 });
}

export const DELETE: RequestHandler = async ({ request, locals, params }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    let formData = await request.formData();
    let messageId = formData.get("messageId") as string;
    if (!messageId) {
        return new Response(JSON.stringify({ error: "Message ID is required" }), { status: 400 });
    }
    let message: Message;
    try {
        message = await db.query.messages.findFirst({
            where: (messages) => and(eq(messages.id, messageId), eq(messages.chatId, params.chatId))
        });
    } catch (e) {
        console.error(`${request.url}: Error retrieving message: `, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
    if (!message) {
        return new Response(JSON.stringify({ error: "Message not found" }), { status: 404 });
    }
    if (message.author !== locals.user.id) {
        return new Response(JSON.stringify({ error: "You can only delete your own messages" }), { status: 403 });
    }
    if (message.deleted) {
        return new Response(JSON.stringify({ error: "Message not found" }), { status: 404 });
    }
    console.error("IMPORTANT VERY IMPORTANT", message.chatId, params.chatId);
    if (message.chatId !== params.chatId) {
        return new Response(JSON.stringify({ error: "Message is not in this chat" }), { status: 404 });
    }

    try {
        await db.update(messages).set({ deleted: true } as typeof messages.$inferSelect).where(eq(messages.id, messageId));
    } catch (e) {
        console.error(`${request.url}: Error deleting message: `, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }

    // notify other clients
    new Promise<void>((res) => {
        for (const userId in clients?.[params.chatId] ?? {}) {
            if (userId === locals.user.id) continue; // don't send to self
            for (const sessionId in clients[params.chatId][userId]) {
                clients[params.chatId][userId][sessionId]("message-deleted", JSON.stringify({ messageId }));
            }
        }
        res()
    })

    return new Response(null, { status: 204 });
}

// handler to edit a message in a specified chat id
export const PATCH: RequestHandler = async ({ request, locals, params }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    let formData = await request.formData();
    let messageId = formData.get("messageId") as string;
    let newContent = ((formData.get("content") as string) || null)?.trim();
    if (!messageId || !newContent || newContent.length === 0) {
        return new Response(JSON.stringify({ error: "Please provide all required fields" }), { status: 400 });
    }

    let message: Message;
    try {
        message = await db.query.messages.findFirst({
            where: (messages) => and(eq(messages.id, messageId), eq(messages.chatId, params.chatId))
        });
    } catch (e) {
        console.error(`${request.url}: Error retrieving message: `, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
    if (!message) {
        return new Response(JSON.stringify({ error: "Message not found" }), { status: 404 });
    }
    if (message.author !== locals.user.id) {
        return new Response(JSON.stringify({ error: "You can only edit your own messages" }), { status: 403 });
    }
    if (message.deleted) {
        return new Response(JSON.stringify({ error: "Message not found" }), { status: 404 });
    }

    let newMessage: Message;
    try {
        // update the message content and edit history
        const newEditHistory = [...message.editHistory, { content: message.content, editedAt: new Date().toISOString() }];
        newMessage = normaliseMessageFromDatabase((await db.update(messages).set({
            content: newContent,
            edited: true,
            editHistory: newEditHistory
        } as typeof messages.$inferSelect).where(eq(messages.id, message.id)).returning())[0]);
    } catch (e) {
        console.error(`${request.url}: Error updating message: `, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }

    // notify other clients
    new Promise<void>((res) => {
        for (const userId in clients?.[params.chatId] ?? {}) {
            if (userId === locals.user.id) continue; // don't send to self
            for (const sessionId in clients[params.chatId][userId]) {
                clients[params.chatId][userId][sessionId]("message-edited", JSON.stringify({ message: newMessage }));
            }
        }
        res()
    })

    const response = new Response(null, { status: 204 });
    return response;
}