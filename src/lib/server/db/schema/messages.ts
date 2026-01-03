// Messages schema needs to have:
// storage of each individual message
// collections of chats created between users
// etc.

import { Snowflake } from "$lib/functions/Snowflake";
import {pgTable, serial, varchar, integer, text, timestamp, uniqueIndex, boolean, index} from "drizzle-orm/pg-core";
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
    chatId: varchar("chat_id", { length: 21 }).notNull(),
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