export const load = ({ locals, url }) => {
    return {
        user: locals?.user,
        session: locals?.session
    };
}

