import { Permission } from '$lib/types/types';
import * as schema from "$lib/server/db/schema.js"
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { and, eq, asc } from 'drizzle-orm';
import crypto from 'node:crypto';

export const GET: RequestHandler = async ({ params, locals }: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.message)) return error(403, "Access denied.");

    const { chatId } = params;

    try {
        const [participation] = await db
            .select()
            .from(schema.chatParticipants)
            .where(and(
                eq(schema.chatParticipants.chatId, chatId),
                eq(schema.chatParticipants.userId, locals.user.id)
            ));

        if (!participation && !locals.user.permissions.includes(Permission.message_moderate)) {
            return error(403, "You are not a participant of this chat.");
        }

        const messages = await db
            .select({
                id: schema.chatMessages.id,
                chatId: schema.chatMessages.chatId,
                content: schema.chatMessages.content,
                sentAt: schema.chatMessages.sentAt,
                senderId: schema.chatMessages.senderId,
                senderFirstName: schema.users.firstName,
                senderLastName: schema.users.lastName,
                senderAvatar: schema.users.avatar,
            })
            .from(schema.chatMessages)
            .innerJoin(schema.users, eq(schema.chatMessages.senderId, schema.users.id))
            .where(eq(schema.chatMessages.chatId, chatId))
            .orderBy(asc(schema.chatMessages.sentAt));

        return json({ success: true, data: messages });
    } catch (e: any) {
        if (e.name === "HttpError") throw e;
        console.log(e);
        return error(500, e.message || "Internal server error");
    }
}

export const POST: RequestHandler = async ({ params, request, locals }: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.message)) return error(403, "Access denied.");

    const { chatId } = params;
    const { content } = await request.json() || {};

    if (!content || !content.trim()) return error(400, "Message content cannot be empty.");

    try {
        const [participation] = await db
            .select()
            .from(schema.chatParticipants)
            .where(and(
                eq(schema.chatParticipants.chatId, chatId),
                eq(schema.chatParticipants.userId, locals.user.id)
            ));

        if (!participation) return error(403, "You are not a participant of this chat.");

        const id = crypto.randomUUID();
        await db.insert(schema.chatMessages).values({
            id,
            chatId,
            senderId: locals.user.id,
            content: content.trim(),
        } as any);

        return json({ success: true, data: { id } }, { status: 201 });
    } catch (e: any) {
        if (e.name === "HttpError") throw e;
        console.log(e);
        return error(500, e.message || "Internal server error");
    }
}
