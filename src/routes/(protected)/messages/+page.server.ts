import { db } from "$lib/server/db/index.js";
import { users } from "$lib/server/db/schema.js";
import { ne } from "drizzle-orm";

export const load = async ({ locals }: any) => {
    const allUsers = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatar: users.avatar,
        })
        .from(users)
        .where(ne(users.id, locals.user.id));

    return {
        currentUserId: locals.user.id,
        users: allUsers,
    };
}
