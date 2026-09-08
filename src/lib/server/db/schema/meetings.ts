import {pgTable, serial, text, timestamp, boolean, integer, varchar} from 'drizzle-orm/pg-core';
import * as crypto from 'node:crypto';
import { users } from './users';

export const meetings = pgTable('meetings', {
	id: varchar('id', { length: 36 }).primaryKey().$default(() => crypto.randomUUID()),
	createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
	createdBy: varchar('user', { length: 36 }).notNull().references(() => users.id),
	title: text('title').notNull(),
	description: text('description'),
	dateOf: timestamp('date_of', { mode: 'date' }).notNull(),
	durationMinutes: integer('duration_minutes').notNull().default(60),
	subteams: text('subteams').array().notNull().default(([])),
	members: text('members').array().notNull().default(([])),
});

export const meetingAttendees = pgTable('meeting_attendees', {
	id: serial('id').primaryKey(),
	meetingId: varchar('meeting_id', { length: 36 }).notNull().references(() => meetings.id),
	userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
	status: text('status').$type<'yes' | 'no' | 'maybe'>(),
	present: boolean('present').default(false).notNull(),
});
