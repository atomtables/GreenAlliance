import { blob, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { type Address, type Permission, type PhoneNumber, Role } from '$lib/types/types';
import * as crypto from 'node:crypto';
import { json } from './common';

export const subteams = sqliteTable('subteams', {
    name: text('name').primaryKey()
});

export const users = sqliteTable('users', {
    id: text('id').primaryKey().$default(() => crypto.randomUUID()),
    age: integer('age').notNull(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),

    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: blob('phone').$type<PhoneNumber>(),
    address: blob('address').$type<Address>(),

    avatar: blob('avatar'),
    role: integer('role').$type<Role>().notNull(),
    permissions: json('permissions').$type<Permission[]>().notNull(),
    subteam: text('subteam').notNull().references(() => subteams.name).default('All'),
}, (table) => [
    uniqueIndex('emailUniqueIndex').on(table.email),
]);

export const joincodes = sqliteTable('joincodes', {
    joinCode: text('joinCode').primaryKey(),
    role: integer('role').notNull().$type<Role>(),
    subteam: text('subteam').notNull().references(() => subteams.name).default('All'),
    firstName: text('firstName'),
    lastName: text('lastName'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
});
