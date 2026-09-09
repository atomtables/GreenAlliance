// this keeps track of attachment files uploaded to the server
// maximum of 25mbs for now

import * as crypto from "node:crypto";
import { pgTable, varchar, integer, text, index, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { messages } from "./messages";

export const attachments = pgTable("attachments", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    author: varchar("author", { length: 36 }).notNull().references(() => users.id),
    filename: text("filename").notNull(),
    filesize: integer("filesize").notNull(), // in bytes
    url: text("url").notNull().default(""),
    messageId: varchar("message_id", { length: 21 }).references(() => messages.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
    index("attachment_index").on(table.author)
]);
