import { db } from "$lib/server/db";
import { users, meetings } from "$lib/server/db/schema";
import { and, gte, lt, ne, or, eq, sql } from "drizzle-orm";
import { Permission, Role, type User } from "$lib/types/types";
import { redirect } from "@sveltejs/kit";
import { cleanUserFromDatabase } from "$lib/server/auth";

export const load = async ({ locals, depends }: any) => {
	let editAccess = locals.user.permissions.includes(Permission.calendar_moderate);
	depends("meetings:events")

	const now = new Date();
	let thisMonth = new Date(now.getFullYear(), now.getMonth());
	let nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
	let meetingsQuery;

	if (editAccess) {
		meetingsQuery = db
			.select()
			.from(meetings)
			.where(
				and(
					gte(meetings.dateOf, thisMonth),
					lt(meetings.dateOf, nextMonth)
				)
			);
	} else {
		meetingsQuery = db
			.select()
			.from(meetings)
			.where(
				and(
					gte(meetings.dateOf, thisMonth),
					lt(meetings.dateOf, nextMonth),
					or(
						eq(meetings.createdBy, locals.user.id),
						sql`${meetings.members} @> ARRAY[${locals.user.id}]::text[]`
					)
				)
			);
	}

	const [meetingsThisMonth, userselect] = await Promise.all([
		meetingsQuery,
		db.query.users.findMany({
			columns: {
				passwordHash: false,
				phone: false,
				address: false,
			},
			where: locals.user.permissions.includes(Permission.users_modify)
				? undefined
				: ne(users.role, Role.administrator),
		}).then(users => users.map(cleanUserFromDatabase))
	]);

	return {
		meetings: meetingsThisMonth,
		users: userselect,
		editAccess,
	}
}
