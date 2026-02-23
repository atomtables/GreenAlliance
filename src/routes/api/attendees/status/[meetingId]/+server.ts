import { Permission } from '$lib/types/types';
import * as schema from "$lib/server/db/schema.js"
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }: any) => {
	if (!locals?.user) return error(401, "Unauthorized");

	const { meetingId } = params;
	if (!meetingId) return error(400, "Missing required parameter: meetingId");

	try {
		const userStatus = await db
			.select({ status: schema.meetingAttendees.status })
			.from(schema.meetingAttendees)
			.where(and(eq(schema.meetingAttendees.meetingId, meetingId)), eq(schema.meetingAttendees.userId, locals.user.id));

		if (!userStatus || userStatus.length === 0) return error(404, "No attendance status found for this user or meeting does not exist");

		return json({ success: true, userStatus: userStatus[0].status }, { status: 200 });

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

	let { status } = await request.json();
	if (!['yes', 'no', 'maybe'].includes(status)) return error(400, "Invalid status value. Must be 'yes', 'no', or 'maybe'.");

	try {
		const existingRecord = await db
			.select({ id: schema.meetingAttendees.id })
			.from(schema.meetingAttendees)
			.where(and(eq(schema.meetingAttendees.meetingId, meetingId)), eq(schema.meetingAttendees.userId, locals.user.id))

		if (!existingRecord) {
			return error(404, "Attendance record not found for this user and meeting");
		}

		await db.update(schema.meetingAttendees).set({ status }).where(eq(schema.meetingAttendees.id, existingRecord.id));

		return json({ success: true, data: {} }, { status: 200 });

	} catch (e: any) {
		if (e.name === "HttpError") throw e;
		console.log(e);
		return error(500, e.message || "Internal server error");
	}
}
