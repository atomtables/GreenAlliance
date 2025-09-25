import * as auth from "$lib/server/auth.js";
import {fail, redirect} from "@sveltejs/kit";

export const actions = {
    default: async (e) => {

        try {
            const id = await auth.validateRegister(await e.request.formData());

            const sessionToken = auth.generateSessionToken();
            const session = await auth.createSession(sessionToken, id);
            auth.setSessionTokenCookie(e, sessionToken, session.expiresAt);

        } catch (e) {
            switch (e.message) {
                case "NAME_WRONG":
                    return fail(400, { error: "Names must only contain letters." });
                case "AGE_WRONG":
                    return fail(400, { error: "The age value you submitted was incorrect." });
                case "PHONE_WRONG":
                    return fail(400, { error: "Phone numbers must be written in the format 0123456789." });
                case "USERNAME_WRONG":
                    return fail(400, { error: 'Invalid username (min 3, max 31 characters, alphanumeric only)' });
                case "PASSWORD_WRONG":
                    return fail(400, { error: 'Invalid password (min 6, max 255 characters)' });
                case "EMAIL_EXISTS":
                    return fail(400, { error: "A user with this email already exists." });
                case "PHONE_EXISTS":
                    return fail(400, { error: "A user with this phone number already exists." });
                case "USERNAME_EXISTS":
                    return fail(400, { error: "A user with this username already exists." });
                default:
                    return fail(500, { error: "An internal server error occurred." });
            }
        }

        return redirect(302, '/');
    }
}