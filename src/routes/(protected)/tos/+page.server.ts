import {TOS_CONTENT, TOS_LAST_UPDATED} from "$lib/server/admin/tos";

export const load = ({ locals }: any) => {
    // if (!locals.user) redirect(302, "/account/signin");

    const tosAgreedAt = locals.user.tosAgreedAt;
    if (tosAgreedAt && new Date(tosAgreedAt) >= TOS_LAST_UPDATED) {
        // redirect(302, "/home");
    }

    return {
        tosContent: TOS_CONTENT,
        tosLastUpdated: TOS_LAST_UPDATED.toISOString(),
    };
};
