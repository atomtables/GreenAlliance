import { pgTable, text, boolean, serial, timestamp } from "drizzle-orm/pg-core";
import { users } from './users';

export const chats = pgTable('chats', {
    id: text('id').primaryKey().$default(() => crypto.randomUUID()),
    name: text('name'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    createdBy: text('created_by').notNull().references(() => users.id),
    isGroup: boolean('is_group').notNull().default(false),
});

export const chatParticipants = pgTable('chat_participants', {
    id: serial('id').primaryKey(),
    chatId: text('chat_id').notNull().references(() => chats.id),
    userId: text('user_id').notNull().references(() => users.id),
    joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
    id: text('id').primaryKey().$default(() => crypto.randomUUID()),
    chatId: text('chat_id').notNull().references(() => chats.id),
    senderId: text('sender_id').notNull().references(() => users.id),
    content: text('content').notNull(),
    sentAt: timestamp('sent_at', { mode: 'date' }).defaultNow().notNull(),
});
