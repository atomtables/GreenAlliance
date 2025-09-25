import { Permission } from '$lib/types/types';
import * as schema from "$lib/server/db/schema.js"
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const PUT = async ({request, locals}) => {
    if (!locals?.user?.permissions?.includes?.(Permission.calendar_moderate)) return error(403, {
        success: false,
        error: "Access denied."
    })

    let {title, description, date, applicableSubteams} = await request.json();
    if (!title || !date || isNaN(new Date(date).getTime())) return error(400, {
        success: false,
        error: "Please fill out all necessary fields."
    })

    try {
        // @ts-ignore
        await db.insert(schema.meetings).values({
            createdBy: locals.user.id,
            title,
            description,
            dateOf: new Date(date),
            subteams: applicableSubteams
        });
    } catch (e) {
        if (e.name === "HttpError") throw e;
        console.log(e);
        return error(500, {success: false, error: e.message})
    }

    return json({success: true, data: {}}, {code: 201})
}
