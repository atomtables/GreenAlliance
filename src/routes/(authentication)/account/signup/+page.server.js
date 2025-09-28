import * as auth from "$lib/server/auth.js";
import { db } from "$lib/server/db/index.js";
import * as schema from "$lib/server/db/schema.js"
import {error, fail, isHttpError, isRedirect, redirect} from "@sveltejs/kit";
import { eq } from "drizzle-orm";

const verify = async (e) => {
    const formData = await e.request.formData();
    const joinCode = formData?.get("jcode")
    console.log(formData?.get("jcode"))
    if (!joinCode) return fail(400, {error: "Please enter a join code. This code will be provided to you by your team administrators."})
    const firstName = formData?.get("fname")
    const lastName = formData?.get("lname");
    if (!firstName || !lastName) return fail(400, {error: "Please fill out all fields."});

    const [matchingJoinCodes] = await db.select()
        .from(schema.joincodes)
        .where(eq(schema.joincodes.joinCode, joinCode)).limit(1);
    if (!matchingJoinCodes) return fail(400, {error: "Please enter a valid join code as given to you by your team administrators."});
    if (!(matchingJoinCodes?.firstName === firstName && matchingJoinCodes?.lastName === lastName)) 
        return fail(400, {error: "Please enter your join code as given to *you* by your team administrators."})
}
// this page is for verifying that the user has a valid join code
// that way, any ne'er-do-wells can get turned away at the gate
export const actions = {
    verify,
    create: async (e) => {
        try {
            const formData = await e.request.formData()
            let id;
            try {
                id = await auth.validateRegister(formData);
            } catch (e) {
                console.log(e)
                throw e;
            }

            const sessionToken = auth.generateSessionToken();
            const session = await auth.createSession(sessionToken, id);
            auth.setSessionTokenCookie(e, sessionToken, session.expiresAt);
        } catch (e) {
            if (isHttpError(e) || isRedirect(e)) throw e
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
                    return fail(400, { error: 'Invalid password (min 6, max 255 characters), make sure your password and confirmation match.' });
                case "EXISTS":
                    return fail(400, { error: "A user with some of the information listed already exists." });
                default:
                    console.error(e);
                    return fail(500, { error: "An internal server error occurred." });
            }
        }

        // return redirect(302, '/');
    }
}