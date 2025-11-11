import {Permission, Role} from "$lib/types/types";
import {redirect} from "@sveltejs/kit";
import {db} from "$lib/server/db/index.js";
import {subteams, users} from "$lib/server/db/schema.js";
import {ne} from "drizzle-orm";

export const load = ({locals}: any) => {
    if (!locals.user.permissions.includes(Permission.users)) return redirect(302, "/home?nopermission=true")

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
        .where(locals.user.permissions.includes(Permission.users_modify) ? ne(users.role, Role.administrator) : ne(users.role, Role.administrator))

    return {
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
           users.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
           let result: any[] = [];
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
        subteamsWithMembers: db.select().from(subteams).then(async subteams =>
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