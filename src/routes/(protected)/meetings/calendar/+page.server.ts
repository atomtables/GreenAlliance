import { db } from "$lib/server/db";
import { users, meetings } from "$lib/server/db/schema";
import { and, gte, lt, ne } from "drizzle-orm";
import { Permission, Role, type User } from "$lib/types/types";
import { redirect } from "@sveltejs/kit";
import { cleanUserFromDatabase } from "$lib/server/auth";

export const load = async ({ locals, depends }: any) => {
	if (!locals.user.permissions.includes(Permission.calendar)) return redirect(302, "/home?nopermission=true")
	depends("meetings:events")

	const now = new Date();
	let thisMonth = new Date(now.getFullYear(), now.getMonth());
	let nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
	let meetingsThisMonth = await db
		.select()
		.from(meetings)
		.where(
			and(
				gte(meetings.dateOf, thisMonth),
				lt(meetings.dateOf, nextMonth)
			)
		);

	let userselect = await db.query.users.findMany({
		columns: {
			passwordHash: false,
			phone: false,
			address: false,
		},
		where: locals.user.permissions.includes(Permission.users_modify) ? undefined : ne(users.role, Role.administrator)
	}).then((v: any[]) => v.map(cleanUserFromDatabase));

	return {
		meetings: meetingsThisMonth,
		users: userselect
	}
}
