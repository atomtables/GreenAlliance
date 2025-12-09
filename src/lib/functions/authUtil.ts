import * as auth from "$lib/server/auth";

export const login = async (data): Promise<void> => {
    const existingUser = await auth.validateLogin(await data.request.formData());

    const sessionToken = auth.generateSessionToken();
    const session = await auth.createSession(sessionToken, existingUser.id);
    auth.setSessionTokenCookie(data, sessionToken, session.expiresAt);
}