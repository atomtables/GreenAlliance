import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const profilePictureTokens = pgTable("profile_picture_tokens", {
    token: text("token").primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    filePath: text("file_path").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
    index("profile_picture_tokens_user_idx").on(table.userId),
]);
