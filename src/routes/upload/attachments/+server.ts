import type {RequestHandler} from "@sveltejs/kit";
import {db} from "$lib/server/db";
import {attachments} from "$lib/server/db/schema";
import {RequiresPermissions} from "$lib/functions/requirePermissions";
import {Permission} from "$lib/types/types";
import {
    buildFileUrl,
    buildRelativePath,
    buildUniqueFilename,
    resolveSafePath,
    uploadRoot,
    uploadSubdirs
} from "$lib/server/upload";
import fs from "node:fs/promises";

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!RequiresPermissions(locals, [Permission.message])) {
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
    const filename = buildUniqueFilename(file.name || "attachment");
    const relativePath = buildRelativePath(uploadSubdirs.attachments, filename);
    const absolutePath = resolveSafePath(uploadRoot, relativePath);

    try {
        await fs.writeFile(absolutePath, buffer);
        const url = buildFileUrl(relativePath);
        await db.insert(attachments).values({
            author: locals.user!.id,
            filename,
            filesize: buffer.byteLength,
            url,
        } as typeof attachments.$inferInsert);
        return new Response(JSON.stringify({ token: url, url }), { status: 201 });
    } catch (e) {
        console.error(`${request.url}: Error uploading attachment`, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
};
