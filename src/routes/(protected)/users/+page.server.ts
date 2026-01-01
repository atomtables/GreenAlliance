import { Permission, Role, type User } from "$lib/types/types";
import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db/index.js";
import { joincodes, subteams, users } from "$lib/server/db/schema.js";
import { isNotNull, isNull, ne } from "drizzle-orm";
import { cleanUserFromDatabase } from "$lib/server/auth";

export const load = async ({ depends, locals }: any) => {
    depends("user:joincodes")
    console.log(await db.select().from(joincodes));
    // load all join codes
    let userselect = db.query.users.findMany({
        columns: {
            passwordHash: false,
            phone: false,
            address: false,
        },
        where: locals.user.permissions.includes(Permission.users_modify) ? undefined : ne(users.role, Role.administrator)
    }).then((v: any[]) => v.map(cleanUserFromDatabase));
    return {
        joinCodes: locals.user.permissions.includes(Permission.users_modify) && {
            active: db.select().from(joincodes).where(isNull(joincodes.usedAt)),
            used: db.select().from(joincodes).where(isNotNull(joincodes.usedAt))
        },
        users: userselect.then(users => {
            return {
                admins: users.filter(user => user.role === Role.administrator),
                coaches: users.filter(user => user.role === Role.coach),
                mentors: users.filter(user => user.role === Role.mentor),
                captains: users.filter(user => user.role === Role.captain),
                leads: users.filter(user => user.role === Role.lead),
                members: users.filter(user => user.role === Role.member),
            }
        }),
        usersbydatecreated: userselect.then(users => {
            users.sort((a: User, b: User) => (new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? 1 : -1));
            let result: any[] = [];
            let currentyear = 0, index = -1;
            for (const user of users) {
                const createdDate = new Date(user.createdAt);
                const createdYear = createdDate.getFullYear();
                if (createdYear > currentyear) {
                    currentyear = createdYear;
                    result.push([new Date().getFullYear() - currentyear, user]);
                    index++;
                } else {
                    result[index].push(user);
                }
            }
            return result;
        }),
        subteamsAvailable: db.select().from(subteams).then(async subteams =>
            await Promise.all(subteams.map(({ name: subteam }) =>
                userselect
                    .then(users => {
                        // screw boolean algebra
                        return ({ subteam, users: users.filter(user => user.subteam === subteam).map(cleanUserFromDatabase) });
                    })
            ))
        ),
    }
}