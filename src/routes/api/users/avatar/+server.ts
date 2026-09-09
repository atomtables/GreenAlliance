import type { RequestHandler } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { profilePictureTokens, users } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { uploadSubdirs } from "$lib/server/upload";

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    let payload: { token?: string };
    try {
        payload = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
    }

    const token = payload?.token?.trim();
    if (!token) {
        return new Response(JSON.stringify({ error: "Token is required" }), { status: 400 });
    }

    const record = await db
        .select()
        .from(profilePictureTokens)
        .where(eq(profilePictureTokens.token, token))
        .limit(1)
        .then((res) => res[0]);
    if (!record) {
        return new Response(JSON.stringify({ error: "Profile picture not found" }), { status: 404 });
    }
    if (record.userId !== locals.user.id) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403 });
    }

    const avatarUrl = `/${["files", uploadSubdirs.profilePictures, token].join("/")}`;
    try {
        await db
            .update(users)
            .set({ avatar: avatarUrl } as typeof users.$inferSelect)
            .where(eq(users.id, locals.user.id));
        return new Response(JSON.stringify({ avatar: avatarUrl }), { status: 200 });
    } catch (e) {
        console.error(`${request.url}: Error updating avatar`, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
};
