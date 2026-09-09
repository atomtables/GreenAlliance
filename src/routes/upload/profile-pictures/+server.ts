import type { RequestHandler } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { profilePictureTokens } from "$lib/server/db/schema";
import { RequiresPermissions } from "$lib/functions/requirePermissions";
import { Permission } from "$lib/types/types";
import { buildProfilePictureFilename, buildRelativePath, isSupportedImageBuffer, reencodeToPng, resolveSafePath, uploadRoot, uploadSubdirs } from "$lib/server/upload";
import fs from "node:fs/promises";
import * as crypto from "node:crypto";

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!RequiresPermissions(locals, [Permission.exist])) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 401 });
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid form data" }), { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: "File is required" }), { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isSupportedImageBuffer(buffer)) {
        return new Response(JSON.stringify({ error: "Unsupported image format" }), { status: 400 });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const filename = buildProfilePictureFilename();
    const relativePath = buildRelativePath(uploadSubdirs.profilePictures, filename);
    const absolutePath = resolveSafePath(uploadRoot, relativePath);

    try {
        const encoded = await reencodeToPng(buffer);
        await fs.writeFile(absolutePath, encoded);
        await db.insert(profilePictureTokens).values({
            token,
            userId: locals.user!.id,
            filePath: relativePath,
        } as typeof profilePictureTokens.$inferInsert);
        return new Response(JSON.stringify({ token }), { status: 201 });
    } catch (e) {
        console.error(`${request.url}: Error uploading profile picture`, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
};
