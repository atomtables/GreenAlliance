import {blob, customType, integer, sqliteTable, text, uniqueIndex} from 'drizzle-orm/sqlite-core';
import {type Address, Permission, type PhoneNumber, Role} from "$lib/types/types";
import * as crypto from "node:crypto";

export const json = <T>(name: string) =>
    customType<{
        data: T;
        driverData: string;
    }>({
        dataType() { return "json" },
        toDriver: (value: T) => JSON.stringify(value),
        fromDriver: (value: string) => JSON.parse(value),
    })(name);



export const users = sqliteTable('users', {
    id: text('id').primaryKey().$default(() => crypto.randomUUID()),
    age: integer('age'),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),                    // @ts-ignore
    createdAt: integer('created_at', {mode: 'timestamp'}).$default(() => new Date()),

    firstName: text('first_name'),
    lastName: text('last_name'),
    email: text('email'),
    phone: blob('phone').$type<PhoneNumber>(),
    address: blob('address').$type<Address>(),

    avatar: blob('avatar'),
    role: integer('role').$type<Role>(),
    permissions: json('permissions').$type<[Permission]>(),
    subteam: text('subteam').notNull().references(() => subteams.name).default("All"),
}, (table) => [
    uniqueIndex('emailUniqueIndex').on(table.email),
]);

// let's be honest there shouldn't be duplicate subteams anyway.
export const subteams = sqliteTable('subteams', {
    name: text('name').primaryKey()
})

// first name and last name must be accurate in order to properly allot a join code
export const joincodes = sqliteTable('joincodes', {
    joinCode: text("joinCode").primaryKey(),
    role: integer("role").$type<Role>(),
    firstName: text("firstName"),
    lastName: text("lastName"),
    createdAt: integer('created_at', {mode: 'timestamp'}).$default(() => new Date()).notNull(),
    usedAt: integer('used_at', {mode: 'timestamp'}),
})
export const session = sqliteTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    expiresAt: integer('expires_at', {mode: 'timestamp'}).notNull()
});
