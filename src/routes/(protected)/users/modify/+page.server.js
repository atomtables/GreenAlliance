import {Permission, Role} from "$lib/types/types.js";
import {redirect} from "@sveltejs/kit";
import {db} from "$lib/server/db/index.js";
import {joincodes, subteams, users} from "$lib/server/db/schema.js";
import {isNotNull, isNull, ne} from "drizzle-orm";

export const load = async ({depends, locals}) => {
    depends("user:joincodes")
    if (!locals.user.permissions.includes(Permission.users_modify)) return redirect(302, "/home?nopermission=true");
    console.log(await db.select().from(joincodes));
    // load all join codes
    let userselect = db.select({
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        role: users.role,
        subteam: users.subteam,
        email: users.email,
        createdAt: users.createdAt
    })
        .from(users)
        // @ts-ignore
        .where(locals.user.permissions.includes(Permission.users_modify) ? ne(users.role, -1) : ne(users.role, Role.administrator))
    return {
        joinCodes: {
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
            users.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            let result = [];
            let currentyear = 0, index = -1;
            for (const user of users) {
                if (user.createdAt.getFullYear() > currentyear) {
                    currentyear = user.createdAt.getFullYear();
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
                        return ({ subteam, users: users.filter(user => user.subteam === subteam) });
                    })
            ))
        ),
    }
}