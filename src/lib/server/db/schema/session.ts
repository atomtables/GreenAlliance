import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const session = sqliteTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});
