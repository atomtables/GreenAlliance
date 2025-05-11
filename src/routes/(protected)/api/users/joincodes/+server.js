import {db} from "$lib/server/db/index.js";
import {joincodes} from "$lib/server/db/schema.js";
import {error, json} from "@sveltejs/kit";
import {createCode} from "$lib/functions/code.js";

export const PUT = async ({request}) => {
    try {
        let {firstName, lastName, role} = await request.json();
        console.log(firstName, lastName, role);
        if (!firstName || !lastName || !role) return error(400, {success: false, error: "Please fill out all fields."})
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