import {sqliteTable, text, integer, blob, uniqueIndex, type AnySQLiteColumn} from 'drizzle-orm/sqlite-core';
import {SQL, sql} from "drizzle-orm";

type PhoneNumber = {
	countryCode: number // +1
	areaCode: number // 908
	group1: number // 338
	group2: number // 2903
}

type Address = {
	house: number // 123
	street: string // Main St
	line2: string // Apt 4B
	city: string // Springfield
	state: string // IL
	zip: number // 62704
}

type Role = {
	member: boolean 		// normal person
	lead: boolean 			// team lead
	mentor: boolean 		// trusted adult
	coach: boolean 			// team manager (purchaser or etc)
	administrator: boolean	// IT personnel 🫡
}

enum Permission {
	// TODO: all you my abominable pug
}

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),

	firstName: text('first_name'),
	lastName: text('last_name'),
	email: text('email'),
	phone: blob('phone').$type<PhoneNumber>(),
	address: blob('address').$type<Address>(),

	avatar: blob('avatar'),
	role: blob('role').$type<Role>(),
	permissions: blob('permissions').$type<[Permission]>(),
}, (table) => [
	uniqueIndex('emailUniqueIndex').on(lower(table.email)),
]);

export function lower(email: AnySQLiteColumn): SQL {
	return sql`lower(${email})`;
}

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});
