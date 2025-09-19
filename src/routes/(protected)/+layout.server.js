import {redirect} from "@sveltejs/kit";

export const load = ({ locals, url }) => {
    if (!locals.user) redirect(302, "/account/signin")
}