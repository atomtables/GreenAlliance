import {fail, redirect} from "@sveltejs/kit";
import { login } from "./util";

export const actions = {
    default: async e => {
        try {
            console.log(e);
            await login(e);
        } catch (e) {
            return fail(400, {"error": `${e.error?.message}`});
        }
        
        return redirect(302, '/');
    }
}