import { db } from '$lib/server/db';
import * as schema from "$lib/server/db/schema.js" 

export const load = async ({ locals }: any) => {
    return {
        user: locals?.user,
        session: locals?.session,
        subteams: await db.select().from(schema.subteams),
    };
}

