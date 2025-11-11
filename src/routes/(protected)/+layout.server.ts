import {redirect} from "@sveltejs/kit";

export const load = ({ locals }: any) => {
    if (!locals.user) redirect(302, "/account/signin")
}