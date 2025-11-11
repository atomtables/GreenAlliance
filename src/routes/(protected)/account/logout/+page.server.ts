import {fail, redirect} from "@sveltejs/kit";
import * as auth from "$lib/server/auth";

export const actions = {
    default: async (event) => {
        if (!event.locals.session) {
            console.log("failed")
            return fail(401);
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        return redirect(302, '/');
    }
}