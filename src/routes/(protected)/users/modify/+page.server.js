import {Permission} from "$lib/types/types.js";
import {redirect} from "@sveltejs/kit";
import {db} from "$lib/server/db/index.js";
import {joincodes} from "$lib/server/db/schema.js";
import {isNotNull, isNull} from "drizzle-orm";

export const load = async ({depends, locals}) => {
    depends("user:joincodes")
    if (!locals.user.permissions.includes(Permission.users_modify)) return redirect(302, "/home");
    console.log(await db.select().from(joincodes));
    // load all join codes
    return {
        joinCodes: {
            active: db.select().from(joincodes).where(isNull(joincodes.usedAt)),
            used: db.select().from(joincodes).where(isNotNull(joincodes.usedAt))
        }
    }
}