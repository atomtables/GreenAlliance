import * as crypto from "node:crypto";
import { pgTable, varchar, text, index, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const files = pgTable("files", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    author: varchar("author", { length: 36 }).notNull().references(() => users.id),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
    index("files_index_author").on(table.author)
]);
