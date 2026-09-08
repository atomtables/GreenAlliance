import {Permission} from '$lib/types/types';
import * as schema from "$lib/server/db/schema.js"
import type {RequestHandler} from '@sveltejs/kit';
import {error, json} from '@sveltejs/kit';
import {db} from '$lib/server/db';
import crypto from 'node:crypto';

export const PUT: RequestHandler = async ({ request, locals }: any) => {
	if (!locals.user) return error(401, "no auth...");
	if (!locals?.user?.permissions?.includes?.(Permission.calendar_moderate)) return error(403, "Access denied.");

	let { title, description, date, durationMinutes, applicableSubteams, members } = await request.json();
	if (!title || !date || isNaN(new Date(date).getTime())) return error(400, "Please fill out all necessary fields.");

	try {
		// generate id so we can return it reliably to the client/tests
		let i = 0;
		let id: string;
		while (true) {
			try {
				id = crypto.randomUUID();
				await db.insert(schema.meetings).values({
					id,
					createdBy: locals.user.id,
					title,
					description: description || null,
					dateOf: new Date(date),
					durationMinutes,
					subteams: applicableSubteams || [],
					members: members || []
				} as any);
				break;
			} catch (e: any) {
				i++;
				if (i > 5) throw new Error("unable to generate a valid ID. major server issue. try again later. " + e.message);
			}
		}

		if (members && members.length > 0) {
			await db.insert(schema.meetingAttendees).values(
				members.map((userId: string) => ({
					meetingId: id,
					userId,
					status: 'maybe',
					present: false
				}))
			);
		}

		return json({ success: true, data: { id } }, { status: 201 });

	} catch (e: any) {
		if (e.name === "HttpError") throw e;
		console.log(e);
		return error(500, e.message || "Internal server error");
	}
}

