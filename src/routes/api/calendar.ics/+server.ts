import ical from 'ical-generator';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { Permission } from '$lib/types/types';
import type { InferSelectModel } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	const calendar = ical({ name: 'Green Alliance Calendar' });

	const events = await db.select().from(schema.meetings);

	events.forEach((event: InferSelectModel<typeof schema.meetings>) => {
		calendar.createEvent({
			start: event.dateOf,
			end: new Date(event.dateOf.getTime() + event.durationMinutes * 60000),
			summary: event.title,
			description: event.description || ''
		});
	});

	return new Response(calendar.toString(), {
		headers: {
			'Content-Type': 'text/calendar',
			'Content-Disposition': 'attachment; filename="greenAllianceCalendar.ics"'
		}
	});
}
