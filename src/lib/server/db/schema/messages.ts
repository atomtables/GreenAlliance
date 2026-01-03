// Messages schema needs to have:
// storage of each individual message
// collections of chats created between users
// etc.

import { Snowflake } from "$lib/functions/Snowflake";
import {pgTable, serial, varchar, integer, text, timestamp, uniqueIndex, boolean, index, primaryKey} from "drizzle-orm/pg-core";
import { users } from "./users";
import { json } from "./common";

export const messages = pgTable("messages", {
    // Snowflake ID (so includes timestamp)
    id: varchar("id", { length: 21 }).primaryKey().$default(() => Snowflake()),
    // Sender ID (links to user + indexed)
    author: varchar("author", { length: 21 }).notNull().references(() => users.id),
    // content
    content: text("content").notNull(),
    // chat id that this message was sent in
    chatId: varchar("chat_id", { length: 21 }).notNull().references(() => chats.id),
    // was message edited?
    edited: boolean("edited").notNull().default(false),
    // previous message history (in case message was edited) (only for admins)
    editHistory: json<{content: string, editedAt: string}[]>("edit_history").notNull().default([]),
    // was message deleted?
    deleted: boolean("deleted").notNull().default(false),
    // attachments (array of attachment IDs)
    attachments: json<string[]>("attachments").notNull().default([]),
}, (table) => [
    // index by author for easy retrieval of user messages
    index("message_index_author").on(table.author),
    // index by chat for easy retrieval of chat messages
    index("message_index_chat").on(table.chatId),
]);

export const chats = pgTable("chats", {
    id: varchar("id", { length: 21 }).primaryKey().$default(() => Snowflake()),
    // is this a group chat?
    isGroup: boolean("is_group").notNull().default(false),
    // chat name (for group chats)
    name: text("name"),
    archived: boolean("archived").notNull().default(false),
});

// Junction table for chat participants (allows efficient lookup of user's chats)
export const chatParticipants = pgTable("chat_participants", {
    chatId: varchar("chat_id", { length: 21 }).notNull().references(() => chats.id),
    userId: varchar("user_id", { length: 21 }).notNull().references(() => users.id),
}, (table) => [
    primaryKey({ columns: [table.chatId, table.userId] }),
    // Index for finding all chats for a user
    index("chat_participants_user_idx").on(table.userId),
]);