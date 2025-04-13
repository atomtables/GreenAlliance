import {validateLogin} from "$lib/server/auth.js";
import * as auth from "$lib/server/auth.js";
import {fail, redirect} from "@sveltejs/kit";

export const actions = {
    default: async e => {
        try {
            const existingUser = await validateLogin(await e.request.formData());

            const sessionToken = auth.generateSessionToken();
            const session = await auth.createSession(sessionToken, existingUser.id);
            auth.setSessionTokenCookie(e, sessionToken, session.expiresAt);
        } catch (e) {
            return fail(400, {"error": `${e.error?.message}`});
        }

        return redirect(302, '/');
    }
}