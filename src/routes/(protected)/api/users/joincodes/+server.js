import {db} from "$lib/server/db/index.js";
import {joincodes} from "$lib/server/db/schema.js";
import {error, json} from "@sveltejs/kit";
import {createCode} from "$lib/functions/code.js";
import {inArray} from "drizzle-orm";

export const PUT = async ({request}) => {
    try {
        let {firstName, lastName, role} = await request.json();
        console.log(firstName, lastName, role);
        if (!firstName || !lastName || typeof role == "undefined") return error(400, {
            success: false,
            error: "Please fill out all fields."
        })
        let joinCode = createCode(6);

        while (true) {
            try {
                await db.insert(joincodes).values({firstName, lastName, role, joinCode});
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

export const DELETE = async ({request}) => {
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