import { RequiresPermissions } from "$lib/functions/requirePermissions";
import { db } from "$lib/server/db";
import { messages } from "$lib/server/db/schema";
import type { Message } from "$lib/types/messages";
import { Permission } from "$lib/types/types";
import type { RequestHandler } from "@sveltejs/kit";

// handler to send a message to a specified chat id
export const POST: RequestHandler = async ({ request, locals }) => {
    RequiresPermissions(locals, [Permission.message]); 
    
    let formData = await request.formData();
    let chatId = formData.get("chatId") as string;
    let content = formData.get("content") as string;
    if (!chatId || !content) {
        return new Response(JSON.stringify({error: "Please provide all required fields"}), {status: 400});
    }
    let item: Message;
    try {
        // now we can create the message in the database
        item = await db.insert(messages).values({
            chatId,
            author: locals.user.id,
            content
        }).returning().then(res => res[0]);
    } catch (e) {
        console.error(`${request.url}: Error creating message: `, e);
        return new Response(JSON.stringify({error: "Internal server error"}), {status: 500});
    }
    // Placeholder implementation
    return new Response(JSON.stringify({message: item}), {status: 201});
}