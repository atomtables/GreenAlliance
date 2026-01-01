import { Permission, Role, type User } from "$lib/types/types";
import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db/index.js";
import { subteams, users } from "$lib/server/db/schema.js";
import { ne } from "drizzle-orm";
import { cleanUserFromDatabase } from "$lib/server/auth";

export const load = ({ locals }) => {
    if (!locals.user.permissions.includes(Permission.users)) return redirect(302, "/home?nopermission=true")

    // let userselect = db.select({
    //     firstName: users.firstName,
    //     lastName: users.lastName,
    //     avatar: users.avatar,
    //     role: users.role,
    //     subteam: users.subteam,
    //     email: users.email,
    //     createdAt: users.createdAt
    // })
    //     .from(users)
    //     .where(locals.user.permissions.includes(Permission.users_modify) ? ne(users.role, Role.administrator) : ne(users.role, Role.administrator))
    //     .then((v: User) => v)

    let userselect = db.query.users.findMany({
        columns: {
            passwordHash: false,
            phone: false,
            address: false,
        },
        where: locals.user.permissions.includes(Permission.users_modify) ? undefined : ne(users.role, Role.administrator)
    }).then((v: any[]) => v.map(cleanUserFromDatabase));

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