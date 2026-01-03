// this stores announcements, since these are made
// by trusted users these can be stored with less security lmao

import { pgTable, serial, text, timestamp, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { json } from './common';
import { Snowflake } from '$lib/functions/snowflake';

export const announcements = pgTable('announcements', {
    id: varchar('id', { length: 21 }).primaryKey().$default(() => Snowflake()),
    author: varchar('author', { length: 36 }).notNull().references(() => users.id),
    content: text('content').notNull(),
    directedToSubteams: json<string[]>('directed_to_subteams').notNull().default([]),
    directedToRoles: json<string[]>('directed_to_roles').notNull().default([]),
    attachments: json<string[]>('attachments').notNull().default([]),
    edited: boolean('edited').notNull().default(false),
    deleted: boolean('deleted').notNull().default(false),
}, (table) => [
    // index by author for easy retrieval of user announcements
    index('announcement_index_author').on(table.author),
]);