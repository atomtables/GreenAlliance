import { db } from "$lib/server/db";
import * as schema from "$lib/server/db/schema";
import { and, gte, lt } from "drizzle-orm";
import { Permission } from "$lib/types/types.js";
import { redirect } from "@sveltejs/kit";

export const load = async ({locals, depends}) => {
    if (!locals.user.permissions.includes(Permission.calendar)) return redirect(302, "/home?nopermission=true")
    depends("meetings:events")

    const now = new Date();
    let thisMonth = new Date(now.getFullYear(), now.getMonth());
    let nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    let meetingsThisMonth = await db
        .select()
        .from(schema.meetings)
        .where(
            and(
                gte(schema.meetings.dateOf, thisMonth),
                lt(schema.meetings.dateOf, nextMonth)
            )
        );
    

    return {
        meetings: meetingsThisMonth
    }
}