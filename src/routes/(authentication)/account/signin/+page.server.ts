import { validateLogin } from "$lib/server/auth";

import {fail, redirect, type Actions} from "@sveltejs/kit";
import { login } from "$lib/functions/authUtil";

export const actions = {
    default: async e => {
        try {
            await login(e);
        } catch (e) {
            return fail(400, {"error": `${e.error?.message}`});
        }
        
        return redirect(302, '/');
    }
} satisfies Actions;