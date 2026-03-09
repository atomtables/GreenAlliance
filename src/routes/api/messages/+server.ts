import { Permission } from '$lib/types/types';
import * as schema from "$lib/server/db/schema.js"
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, inArray, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export const GET: RequestHandler = async ({ locals }: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.message)) return error(403, "Access denied.");

    try {
        const userParticipations = await db
            .select({ chatId: schema.chatParticipants.chatId })
            .from(schema.chatParticipants)
            .where(eq(schema.chatParticipants.userId, locals.user.id));

        if (userParticipations.length === 0) {
            return json({ success: true, data: [] });
        }

        const chatIds = userParticipations.map(p => p.chatId);

        const chats = await db.select().from(schema.chats)
            .where(inArray(schema.chats.id, chatIds));

        const chatsWithDetails = await Promise.all(chats.map(async (chat) => {
            const participants = await db
                .select({
                    id: schema.users.id,
                    firstName: schema.users.firstName,
                    lastName: schema.users.lastName,
                    avatar: schema.users.avatar,
                })
                .from(schema.chatParticipants)
                .innerJoin(schema.users, eq(schema.chatParticipants.userId, schema.users.id))
                .where(eq(schema.chatParticipants.chatId, chat.id));

            const lastMessages = await db
                .select({
                    id: schema.chatMessages.id,
                    content: schema.chatMessages.content,
                    sentAt: schema.chatMessages.sentAt,
                    senderFirstName: schema.users.firstName,
                    senderLastName: schema.users.lastName,
                })
                .from(schema.chatMessages)
                .innerJoin(schema.users, eq(schema.chatMessages.senderId, schema.users.id))
                .where(eq(schema.chatMessages.chatId, chat.id))
                .orderBy(desc(schema.chatMessages.sentAt))
                .limit(1);

            return {
                ...chat,
                participants,
                lastMessage: lastMessages[0] || null,
            };
        }));

        return json({ success: true, data: chatsWithDetails });
    } catch (e: any) {
        if (e.name === "HttpError") throw e;
        console.log(e);
        return error(500, e.message || "Internal server error");
    }
}

export const PUT: RequestHandler = async ({ request, locals }: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.message)) return error(403, "Access denied.");

    let { participantIds, name } = await request.json();
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return error(400, "Please provide at least one participant.");
    }

    const allParticipantIds = [...new Set([locals.user.id, ...participantIds])];
    const isGroup = allParticipantIds.length > 2;

    try {
        const id = crypto.randomUUID();
        await db.insert(schema.chats).values({
            id,
            name: name || null,
            createdBy: locals.user.id,
            isGroup,
        } as any);

        await db.insert(schema.chatParticipants).values(
            allParticipantIds.map(userId => ({ chatId: id, userId }))
        );

        return json({ success: true, data: { id } }, { status: 201 });
    } catch (e: any) {
        if (e.name === "HttpError") throw e;
        console.log(e);
        return error(500, e.message || "Internal server error");
    }
}

export const DELETE: RequestHandler = async ({ request, locals }: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.message)) return error(403, "Access denied.");

    const { chatId } = await request.json() || {};
    if (!chatId) return error(400, "Missing required field: chatId");

    try {
        const [chat] = await db.select().from(schema.chats).where(eq(schema.chats.id, chatId));
        if (!chat) return error(404, "Chat not found.");

        if (chat.createdBy !== locals.user.id && !locals.user.permissions.includes(Permission.message_moderate)) {
            return error(403, "Access denied.");
        }

        await db.delete(schema.chatMessages).where(eq(schema.chatMessages.chatId, chatId));
        await db.delete(schema.chatParticipants).where(eq(schema.chatParticipants.chatId, chatId));
        await db.delete(schema.chats).where(eq(schema.chats.id, chatId));
    } catch (e: any) {
        if (e.name === "HttpError") throw e;
        console.log(e);
        return error(500, e.message || "Internal server error");
    }

    return json({ success: true, data: {} }, { status: 200 });
}
