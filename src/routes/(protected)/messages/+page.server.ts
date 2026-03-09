import { db } from "$lib/server/db/index.js";
import { users } from "$lib/server/db/schema.js";
import { ne } from "drizzle-orm";
import { cleanUserFromDatabase } from "$lib/server/auth";

export const load = async ({ locals }: any) => {
    const allUsers = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatar: users.avatar,
            role: users.role,
            permissions: users.permissions,
            username: users.username,
            email: users.email,
            age: users.age,
            createdAt: users.createdAt,
            subteam: users.subteam,
        })
        .from(users)
        .where(ne(users.id, locals.user.id));

    return {
        currentUserId: locals.user.id,
        currentUser: locals.user,
        users: allUsers.map(cleanUserFromDatabase),
    };
}
