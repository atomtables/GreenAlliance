import {db} from "$lib/server/db/index.js";
import {joincodes} from "$lib/server/db/schema.js";
import {error, json} from "@sveltejs/kit";
import type {RequestHandler} from "@sveltejs/kit";
import {createCode} from "$lib/functions/code.js";
import {inArray} from "drizzle-orm";
import {Permission} from "$lib/types/types";

export const PUT: RequestHandler = async ({request, locals}: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.users_modify)) return error(403, "Access denied.");
    try {
        let {firstName, lastName, role, subteam} = await request.json();
        if (!firstName || !lastName || typeof role == "undefined" || typeof subteam == "undefined") return error(400, "Please fill out all fields.");
        let joinCode = createCode(6);

        while (true) {
            try {
                await db.insert(joincodes).values({
                    firstName: firstName,
                    lastName: lastName,
                    role: role || null,
                    subteam: subteam || null,
                    joinCode
                } as any);
                break;
            } catch (e: any) {
                joinCode = createCode(6);
            }
        }
        return json({success: true, data: {joinCode}}, {status: 201})
    } catch (e: any) {
        if (e.name !== "HttpError") throw e;
        console.log(e);
        return error(500,  e.message);
    }
}

export const DELETE: RequestHandler = async ({request, locals}: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.users_modify)) return error(403, "Access denied.");
    try {
        let joinCodes = await request.json();
        console.log("deleting join codes", joinCodes)
        if (!joinCodes) return error(400, "Please list join codes to delete.");

        await db.delete(joincodes).where(inArray(joincodes.joinCode, joinCodes));
        return json({success: true}, {status: 200})
    } catch (e: any) {
        if (e.name !== "HttpError") throw e;
        console.log(e);
        return error(500,  e.message);
    }
}