import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import * as crypto from 'node:crypto';
import { users } from './users';

export const meetings = sqliteTable('meetings', {
    id: text('id').primaryKey().$default(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$default(() => new Date()),
    createdBy: text('user').notNull().references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    dateOf: integer('date_of', { mode: 'timestamp' }).notNull(),
    subteams: text('subteams', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
});

export const meetingAttendees = sqliteTable('meeting_attendees', {
    id: integer('id').primaryKey(),
    meetingId: text('meeting_id').notNull().references(() => meetings.id),
    userId: text('user_id').notNull().references(() => users.id),
    status: text('status').$type<'yes' | 'no' | 'maybe'>(),
});
