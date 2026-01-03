// These types are interchangeable with the database schema types in src/lib/server/db/schema

export interface Announcement {
    id: string;
    author: string;
    content: string;
    directedToSubteams?: string[];
    directedToRoles?: string[];
    attachments?: string[];
    edited?: boolean;
    deleted?: boolean;
}

export interface Message {
    // Snowflake ID (so includes timestamp)
    id: string;
    // Sender ID (links to user + indexed)
    author: string;
    // content
    content: string;
    // chat id that this message was sent in
    chatId: string;
    // was message edited?
    edited?: boolean;
    // previous message history (in case message was edited) (only for admins)
    editHistory?: {content: string, editedAt: string}[];
    // was message deleted?
    deleted?: boolean;
    // attachments (array of attachment IDs)
    attachments?: string[];
}

export interface Chat {
    id: string;
    // is this a group chat?
    isGroup: boolean;
    // chat name (for group chats)
    name?: string;
    archived?: boolean;
}