import {eq} from 'drizzle-orm';
import {sha256} from '@oslojs/crypto/sha2';
import {encodeBase64url, encodeHexLowerCase} from '@oslojs/encoding';
import {db} from '$lib/server/db';
import * as table from '$lib/server/db/schema.js';
import {verify} from "@node-rs/argon2";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return encodeBase64url(bytes);
}

/**
 * @param {string} token
 * @param {string} userId
 */
export async function createSession(token, userId) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await db.insert(table.session).values(session);
	return session;
}

/** @param {string} token */
export async function 	validateSessionToken(token) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			// Adjust user table here to tweak returned data
			user: table.users,
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.users, eq(table.session.userId, table.users.id))
		.where(eq(table.session.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return { session, user };
}

/** @param {string} sessionId */
export async function invalidateSession(sessionId) {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

/**
 * @param {import("@sveltejs/kit").RequestEvent} event
 * @param {string} token
 * @param {Date} expiresAt
 */
export function setSessionTokenCookie(event, token, expiresAt) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/'
	});
}

/** @param {import("@sveltejs/kit").RequestEvent} event */
export function deleteSessionTokenCookie(event) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}

function validateUsername(username) {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[a-z0-9_-]+$/.test(username)
	);
}

function validatePassword(password) {
	return (
		typeof password === 'string' &&
		password.length >= 6 &&
		password.length <= 255
	);
}

class ValidationError extends Error {
	constructor(message) {
		super("A validation error occurred");
		this.name = 'ValidationError';
		this.error = message;
	}
}

export let validateLogin = async (formData) => {
	const username = formData.get('username');
	const password = formData.get('password');

	if (!validateUsername(username)) {
		throw new ValidationError({ error: "username", message: 'Invalid username (min 3, max 31 characters, alphanumeric only)' })
	}
	if (!validatePassword(password)) {
		throw new ValidationError({ error: "password", message: 'Invalid password (min 6, max 255 characters)' })
	}

	const results = db
		.select()
		.from(table.users)
		.where(eq(table.users.username, username))

	const existingUser = await results.then(takeUniqueOrThrow);
	if (!existingUser) {
		throw new ValidationError({ error: "authentication", message: 'Incorrect username or password' })
	}

	const validPassword = await verify(existingUser.passwordHash, password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1,
	});
	if (!validPassword) {
		throw new ValidationError({ error: "authentication", message: 'Incorrect username or password' })
	}

	return existingUser;
}

const normalizeData = data => {
    return data.toString().toLowerCase().trim();
}

const validateUnique = async (type, val) => {
	const existingUser = await db.query.users.findFirst({
		where: eq(table.users[type], val)
	});

	return existingUser;
}

const validateName = name => {
	return typeof name === "string" &&
		/^[a-z]+$/.test(name);
}

const validatePhone = phone => {
	return typeof phone === "string" &&
		/^[0-9]{10}$/.test(phone);
}

const validateAge = age => {
	return typeof age === "string" &&
		age > 0 && age < 100 &&
		/^[0-9]+$/.test(age);
}

export const validateRegister = async (formData) => {
	const username = normalizeData(formData.get("username"));
	const password = formData.get("password")?.toString();
	const phone = normalizeData(formData.get("phone"));
	const address = normalizeData(formData.get("address"));
	const age = normalizeData(formData.get("age"));
	const firstName = normalizeData(formData.get("fname"));
	const lastName = normalizeData(formData.get("lname"));
	const email = normalizeData(formData.get("email"));

	if (!validateName(firstName) || !validateName(lastName)) {
		throw new Error("NAME_WRONG");
	}

	if (!validateAge(age)) {
		throw new Error("AGE_WRONG");
	}

	if (!validatePhone(phone)) {
		throw new Error("PHONE_WRONG");
	}

	if (!validateUsername(username)) {
		throw new Error("USERNAME_WRONG");
	}
	if (!validatePassword(password)) {
		throw new Error("PASSWORD_WRONG");
	}

	if (await validateUnique("email", email)) {
		throw new Error("EMAIL_EXISTS");
	}

	if (await validateUnique("phone", phone)) {
		throw new Error("PHONE_EXISTS");
	}

	if (await validateUnique("username", username)) {
		throw new Error("USERNAME_EXISTS");
	}

	const passwordHash = await hash(password, {
		// recommended minimum parameters
		memoryCostr: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1,
	});

	const id = crypto.randomUUID();

	// this is the admin
	await db.insert(schema.users).values({
		id: id,
		username,
		passwordHash,
		phone,
		address,
		age: 15,
		firstName,
		lastName,
		email,
	});

	return id;
}

const takeUniqueOrThrow = values => {
	if (values.length !== 1) throw new Error("Found non unique or inexistent value")
	return values[0]
}
