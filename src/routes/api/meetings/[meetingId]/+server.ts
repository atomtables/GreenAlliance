import {Permission} from '$lib/types/types';
import * as schema from "$lib/server/db/schema.js"
import type {RequestHandler} from '@sveltejs/kit';
import {error, json} from '@sveltejs/kit';
import {db} from '$lib/server/db';
import {eq} from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }: any) => {
	if (!locals?.user) return error(401, "Unauthorized");

	const { meetingId } = params;
	if (!meetingId) return error(400, "Missing required parameter: meetingId");

	try {
		const meeting = await db.query.meetings.findFirst({
			where: eq(schema.meetings.id, meetingId)
		});

		console.log(meeting)

		if (!meeting) return error(404, "Meeting not found");

		if (!meeting.members.includes(locals.user.id) && !locals.user.permissions?.includes?.(Permission.calendar_moderate)) {
			return error(403, "Access denied");
		}

		return json({ success: true, data: meeting }, { status: 200 });

	} catch (e: any) {
		if (e.name === "HttpError") throw e;
		console.log(e);
		return error(500, e.message || "Internal server error");
	}
}

export const PATCH: RequestHandler = async ({ request, params, locals }: any) => {
	if (!locals?.user?.permissions?.includes?.(Permission.calendar_moderate)) return error(403, "Access denied.");

	const { meetingId } = params;
	if (!meetingId) return error(400, "Missing required parameter: meetingId");

	let { title, description, date, durationMinutes, applicableSubteams, members } = await request.json();
	if (!title || !date || isNaN(new Date(date).getTime())) return error(400, "Please fill out all necessary fields.");

	try {
		await db.update(schema.meetings).set({
			title,
			description: description || null,
			dateOf: new Date(date),
			durationMinutes,
			subteams: applicableSubteams || [],
			members: members || []
		} as any).where(eq(schema.meetings.id, meetingId));

		return json({ success: true, data: {} }, { status: 200 });

	} catch (e: any) {
		if (e.name === "HttpError") throw e;
		console.log(e);
		return error(500, e.message || "Internal server error");
	}
}

export const DELETE: RequestHandler = async ({ params, locals }: any) => {
	if (!locals.user) return error(401, "Access no auth lmfao laugh at this guy/girl/x");
	if (!locals?.user?.permissions?.includes?.(Permission.calendar_moderate)) return error(403, "Access denied.");

	const { meetingId } = params;
	if (!meetingId) return error(400, "Missing required parameter: meetingId");

	let x;
	try {
		x = await db.delete(schema.meetings).where(eq(schema.meetings.id, meetingId));
	} catch (e: any) {
		if (e.name === "HttpError") throw e;
		console.log(e);
		return error(500, e.message || "Internal server error");
	}

	if (x.rowCount == 0) return error(404, "Invalid meeting ID")

	return json({ success: true, data: {} }, { status: 200 })
}
