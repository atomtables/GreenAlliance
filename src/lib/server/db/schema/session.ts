import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
});
