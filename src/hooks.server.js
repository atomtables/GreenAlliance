import * as auth from '$lib/server/auth.js';
import "$lib/prototypes/prototypes";
import { Permission, Role } from '$lib/types/types';

const handleAuth = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	// give administrator superuser permissions
	if (user && user.role === Role.administrator) {
		user.permissions = Array.from(Array(33).keys())
	}
	event.locals.session = session;
	return resolve(event);
};

export const handle = handleAuth;
