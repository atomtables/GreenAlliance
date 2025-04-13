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

enum Role {
	member, 		// normal person
	lead, 			// team lead
	mentor, 		// trusted adult
	coach, 			// team manager (purchaser or etc)
	administrator,	// IT personnel 🫡
}

// legitimately not that deep worst case we can mod this later without affecting any migrations
enum Permission {
	exist, // not be banned from looking at anything
	interact, // not be banned from touching anything
	announcement_react,
	announcement_reply,
	announcement_post,
	announcement_delete,
	announcement_moderate, // edit other people's announcements
	announcement_notify, // have people get emailed or texted through announcements ($$)
	message, // anyone on the team
	message_leads, // team lead
	message_mentors, // trusted adult
	message_moderate, // see all chats
	attendance, // mark attendance for one day
	attendance_postpast, // mark attendance for days before
	attendance_modify, // mark attendance for others
	attendance_moderate, // remove attendance for others
	inventory, // see inventory
	inventory_changestatus, // change the location/status of certain items
	inventory_moderate, // change inventory
	calendar, // see calendar
	calendar_moderate, // add/remove dates to calendar
	calendar_notify, // add notifications to dates on a calendar ($$),
	finance, // see finances
	finance_request, // add a request to purchase item
	finance_moderate, // add or remove purchased items from receipt
	email, // see emails sent from email portal
	email_send, // send emails from email portal
	email_moderate, // modify existing email threads
	resources, // see team resources given
	resources_moderate, // modify team resources given
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
