import type { RequestHandler } from "@sveltejs/kit";
import { db } from "$lib/server/db/index";
import { users } from "$lib/server/db/schema";
import { RequiresPermissions } from "$lib/functions/requirePermissions";
import { Permission, Role } from "$lib/types/types";
import { ne } from "drizzle-orm";
import { cleanUserFromDatabase } from "$lib/server/auth";

export const GET: RequestHandler = async ({ locals }) => {
    if (!RequiresPermissions(locals, [Permission.users])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    const includeAdmins = locals.user?.permissions.includes(Permission.users_modify) ?? false;

    try {
        const records = await db.query.users.findMany({
            columns: {
                passwordHash: false,
                phone: false,
                address: false,
            },
            where: includeAdmins ? undefined : ne(users.role, Role.administrator),
        });

        const cleaned = records.map(cleanUserFromDatabase);

        return new Response(JSON.stringify({ users: cleaned }), { status: 200 });
    } catch (e) {
        console.error(`/api/users/list GET:`, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
};
