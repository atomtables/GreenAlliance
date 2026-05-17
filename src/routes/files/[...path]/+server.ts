import type { RequestHandler } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { profilePictureTokens } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { resolveSafePath, uploadPublicAccess, uploadRoot, uploadSubdirs } from "$lib/server/upload";
import fs from "node:fs/promises";
import path from "node:path";

const contentTypeFor = (ext: string) => {
    switch (ext.toLowerCase()) {
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".gif":
            return "image/gif";
        case ".webp":
            return "image/webp";
        case ".pdf":
            return "application/pdf";
        case ".json":
            return "application/json";
        case ".txt":
            return "text/plain";
        default:
            return "application/octet-stream";
    }
};

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!uploadPublicAccess && !locals.user) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403 });
    }

    const rawPath = params.path;
    if (!rawPath) {
        return new Response(JSON.stringify({ error: "File not found" }), { status: 404 });
    }

    let decodedSegments: string[];
    try {
        decodedSegments = rawPath.split("/").map((segment) => decodeURIComponent(segment));
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid file path" }), { status: 400 });
    }

    let relativePath = decodedSegments.join("/");
    if (decodedSegments[0] === uploadSubdirs.profilePictures) {
        if (decodedSegments.length !== 2) {
            return new Response(JSON.stringify({ error: "File not found" }), { status: 404 });
        }
        const token = decodedSegments[1];
        const record = await db
            .select()
            .from(profilePictureTokens)
            .where(eq(profilePictureTokens.token, token))
            .limit(1)
            .then((res) => res[0]);
        if (!record) {
            return new Response(JSON.stringify({ error: "File not found" }), { status: 404 });
        }
        relativePath = record.filePath;
    }

    let absolutePath: string;
    try {
        absolutePath = resolveSafePath(uploadRoot, relativePath);
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid file path" }), { status: 400 });
    }

    try {
        const buffer = await fs.readFile(absolutePath);
        const contentType = contentTypeFor(path.extname(absolutePath));
        return new Response(buffer, { status: 200, headers: { "Content-Type": contentType } });
    } catch (e: any) {
        if (e?.code === "ENOENT") {
            return new Response(JSON.stringify({ error: "File not found" }), { status: 404 });
        }
        console.error(`${params.path}: Error reading file`, e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
};
