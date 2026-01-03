import {db} from "$lib/server/db/index.js";
import {joincodes, subteams} from "$lib/server/db/schema.js";
import {error, json} from "@sveltejs/kit";
import type {RequestHandler} from "@sveltejs/kit";
import {createCode} from "$lib/functions/code.js";
import {inArray} from "drizzle-orm";
import {Permission, Role} from "$lib/types/types";

const resolveRole = (value: unknown): Role | null => {
    if (typeof value === "number" && Role[value] !== undefined) return value as Role;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        const match = Object.entries(Role).find(([key, val]) => typeof val === "number" && key.toLowerCase() === normalized);
        if (match) return match[1] as Role;
    }
    return null;
};

export const PUT: RequestHandler = async ({request, locals}: any) => {
    if (!locals?.user?.permissions?.includes?.(Permission.users_modify)) throw error(403, "Access denied.");

    let payload: any;
    try {
        payload = await request.json();
    } catch (e) {
        throw error(400, "Invalid payload");
    }

    const {firstName, lastName, role, subteam} = payload ?? {};
    const resolvedRole = resolveRole(role);
    const resolvedSubteam = (typeof subteam === "string" && subteam.trim().length > 0) ? subteam.trim() : "All";

    if (!firstName || !lastName || resolvedRole === null) {
        throw error(400, "Please fill out all fields with valid data.");
    }

    await db.insert(subteams).values({name: resolvedSubteam}).onConflictDoNothing();

    let joinCode = createCode(6);
    for (let attempts = 0; attempts < 5; attempts++) {
        try {
            await db.insert(joincodes).values({
                firstName,
                lastName,
                role: resolvedRole,
                subteam: resolvedSubteam,
                joinCode
            } as any);
            return json({success: true, data: {joinCode}}, {status: 201});
        } catch (e: any) {
            if (e?.code === "23505") {
                joinCode = createCode(6);
                continue;
            }
            throw error(500, "Failed to create join code.");
        }
    }

    throw error(500, "Failed to generate a unique join code.");
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