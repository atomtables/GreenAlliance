import type { Chat } from "$lib/types/messages";
import type { User } from "$lib/types/types.js";

export const load = async ({ locals, fetch, depends }) => {
    depends("messages:chats");

    return {
        chats: fetch('/api/messages').then((res) => res.json()).then(async (data) => data.chats as Chat[]),
        users: fetch('/api/users/list').then((res) => res.json()).then((data) => data.users as User[])
    };
}