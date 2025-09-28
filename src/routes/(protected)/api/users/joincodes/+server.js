import {db} from "$lib/server/db/index.js";
import {joincodes} from "$lib/server/db/schema.js";
import {error, json} from "@sveltejs/kit";
import {createCode} from "$lib/functions/code.js";
import {inArray} from "drizzle-orm";
import {Permission} from "$lib/types/types"

export const PUT = async ({request, locals}) => {
    if (!locals?.user?.permissions?.includes?.(Permission.users_modify)) return error(403, {
        success: false,
        error: "Access denied."
    })
    try {
        let {firstName, lastName, role, subteam} = await request.json();
        console.log(firstName, lastName, role, subteam);
        if (!firstName || !lastName || typeof role == "undefined" || typeof subteam == "undefined") return error(400, {
            success: false,
            error: "Please fill out all fields."
        })
        let joinCode = createCode(6);

        while (true) {
            try {
                await db.insert(joincodes).values({firstName, lastName, role, subteam, joinCode});
                break;
            } catch (e) {
                joinCode = createCode(6);
            }
        }
        return json({success: true, data: {joinCode}}, {code: 201})
    } catch (e) {
        if (e.name !== "HttpError") throw e;
        console.log(e);
        return error(500, {success: false, error: e.message})
    }
}

export const DELETE = async ({request, locals}) => {
    if (!locals?.user?.permissions?.includes?.(Permission.users_modify)) return error(403, {
        success: false,
        error: "Access denied."
    })
    try {
        let joinCodes = await request.json();
        console.log("deleting join codes", joinCodes)
        if (!joinCodes) return error(400, {success: false, error: "Please list join codes to delete."})

        await db.delete(joincodes).where(inArray(joincodes.joinCode, joinCodes));
        return json({success: true}, {code: 200})
    } catch (e) {
        if (e.name !== "HttpError") throw e;
        console.log(e);
        return error(500, {success: false, error: e.message})
    }
}