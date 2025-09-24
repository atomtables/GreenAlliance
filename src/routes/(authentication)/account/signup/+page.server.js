import * as auth from "$lib/server/auth.js";
import {validateLogin} from "$lib/server/auth.js";
import {fail, redirect} from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as schema from './src/lib/server/db/schema';
import * as crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { hash } from "@node-rs/argon2";

function normalizeData(data) {
    return data.toString().toLowerCase();
}

export const actions = {
    default: async e => {

        const data = await e.request.formData();
        const username = normalizeData(data.get("username"));
        const password = data.get("password")?.toString();
        const phone = normalizeData(data.get("phone"));
        const address = normalizeData(data.get("address"));
        const firstName = normalizeData(data.get("fname"));
        const lastName = normalizeData(data.get("lname"));
        const email = normalizeData(data.get("email")).trim();

        try {

            await db.transaction(async (tx) => {
                const existingUser = await tx.query.users.findFirst({
                    where: eq(schema.users.email, email)
                });

                if (existingUser) {
                    throw new Error("USER_EXISTS");
                }

                const passwordHash = await hash(password, {
                    // recommended minimum parameters
                    memoryCostr: 19456,
                    timeCost: 2,
                    outputLen: 32,
                    parallelism: 1,
                });

                const id = crypto.randomUUID();

                // this is the admin
                await db.insert(schema.users).values({
                    id: id,
                    username,
                    passwordHash,
                    phone,
                    address,
                    age: 15,
                    firstName,
                    lastName,
                    email,
                });

                const sessionToken = auth.generateSessionToken();
                const session = await auth.createSession(sessionToken, id);
                auth.setSessionTokenCookie(e, sessionToken, session.expiresAt);
            })
        } catch (e) {
            if (e.message === "USER_EXISTS") {
                return fail(409, { error: "A user with this email already exists." })
            } else {
                return fail(500, { error: "An internal server error occurred." })
            }
        }

        return redirect(302, '/');
    }
}