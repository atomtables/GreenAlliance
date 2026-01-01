import {db} from "$lib/server/db/index.js";
import {joincodes} from "$lib/server/db/schema.js";
import {error, json} from "@sveltejs/kit";
import type {RequestHandler} from "@sveltejs/kit";
import {createCode} from "$lib/functions/code.js";
import {inArray} from "drizzle-orm";
import {Permission} from "$lib/types/types";

export const PUT: RequestHandler = async ({request, locals}: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.users_modify)) throw error(403, "Access denied.");

    let payload: any;
    try {
        payload = await request.json();
    } catch (e) {
        throw error(400, "Invalid payload");
    }

    const {firstName, lastName, role, subteam} = payload ?? {};
    if (!firstName || !lastName || typeof role === "undefined" || typeof subteam === "undefined") {
        throw error(400, "Please fill out all fields.");
    }

    let joinCode = createCode(6);
    while (true) {
        try {
            await db.insert(joincodes).values({
                firstName,
                lastName,
                role: role || null,
                subteam: subteam || null,
                joinCode
            } as any);
            break;
        } catch (e: any) {
            joinCode = createCode(6);
        }
    }

    return json({success: true, data: {joinCode}}, {status: 201});
}

export const DELETE: RequestHandler = async ({request, locals}: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.users_modify)) throw error(403, "Access denied.");

    let joinCodes: any;
    try {
        joinCodes = await request.json();
    } catch (e) {
        throw error(400, "Invalid payload");
    }

    // Expect an array of join codes
    if (!Array.isArray(joinCodes) || joinCodes.length === 0) {
        throw error(400, "Please list join codes to delete.");
    }

    await db.delete(joincodes).where(inArray(joincodes.joinCode, joinCodes));
    return json({success: true}, {status: 200});
}