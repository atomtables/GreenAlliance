import { Permission } from '$lib/types/types';
import * as schema from "$lib/server/db/schema.js"
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const PUT: RequestHandler = async ({request, locals}: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.calendar_moderate)) return error(403, "Access denied.");

    let {title, description, date, applicableSubteams} = await request.json();
    if (!title || !date || isNaN(new Date(date).getTime())) return error(400, "Please fill out all necessary fields.");

    try {
        await db.insert(schema.meetings).values({
            createdBy: locals.user.id,
            title,
            description: description || null,
            dateOf: new Date(date),
            subteams: applicableSubteams || []
        } as any);
    } catch (e: any) {
        if (e.name === "HttpError") throw e;
        console.log(e);
        return error(500, e.message || "Internal server error");
    }

    return json({success: true, data: {}}, {status: 201})
}
