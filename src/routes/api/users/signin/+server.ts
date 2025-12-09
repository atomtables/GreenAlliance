import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { login } from "$lib/functions/authUtil";

export const POST: RequestHandler = async (event: any) => {
    try {
        await login(event);
        return json({success: true, data: {}}, {status: 200});
    } catch (e: any) {
        // Handle SvelteKit HttpError (should be re-thrown)
        if (e?.status) throw e;
        
        // Handle validation errors
        if (e?.name === "ValidationError") {
            console.warn("Validation error during signin:", e.error);
            throw error(400, e.message || "Validation failed");
        }
        
        // Log unexpected errors
        console.error("Unexpected error during signin:", e);
        throw error(500, "Internal server error during authentication");
    }
}
