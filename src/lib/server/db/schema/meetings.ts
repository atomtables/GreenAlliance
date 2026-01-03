import { sql } from 'drizzle-orm';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import * as crypto from 'node:crypto';
import { json } from './common';
import { users } from './users';

export const meetings = pgTable('meetings', {
    id: text('id').primaryKey().$default(() => crypto.randomUUID()),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    createdBy: text('user').notNull().references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    dateOf: timestamp('date_of', { mode: 'date' }).notNull(),
    subteams: json<string[]>('subteams').notNull().default(sql`'[]'::jsonb`),
});

export const meetingAttendees = pgTable('meeting_attendees', {
    id: serial('id').primaryKey(),
    meetingId: text('meeting_id').notNull().references(() => meetings.id),
    userId: text('user_id').notNull().references(() => users.id),
    status: text('status').$type<'yes' | 'no' | 'maybe'>(),
});
