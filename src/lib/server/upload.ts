import "dotenv/config";

import * as crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), "public");

export const uploadRoot = process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR;
export const uploadPublicAccess = (process.env.UPLOAD_PUBLIC_ACCESS ?? "").toLowerCase() === "true";

export const uploadSubdirs = {
    attachments: "attachments",
    profilePictures: "profile-pictures",
    files: "files",
} as const;

export const uploadPaths = {
    attachments: path.join(uploadRoot, uploadSubdirs.attachments),
    profilePictures: path.join(uploadRoot, uploadSubdirs.profilePictures),
    files: path.join(uploadRoot, uploadSubdirs.files),
} as const;

export const ensureUploadDirectories = () => {
    for (const dir of Object.values(uploadPaths)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureUploadDirectories();

export const sanitizeFilename = (filename: string) => {
    const base = path.basename(filename || "file");
    const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
    return sanitized.length > 0 ? sanitized : "file";
};

export const buildUniqueFilename = (filename: string) => {
    const safe = sanitizeFilename(filename);
    const ext = path.extname(safe);
    const base = ext ? safe.slice(0, -ext.length) : safe;
    return `${crypto.randomUUID()}-${base || "file"}${ext}`;
};

export const buildProfilePictureFilename = () => `${crypto.randomUUID()}.png`;

export const buildRelativePath = (subdir: string, filename: string) => {
    return path.posix.join(subdir, filename);
};

export const buildFileUrl = (relativePath: string) => {
    return `/${path.posix.join("files", relativePath)}`;
};

const MAGIC_BYTES = {
    png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    jpeg: Buffer.from([0xff, 0xd8, 0xff]),
    gif87a: Buffer.from("GIF87a"),
    gif89a: Buffer.from("GIF89a"),
    riff: Buffer.from("RIFF"),
    webp: Buffer.from("WEBP"),
};

export const isSupportedImageBuffer = (buffer: Buffer) => {
    if (buffer.length < 12) return false;
    if (buffer.subarray(0, 8).equals(MAGIC_BYTES.png)) return true;
    if (buffer.subarray(0, 3).equals(MAGIC_BYTES.jpeg)) return true;
    if (buffer.subarray(0, 6).equals(MAGIC_BYTES.gif87a)) return true;
    if (buffer.subarray(0, 6).equals(MAGIC_BYTES.gif89a)) return true;
    if (buffer.subarray(0, 4).equals(MAGIC_BYTES.riff) && buffer.subarray(8, 12).equals(MAGIC_BYTES.webp)) return true;
    return false;
};

export const reencodeToPng = async (buffer: Buffer) => {
    return sharp(buffer).png().toBuffer();
};

export const resolveSafePath = (root: string, relativePath: string) => {
    const targetPath = path.resolve(root, relativePath);
    if (!targetPath.startsWith(path.resolve(root))) {
        throw new Error("Invalid file path");
    }
    return targetPath;
};
