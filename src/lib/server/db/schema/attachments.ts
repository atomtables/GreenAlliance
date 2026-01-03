// this keeps track of attachment files uploaded to the server
// maximum of 25mbs for now

import * as crypto from "node:crypto";
import { pgTable, varchar, integer, text, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const attachments = pgTable("attachments", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    author: varchar("author", { length: 36 }).notNull().references(() => users.id),
    filename: text("filename").notNull(),
    filesize: integer("filesize").notNull() // in bytes
}, (table) => [
    index("attachment_index").on(table.author)
]);