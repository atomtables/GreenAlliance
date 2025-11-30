import { json, error, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import { generateSessionToken, createSession, setSessionTokenCookie } from '$lib/server/auth';

function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[a-z0-9_-]+$/.test(username)
	);
}

function validatePassword(password: unknown): password is string {
	return (
		typeof password === 'string' &&
		password.length >= 6 &&
		password.length <= 255
	);
}

export const POST: RequestHandler = async (event) => {
    const { request } = event;
	const { username, password } = await request.json();

	if (!validateUsername(username)) {
		return error(400, 'Invalid username');
	}
	if (!validatePassword(password)) {
        return error(400, 'Invalid password');
	}

	try {
		const [existingUser] = await db
			.select()
			.from(users)
			.where(eq(users.username, username));

		if (!existingUser) {
			// NOTE: returning 401 for security reasons
			return error(401, 'Incorrect username or password');
		}

		const validPassword = await verify(existingUser.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		if (!validPassword) {
			// NOTE: returning 401 for security reasons
			return error(401, 'Incorrect username or password');
		}

		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, existingUser.id);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return json({ success: true, message: "Sign in successful!" });
	} catch (e) {
		console.error(e);
		return error(500, 'Internal server error');
	}
};
