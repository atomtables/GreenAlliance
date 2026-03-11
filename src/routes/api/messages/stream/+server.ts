import { RequiresPermissions } from "$lib/functions/requirePermissions";
import { db } from "$lib/server/db";
import { chatParticipants } from "$lib/server/db/schema";
import { Permission, type User } from "$lib/types/types";
import type { RequestHandler } from "@sveltejs/kit";
import { produce } from "sveltekit-sse";
import { eq, desc, and, sql } from "drizzle-orm";
import { normaliseMessageFromDatabase } from "$lib/types/messages";

export let _clients: {
    [userId: string]: {
        [sessionId: string]: (eventName: string, data: string) => import("sveltekit-sse").Unsafe<void, Error>
    }
} = {}

// handler to open an SSE connection for a specified chat id
export const GET: RequestHandler = async ({ params, locals }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    const sessionId = crypto.randomUUID();
    // make sure the user can access this chat
    return produce(async ({ emit, lock }) => {
        let user = locals.user as User;
        // register the user
        // this will mark the user as connected to this chat
        if (!_clients) _clients = {};
        if (!_clients[user.id]) _clients[user.id] = {};
        _clients[user.id][sessionId] = emit;
        emit("session", sessionId);

        // send current online statuses to the new user
        for (const userId in _clients) {
            if (userId === user.id) continue;
            emit("presence", JSON.stringify({ userId, status: "online" }));
        }

        // now announce that this user is online to everyone else
        for (const userId in _clients) {
            if (userId === user.id) continue; // don't send to self
            for (const sessionId in _clients[userId]) {
                _clients[userId][sessionId]("presence", JSON.stringify({ userId: user.id, status: "online" }));
            }
        }
    }, {
        stop() {
            let user = locals.user as User;
            // unregister the user
            if (_clients?.[user.id]) {
                delete _clients[user.id][sessionId];
            }
            for (const userId in _clients) {
                if (userId === user.id) continue; // don't send to self
                for (const sessionId in _clients[userId]) {
                    _clients[userId][sessionId]("presence", JSON.stringify({ userId: user.id, status: "offline" }));
                }
            }
        }
    })
}

// Handler for typing indicator
export const POST: RequestHandler = async ({ request, locals, url }) => {
    if (!RequiresPermissions(locals, [Permission.message]) || !locals.user) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    const chatId = url.searchParams.get("chatId");
    const action = url.searchParams.get("action");

    if (action === "typing" && chatId) {
        // Verify user is a participant of this chat before broadcasting
        const participants = await db.select({ userId: chatParticipants.userId })
            .from(chatParticipants)
            .where(eq(chatParticipants.chatId, chatId));

        const participantIds = participants.map(p => p.userId);
        if (!participantIds.includes(locals.user.id)) {
            return new Response(JSON.stringify({ error: "Not a participant of this chat" }), { status: 403 });
        }

        for (const { userId } of participants) {
            if (userId === locals.user.id) continue;
            if (_clients?.[userId]) {
                for (const sessionId in _clients[userId]) {
                    _clients[userId][sessionId]("typing", JSON.stringify({ userId: locals.user.id, chatId }));
                }
            }
        }
        return new Response(null, { status: 204 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
}