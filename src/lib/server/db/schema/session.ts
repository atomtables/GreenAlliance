import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const session = pgTable('session', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
});
