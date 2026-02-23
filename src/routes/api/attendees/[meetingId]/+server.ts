import { Permission } from '$lib/types/types';
import * as schema from "$lib/server/db/schema.js"
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }: any) => {
	if (!locals?.user) return error(401, "Unauthorized");

	const { meetingId } = params;
	if (!meetingId) return error(400, "Missing required parameter: meetingId");

	try {
		const attendees = await db
			.select({ userId: schema.meetingAttendees.userId })
			.from(schema.meetingAttendees)
			.where(eq(schema.meetingAttendees.meetingId, meetingId));

		if (!attendees) return error(404, "No attendees found or meeting does not exist");

		const userIds = attendees.map(a => a.userId);

		return json({ success: true, userIds }, { status: 200 });

	} catch (e: any) {
		if (e.name === "HttpError") throw e;
		console.log(e);
		return error(500, e.message || "Internal server error");
	}
}

export const POST: RequestHandler = async ({ request, params, locals }: any) => {
	if (!locals?.user) return error(401, "Unauthorized");

	const { meetingId } = params;
	if (!meetingId) return error(400, "Missing required parameter: meetingId");

	let { userIds } = await request.json();
	if (!Array.isArray(userIds)) return error(400, "Invalid request body: userIds must be an array");

	try {
		await db.transaction(async (tx) => {
			await tx.delete(schema.meetingAttendees).where(eq(schema.meetingAttendees.meetingId, meetingId));
			if (userIds.length > 0) {
				await tx.insert(schema.meetingAttendees).values(
					userIds.map((userId: string) => ({
						meetingId,
						userId,
						status: 'maybe',
						present: false
					}))
				);
			}
		});

		return json({ success: true, data: {} }, { status: 200 });

	} catch (e: any) {
		if (e.name === "HttpError") throw e;
		console.log(e);
		return error(500, e.message || "Internal server error");
	}
}
