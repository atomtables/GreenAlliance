import { RequiresPermissions } from "$lib/functions/requirePermissions";
import { db } from "$lib/server/db";
import { messages } from "$lib/server/db/schema";
import { normaliseChatFromDatabase, normaliseMessageFromDatabase, type Message } from "$lib/types/messages";
import { Permission } from "$lib/types/types";
import type { RequestHandler } from "@sveltejs/kit";
import { and, desc, eq, lt, ne, sql } from "drizzle-orm";
import { produce } from 'sveltekit-sse'
import { _clients as clients } from "../stream/+server";


// handler to get historical messages for a specified chat id
// if "before" is provided, returns up to 50 messages before that id (chronological)
// if "before" is missing, returns the latest single message in the chat (most recent first)
export const GET: RequestHandler = async ({ request, params, locals }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    const search = new URLSearchParams(request.url);
    const messageId = search.get("before");

    // fetch the most recent message in this chat
    if (!messageId) {
        const latest = await db.query.messages.findMany({
            where: (messages) => and(
                eq(messages.chatId, params.chatId),
                ne(messages.deleted, true)
            ),
            orderBy: (messages) => [desc(messages.id)],
            limit: 50
        }).then((rows) => rows.reverse()).then((rows) => rows.map(normaliseMessageFromDatabase));

        return new Response(JSON.stringify(latest), { status: 200 });
    }

    // fetch older messages before the given id
    const messagesBefore = await db.query.messages.findMany({
        where: (messages) => and(eq(messages.chatId, params.chatId), sql`${messages.id}::bigint < ${messageId}::bigint`),
        orderBy: (messages) => [desc(messages.id)],
        limit: 50
    }).then((rows) => rows.reverse());

    const cleanedMessages = messagesBefore.map(normaliseMessageFromDatabase);

    return new Response(JSON.stringify(cleanedMessages), { status: 200 });
}

// handler to send a message to a specified chat id
export const POST: RequestHandler = async ({ request, locals, params }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    let formData = await request.formData();
    let chatId = params.chatId;
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
                },
                messages: {
                    orderBy: (messages) => [desc(messages.id)],
                    limit: 1,
                },
            }
        }).then((res: any) => {
            if (!res) throw new Error("Chat not found");
            res.lastMessage = res.messages?.[0] ?? null;
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
            for (const userId in clients ?? {}) {
                if (userId === locals.user.id) continue; // don't send to self
                for (const sessionId in clients[userId]) {
                    clients[userId][sessionId]("message", JSON.stringify({ message: normalisedItem }));
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
        message = (await db.query.messages.findFirst({
            where: (messages) => and(eq(messages.id, messageId), eq(messages.chatId, params.chatId))
        }));
        console.log(message);
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
        for (const userId in clients ?? {}) {
            if (userId === locals.user.id) continue; // don't send to self
            for (const sessionId in clients[userId]) {
                clients[userId][sessionId]("message-deleted", JSON.stringify({ messageId, chatId: params.chatId }));
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
        for (const userId in clients ?? {}) {
            if (userId === locals.user.id) continue; // don't send to self
            for (const sessionId in clients[userId]) {
                clients[userId][sessionId]("message-edited", JSON.stringify({ message: newMessage }));
            }
        }
        res()
    })

    const response = new Response(null, { status: 204 });
    return response;
}