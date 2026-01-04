import { test, expect } from '@playwright/test';
import { signin } from './util';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { chats, chatParticipants, messages, users } from '../../src/lib/server/db/schema';

/**
 * Database connection for direct verification of data.
 * This allows tests to verify that API operations correctly persist data.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Track resources created during tests for cleanup
const createdChatIds: string[] = [];
const createdMessageIds: string[] = [];

/**
 * Helper to delete a message from the database
 */
async function deleteMessage(messageId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, messageId));
}

/**
 * Helper to delete a chat and its participants and messages from the database
 */
async function deleteChat(chatId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.chatId, chatId));
    await db.delete(chatParticipants).where(eq(chatParticipants.chatId, chatId));
    await db.delete(chats).where(eq(chats.id, chatId));
}

/**
 * Helper to clean up all chats involving specific user IDs
 */
async function cleanupChatsForUsers(userIds: string[]): Promise<void> {
    const participantRecords = await db.select({ chatId: chatParticipants.chatId })
        .from(chatParticipants)
        .where(inArray(chatParticipants.userId, userIds));
    
    const chatIdsToDelete = [...new Set(participantRecords.map(p => p.chatId))];
    
    if (chatIdsToDelete.length > 0) {
        await db.delete(messages).where(inArray(messages.chatId, chatIdsToDelete));
        await db.delete(chatParticipants).where(inArray(chatParticipants.chatId, chatIdsToDelete));
        await db.delete(chats).where(inArray(chats.id, chatIdsToDelete));
    }
}

/**
 * Helper to create a chat via PUT /api/messages
 * Uses multipart form data to create a chat with specified participants
 */
async function createChat(
    request: any,
    participantIds: string | string[],
    name?: string
): Promise<any> {
    const ids = Array.isArray(participantIds) ? participantIds : [participantIds];
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = '';
    
    for (const id of ids) {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="participantIds"\r\n\r\n`;
        body += `${id}\r\n`;
    }
    
    if (name !== undefined) {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="name"\r\n\r\n`;
        body += `${name}\r\n`;
    }
    
    body += `--${boundary}--\r\n`;
    
    return request.put('/api/messages', {
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        data: body
    });
}

/**
 * Helper to send a message via POST /api/messages/[chatId]
 */
async function sendMessage(
    request: any,
    chatId: string,
    content: string
): Promise<any> {
    return request.post(`/api/messages/${chatId}`, {
        multipart: {
            chatId: chatId,
            content: content
        }
    });
}

/**
 * Helper to edit a message via PATCH /api/messages/[chatId]
 */
async function editMessage(
    request: any,
    chatId: string,
    messageId: string,
    newContent: string
): Promise<any> {
    return request.patch(`/api/messages/${chatId}`, {
        multipart: {
            messageId: messageId,
            content: newContent
        }
    });
}

/**
 * Helper to delete a message via DELETE /api/messages/[chatId]
 */
async function deleteMessageViaApi(
    request: any,
    chatId: string,
    messageId: string
): Promise<any> {
    return request.delete(`/api/messages/${chatId}`, {
        multipart: {
            messageId: messageId
        }
    });
}

/**
 * Helper to get user IDs from usernames (requires authentication first)
 */
async function getUserIds(request: any): Promise<{ modUserId: string | undefined, regUserId: string | undefined }> {
    const usersResponse = await request.get('/api/users/list');
    if (usersResponse.status() !== 200) {
        console.error('Failed to get users list:', await usersResponse.text());
        return { modUserId: undefined, regUserId: undefined };
    }
    
    const usersBody = await usersResponse.json();
    const modUser = usersBody.users.find((u: any) => u.username === process.env.MOD_USER);
    const regUser = usersBody.users.find((u: any) => u.username === process.env.REG_USER);
    
    return {
        modUserId: modUser?.id,
        regUserId: regUser?.id
    };
}

// Clean up all created resources after all tests
test.afterAll(async () => {
    for (const messageId of createdMessageIds) {
        try {
            await deleteMessage(messageId);
        } catch (e) {
            // Ignore errors - message may have already been deleted
        }
    }
    
    for (const chatId of createdChatIds) {
        try {
            await deleteChat(chatId);
        } catch (e) {
            // Ignore errors - chat may have already been deleted
        }
    }
    
    await pool.end();
});

/**
 * Test suite for /api/messages/[chatId] endpoint
 * Tests message sending, editing, deleting, and SSE retrieval
 */
test.describe("Chat Messages endpoint tests (/api/messages/[chatId])", () => {

    let testChatId: string;
    let modUserId: string;
    let regUserId: string;

    // Pre-test setup: Create a test chat for message operations
    test.beforeAll(async ({ request }) => {
        // Sign in first
        const signinResponse = await signin(request);
        if (signinResponse.status() !== 200) {
            console.error('Failed to sign in during setup');
            return;
        }
        
        // Get user IDs
        const userIds = await getUserIds(request);
        if (!userIds.modUserId || !userIds.regUserId) {
            console.error('Could not find test users');
            return;
        }
        modUserId = userIds.modUserId;
        regUserId = userIds.regUserId;
        
        // Clean up any existing chats between test users
        if (modUserId && regUserId) {
            await cleanupChatsForUsers([modUserId, regUserId]);
        }
        
        // Create a test chat
        const createResponse = await createChat(request, regUserId);
        if (![200, 201].includes(createResponse.status())) {
            console.error('Failed to create test chat:', await createResponse.text());
            return;
        }
        
        const createBody = await createResponse.json();
        testChatId = createBody.chat.id;
        createdChatIds.push(testChatId);
    });

    // Skip tests if setup failed
    test.beforeEach(async ({ }, testInfo) => {
        // Permission tests don't need testChatId, they use a dummy value
        if (testInfo.title.includes('requires authentication')) {
            return;
        }
        // Other tests need the chat to be set up
        if (!testChatId || !modUserId || !regUserId) {
            testInfo.skip();
        }
    });

    // ==================== PERMISSION TESTS ====================

    test.describe("Permission checks", () => {

        test("GET (SSE): requires authentication", async ({ request }) => {
            // Use a dummy chat ID for unauthenticated requests
            const chatId = testChatId || 'test-chat-id';
            const response = await request.get(`/api/messages/${chatId}`);
            expect(response.status()).toBe(401);
        });

        test("POST: requires authentication", async ({ request }) => {
            const chatId = testChatId || 'test-chat-id';
            const response = await request.post(`/api/messages/${chatId}`, {
                multipart: {
                    chatId: chatId,
                    content: "Test message"
                }
            });
            expect(response.status()).toBe(401);
        });

        test("PATCH: requires authentication", async ({ request }) => {
            const chatId = testChatId || 'test-chat-id';
            const response = await request.patch(`/api/messages/${chatId}`, {
                multipart: {
                    messageId: "some-message-id",
                    content: "Edited content"
                }
            });
            expect(response.status()).toBe(401);
        });

        test("DELETE: requires authentication", async ({ request }) => {
            const chatId = testChatId || 'test-chat-id';
            const response = await request.delete(`/api/messages/${chatId}`, {
                multipart: {
                    messageId: "some-message-id"
                }
            });
            expect(response.status()).toBe(401);
        });

        test("HEAD: requires authentication", async ({ request }) => {
            const chatId = testChatId || 'test-chat-id';
            const response = await request.head(`/api/messages/${chatId}?before=123&sessionId=test`);
            expect(response.status()).toBe(401);
        });

    });

    // ==================== INPUT VALIDATION TESTS ====================

    test.describe("Input validation", () => {

        test("POST: returns 400 when chatId is missing", async ({ request }) => {
            await signin(request);

            const response = await request.post(`/api/messages/${testChatId}`, {
                multipart: {
                    content: "Test message"
                }
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("POST: returns 400 when content is missing", async ({ request }) => {
            await signin(request);

            const response = await request.post(`/api/messages/${testChatId}`, {
                multipart: {
                    chatId: testChatId
                }
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("POST: returns 400 when both chatId and content are missing", async ({ request }) => {
            await signin(request);

            const response = await request.post(`/api/messages/${testChatId}`, {
                multipart: {}
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("PATCH: returns 400 when messageId is missing", async ({ request }) => {
            await signin(request);

            const response = await request.patch(`/api/messages/${testChatId}`, {
                multipart: {
                    content: "New content"
                }
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("PATCH: returns 400 when content is missing", async ({ request }) => {
            await signin(request);

            const response = await request.patch(`/api/messages/${testChatId}`, {
                multipart: {
                    messageId: "some-message-id"
                }
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("DELETE: returns 400 when messageId is missing", async ({ request }) => {
            await signin(request);

            const response = await request.delete(`/api/messages/${testChatId}`, {
                multipart: {}
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("HEAD: returns 400 when 'before' message ID is missing", async ({ request }) => {
            await signin(request);

            const response = await request.head(`/api/messages/${testChatId}?sessionId=test`);

            expect(response.status()).toBe(400);
        });

        test("HEAD: returns 400 when sessionId is invalid or missing", async ({ request }) => {
            await signin(request);

            const response = await request.head(`/api/messages/${testChatId}?before=123`);

            expect(response.status()).toBe(400);
        });

    });

    // ==================== MESSAGE SENDING TESTS (POST) ====================

    test.describe("Message sending (POST)", () => {

        test("successfully sends a message to a chat", async ({ request }) => {
            await signin(request);

            const messageContent = "Hello, this is a test message!";
            const response = await sendMessage(request, testChatId, messageContent);

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.message).toBeDefined();
            expect(body.message.id).toBeDefined();
            expect(body.message.content).toBe(messageContent);
            expect(body.message.chatId).toBe(testChatId);
            expect(body.message.author).toBe(modUserId);
            expect(body.message.edited).toBe(false);
            // deleted should be undefined for all messages sent to the client
            expect(body.message.deleted).toBe(undefined);

            // Track for cleanup
            createdMessageIds.push(body.message.id);

            // Verify in database
            const dbMessage = await db.select().from(messages).where(eq(messages.id, body.message.id));
            expect(dbMessage.length).toBe(1);
            expect(dbMessage[0].content).toBe(messageContent);
            expect(dbMessage[0].chatId).toBe(testChatId);
            expect(dbMessage[0].author).toBe(modUserId);
            expect(dbMessage[0].edited).toBe(false);
            expect(dbMessage[0].deleted).toBe(false);
        });

        test("message has correct Snowflake ID format", async ({ request }) => {
            await signin(request);

            const response = await sendMessage(request, testChatId, "Testing Snowflake ID format");

            expect(response.status()).toBe(201);
            const body = await response.json();
            
            // Snowflake IDs should be numeric strings
            expect(body.message.id).toMatch(/^\d+$/);
            
            // ID should be a valid bigint
            expect(() => BigInt(body.message.id)).not.toThrow();

            createdMessageIds.push(body.message.id);
        });

        test("messages are ordered correctly (newer messages have larger IDs)", async ({ request }) => {
            await signin(request);

            // Send first message
            const response1 = await sendMessage(request, testChatId, "First message");
            expect(response1.status()).toBe(201);
            const body1 = await response1.json();
            createdMessageIds.push(body1.message.id);

            // Small delay to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            // Send second message
            const response2 = await sendMessage(request, testChatId, "Second message");
            expect(response2.status()).toBe(201);
            const body2 = await response2.json();
            createdMessageIds.push(body2.message.id);

            // Second message should have larger ID than first
            expect(BigInt(body2.message.id)).toBeGreaterThan(BigInt(body1.message.id));
        });

        test("returns 404 when sending to non-existent chat", async ({ request }) => {
            await signin(request);

            const response = await sendMessage(request, "999999999999999999", "Test message");

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("returns 403 when user is not a participant in the chat", async ({ request }) => {
            // This test requires creating a chat that the current user is NOT part of
            // We'll create a chat between two other users (if available)
            await signin(request);

            // Get all users
            const usersResponse = await request.get('/api/users/list');
            const usersBody = await usersResponse.json();
            
            // Find users other than the test users
            const otherUsers = usersBody.users.filter((u: any) => 
                u.username !== process.env.MOD_USER && u.username !== process.env.REG_USER
            );
            
            if (otherUsers.length < 2) {
                test.skip();
                return;
            }

            // Create a chat directly in the database between two other users
            const chatId = `test_${Date.now()}`;
            await db.insert(chats).values({
                id: chatId,
                isGroup: false,
                name: null,
                archived: false
            });
            await db.insert(chatParticipants).values([
                { chatId, userId: otherUsers[0].id },
                { chatId, userId: otherUsers[1].id }
            ]);
            createdChatIds.push(chatId);

            // Try to send a message to this chat as mod user (not a participant)
            const response = await sendMessage(request, chatId, "Unauthorized message");

            expect(response.status()).toBe(403);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("message content can contain special characters", async ({ request }) => {
            await signin(request);

            const specialContent = "Test with special chars: <script>alert('xss')</script> & \"quotes\" 'apostrophes' émojis: 🎉🚀";
            const response = await sendMessage(request, testChatId, specialContent);

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.message.content).toBe(specialContent);
            createdMessageIds.push(body.message.id);

            // Verify stored correctly in database
            const dbMessage = await db.select().from(messages).where(eq(messages.id, body.message.id));
            expect(dbMessage[0].content).toBe(specialContent);
        });

        test("message content can be very long", async ({ request }) => {
            await signin(request);

            const longContent = "A".repeat(10000);
            const response = await sendMessage(request, testChatId, longContent);

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.message.content).toBe(longContent);
            createdMessageIds.push(body.message.id);
        });

        test("message content can contain newlines and whitespace", async ({ request }) => {
            await signin(request);

            const multilineContent = "Line 1\nLine 2\n\nLine 4 (after blank line)\t\tWith tabs";
            const response = await sendMessage(request, testChatId, multilineContent);

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.message.content).toBe(multilineContent);
            createdMessageIds.push(body.message.id);
        });

    });

    // ==================== MESSAGE EDITING TESTS (PATCH) ====================

    test.describe("Message editing (PATCH)", () => {

        test("successfully edits own message", async ({ request }) => {
            await signin(request);

            // First, create a message to edit
            const originalContent = "Original message content";
            const sendResponse = await sendMessage(request, testChatId, originalContent);
            expect(sendResponse.status()).toBe(201);
            const sendBody = await sendResponse.json();
            const messageId = sendBody.message.id;
            createdMessageIds.push(messageId);

            // Now edit the message
            const newContent = "Edited message content";
            const editResponse = await editMessage(request, testChatId, messageId, newContent);

            expect(editResponse.status()).toBe(204);

            // Verify in database
            const dbMessage = await db.select().from(messages).where(eq(messages.id, messageId));
            expect(dbMessage.length).toBe(1);
            expect(dbMessage[0].content).toBe(newContent);
            expect(dbMessage[0].edited).toBe(true);
            expect(dbMessage[0].editHistory).toHaveLength(1);
            expect(dbMessage[0].editHistory[0].content).toBe(originalContent);
        });

        test("edit history is maintained correctly", async ({ request }) => {
            await signin(request);

            // Create a message
            const content1 = "First version";
            const sendResponse = await sendMessage(request, testChatId, content1);
            const messageId = sendResponse.json().then(b => b.message.id);
            const resolvedMessageId = await messageId;
            createdMessageIds.push(resolvedMessageId);

            // Edit multiple times
            const content2 = "Second version";
            await editMessage(request, testChatId, resolvedMessageId, content2);

            const content3 = "Third version";
            await editMessage(request, testChatId, resolvedMessageId, content3);

            const content4 = "Fourth version";
            await editMessage(request, testChatId, resolvedMessageId, content4);

            // Verify edit history
            const dbMessage = await db.select().from(messages).where(eq(messages.id, resolvedMessageId));
            expect(dbMessage[0].content).toBe(content4);
            expect(dbMessage[0].editHistory).toHaveLength(3);
            expect(dbMessage[0].editHistory[0].content).toBe(content1);
            expect(dbMessage[0].editHistory[1].content).toBe(content2);
            expect(dbMessage[0].editHistory[2].content).toBe(content3);
            
            // Each edit history entry should have a timestamp
            for (const entry of dbMessage[0].editHistory) {
                expect(entry.editedAt).toBeDefined();
                expect(new Date(entry.editedAt).toString()).not.toBe('Invalid Date');
            }
        });

        test("returns 404 when editing non-existent message", async ({ request }) => {
            await signin(request);

            const response = await editMessage(request, testChatId, "999999999999999999", "New content");

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("returns 403 when trying to edit another user's message", async ({ request }) => {
            // Login as mod user and create a message
            await signin(request);
            const sendResponse = await sendMessage(request, testChatId, "Mod's message");
            expect(sendResponse.status()).toBe(201);
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Login as regular user and try to edit the message
            await signin(request, process.env.REG_USER, process.env.REG_PASS);
            const editResponse = await editMessage(request, testChatId, messageId, "Unauthorized edit");

            expect(editResponse.status()).toBe(403);
            const body = await editResponse.json();
            expect(body.error).toBeDefined();

            // Verify message was not changed in database
            const dbMessage = await db.select().from(messages).where(eq(messages.id, messageId));
            expect(dbMessage[0].content).toBe("Mod's message");
            expect(dbMessage[0].edited).toBe(false);
        });

        test("edited message preserves original attributes", async ({ request }) => {
            await signin(request);

            // Create a message
            const sendResponse = await sendMessage(request, testChatId, "Original");
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Get original message from database
            const originalMessage = (await db.select().from(messages).where(eq(messages.id, messageId)))[0];

            // Edit the message
            await editMessage(request, testChatId, messageId, "Edited");

            // Verify attributes are preserved
            const editedMessage = (await db.select().from(messages).where(eq(messages.id, messageId)))[0];
            expect(editedMessage.id).toBe(originalMessage.id);
            expect(editedMessage.chatId).toBe(originalMessage.chatId);
            expect(editedMessage.author).toBe(originalMessage.author);
            expect(editedMessage.deleted).toBe(false);
        });

    });

    // ==================== MESSAGE DELETION TESTS (DELETE) ====================

    test.describe("Message deletion (DELETE)", () => {

        test("successfully deletes (soft delete) own message", async ({ request }) => {
            await signin(request);

            // Create a message
            const sendResponse = await sendMessage(request, testChatId, "Message to delete");
            expect(sendResponse.status()).toBe(201);
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Verify not deleted before
            const dbBefore = await db.select().from(messages).where(eq(messages.id, messageId));
            expect(dbBefore[0].deleted).toBe(false);

            // Delete the message
            const deleteResponse = await deleteMessageViaApi(request, testChatId, messageId);

            expect(deleteResponse.status()).toBe(204);

            // Verify soft delete in database (message still exists but deleted flag is true)
            const dbAfter = await db.select().from(messages).where(eq(messages.id, messageId));
            expect(dbAfter.length).toBe(1);
            expect(dbAfter[0].deleted).toBe(true);
            // Content should still be preserved for admin access
            expect(dbAfter[0].content).toBe("Message to delete");
        });

        test("returns 404 when deleting non-existent message", async ({ request }) => {
            await signin(request);

            const response = await deleteMessageViaApi(request, testChatId, "999999999999999999");

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBeDefined();
        });

        test("returns 403 when trying to delete another user's message", async ({ request }) => {
            // Login as mod user and create a message
            await signin(request);
            const sendResponse = await sendMessage(request, testChatId, "Mod's message to delete");
            expect(sendResponse.status()).toBe(201);
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Login as regular user and try to delete the message
            await signin(request, process.env.REG_USER, process.env.REG_PASS);
            const deleteResponse = await deleteMessageViaApi(request, testChatId, messageId);

            expect(deleteResponse.status()).toBe(403);
            const body = await deleteResponse.json();
            expect(body.error).toBeDefined();

            // Verify message was not deleted in database
            const dbMessage = await db.select().from(messages).where(eq(messages.id, messageId));
            expect(dbMessage[0].deleted).toBe(false);
        });

        test("cannot delete message that doesn't belong to the specified chat", async ({ request }) => {
            await signin(request);

            // Create another chat
            const createResponse = await createChat(request, regUserId, "Another test chat");
            const otherChatId = (await createResponse.json()).chat.id;
            createdChatIds.push(otherChatId);

            // Create a message in the other chat
            const sendResponse = await sendMessage(request, otherChatId, "Message in other chat");
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Try to delete the message but using the wrong chat ID
            const deleteResponse = await deleteMessageViaApi(request, testChatId, messageId);

            // Should return 404 because message doesn't exist in this chat
            expect(deleteResponse.status()).toBe(404);
        });

    });

    // ==================== MESSAGE RETRIEVAL TESTS (GET/SSE) ====================

    test.describe("Message retrieval via SSE (GET)", () => {

        test("SSE connection opens successfully for authorized user and receives session event", async ({ page, request }) => {
            // First, sign in via the page to establish browser cookies
            await page.goto('/account/signin');
            await page.fill('#username', process.env.MOD_USER!);
            await page.fill('#password', process.env.MOD_PASS!);
            await page.click('button[type="submit"]');
            
            // Wait for navigation after signin
            await page.waitForURL(/.*(?<!signin)$/);

            // Now use EventSource in the browser context to test SSE
            const sseResult = await page.evaluate(async (chatId) => {
                return new Promise<{ success: boolean; sessionId?: string; error?: string }>((resolve) => {
                    const timeoutId = setTimeout(() => {
                        source.close();
                        resolve({ success: false, error: 'Timeout waiting for SSE events' });
                    }, 10000);

                    const source = new EventSource(`/api/messages/${chatId}`);
                    
                    source.addEventListener('session', (event) => {
                        clearTimeout(timeoutId);
                        const data = JSON.parse(event.data);
                        source.close();
                        resolve({ success: true, sessionId: data.sessionId });
                    });

                    source.onerror = () => {
                        clearTimeout(timeoutId);
                        source.close();
                        resolve({ success: false, error: 'SSE connection error' });
                    };
                });
            }, testChatId);

            expect(sseResult.success).toBe(true);
            expect(sseResult.sessionId).toBeDefined();
            expect(typeof sseResult.sessionId).toBe('string');
        });

        test("SSE connection receives messages from chat history", async ({ page, request }) => {
            // First send a message so there's something in the chat
            await signin(request);
            const testContent = `SSE test message ${Date.now()}`;
            const sendResponse = await sendMessage(request, testChatId, testContent);
            expect(sendResponse.status()).toBe(201);
            const sentMessageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(sentMessageId);

            // Sign in via the page
            await page.goto('/account/signin');
            await page.fill('#username', process.env.MOD_USER!);
            await page.fill('#password', process.env.MOD_PASS!);
            await page.click('button[type="submit"]');
            await page.waitForURL(/.*(?<!signin)$/);

            // Connect to SSE and collect messages
            const sseResult = await page.evaluate(async ({ chatId, expectedContent }) => {
                return new Promise<{ success: boolean; messages: any[]; error?: string }>((resolve) => {
                    const messages: any[] = [];
                    let sessionReceived = false;

                    const timeoutId = setTimeout(() => {
                        source.close();
                        resolve({ success: sessionReceived, messages, error: 'Timeout' });
                    }, 10000);

                    const source = new EventSource(`/api/messages/${chatId}`);
                    
                    source.addEventListener('session', () => {
                        sessionReceived = true;
                    });

                    source.addEventListener('message', (event) => {
                        const data = JSON.parse(event.data);
                        messages.push(data.message);
                        
                        // Check if we received our test message
                        if (data.message.content === expectedContent) {
                            clearTimeout(timeoutId);
                            source.close();
                            resolve({ success: true, messages });
                        }
                    });

                    source.onerror = () => {
                        clearTimeout(timeoutId);
                        source.close();
                        resolve({ success: false, messages, error: 'SSE connection error' });
                    };
                });
            }, { chatId: testChatId, expectedContent: testContent });

            expect(sseResult.success).toBe(true);
            expect(sseResult.messages.length).toBeGreaterThan(0);
            
            // Verify our test message was received
            const receivedMessage = sseResult.messages.find(m => m.content === testContent);
            expect(receivedMessage).toBeDefined();
            expect(receivedMessage.chatId).toBe(testChatId);
        });

        test("SSE returns 401 for unauthenticated request", async ({ page }) => {
            // Go to a page without signing in
            await page.goto('/');

            // Try to connect to SSE endpoint without authentication
            const sseResult = await page.evaluate(async (chatId) => {
                return new Promise<{ success: boolean; status?: number; error?: string }>((resolve) => {
                    const timeoutId = setTimeout(() => {
                        resolve({ success: false, error: 'Timeout' });
                    }, 5000);

                    // Use fetch to check the initial response status
                    fetch(`/api/messages/${chatId}`, {
                        headers: { 'Accept': 'text/event-stream' }
                    }).then(response => {
                        clearTimeout(timeoutId);
                        resolve({ success: response.status === 401, status: response.status });
                    }).catch(err => {
                        clearTimeout(timeoutId);
                        resolve({ success: false, error: err.message });
                    });
                });
            }, testChatId || 'test-chat-id');

            expect(sseResult.success).toBe(true);
            expect(sseResult.status).toBe(401);
        });

    });

    // ==================== CHAT ID VALIDATION TESTS ====================

    test.describe("Chat ID validation", () => {

        test("POST: returns error for invalid chat ID format", async ({ request }) => {
            await signin(request);

            const response = await sendMessage(request, "invalid!!chatid", "Test");

            // Should return 404 (chat not found) since invalid ID won't match any chat
            expect([400, 404]).toContain(response.status());
        });

        test("PATCH: returns error for invalid chat ID", async ({ request }) => {
            await signin(request);

            const response = await editMessage(request, "invalid", "someid", "New content");

            expect([400, 404]).toContain(response.status());
        });

        test("DELETE: returns error for invalid chat ID", async ({ request }) => {
            await signin(request);

            const response = await deleteMessageViaApi(request, "invalid", "someid");

            expect([400, 404]).toContain(response.status());
        });

    });

    // ==================== CONCURRENT OPERATIONS TESTS ====================

    test.describe("Concurrent operations", () => {

        test("multiple messages can be sent in quick succession", async ({ request }) => {
            await signin(request);

            const messagePromises = [];
            for (let i = 0; i < 5; i++) {
                messagePromises.push(sendMessage(request, testChatId, `Quick message ${i}`));
            }

            const responses = await Promise.all(messagePromises);

            // All messages should be created successfully
            for (const response of responses) {
                expect(response.status()).toBe(201);
                const body = await response.json();
                createdMessageIds.push(body.message.id);
            }

            // Verify all messages exist in database
            const dbMessages = await db.select()
                .from(messages)
                .where(eq(messages.chatId, testChatId))
                .orderBy(desc(messages.id));

            // Should have at least 5 messages (possibly more from other tests)
            expect(dbMessages.length).toBeGreaterThanOrEqual(5);
        });

        test("message IDs are unique even under concurrent creation", async ({ request }) => {
            await signin(request);

            const messagePromises = [];
            for (let i = 0; i < 10; i++) {
                messagePromises.push(sendMessage(request, testChatId, `Concurrent message ${i}`));
            }

            const responses = await Promise.all(messagePromises);
            const messageIds: string[] = [];

            for (const response of responses) {
                const body = await response.json();
                messageIds.push(body.message.id);
                createdMessageIds.push(body.message.id);
            }

            // All IDs should be unique
            const uniqueIds = new Set(messageIds);
            expect(uniqueIds.size).toBe(messageIds.length);
        });

    });

    // ==================== EDGE CASES ====================

    test.describe("Edge cases", () => {

        test("empty string content is handled appropriately", async ({ request }) => {
            await signin(request);

            const response = await sendMessage(request, testChatId, "");

            // Empty content should either be rejected (400) or accepted
            // depending on implementation requirements
            expect([201, 400]).toContain(response.status());
            
            if (response.status() === 201) {
                const body = await response.json();
                createdMessageIds.push(body.message.id);
            }
        });

        test("whitespace-only content is handled", async ({ request }) => {
            await signin(request);

            const response = await sendMessage(request, testChatId, "   \n\t   ");

            // Whitespace-only might be rejected or accepted
            expect([201, 400]).toContain(response.status());
            
            if (response.status() === 201) {
                const body = await response.json();
                createdMessageIds.push(body.message.id);
            }
        });

        test("can edit message to empty content", async ({ request }) => {
            await signin(request);

            // Create a message
            const sendResponse = await sendMessage(request, testChatId, "Will be edited to empty");
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Try to edit to empty
            const editResponse = await editMessage(request, testChatId, messageId, "");

            // Should either succeed or be rejected
            expect([204, 400]).toContain(editResponse.status());
        });

        test("cannot edit a deleted message", async ({ request }) => {
            await signin(request);

            // Create and delete a message
            const sendResponse = await sendMessage(request, testChatId, "Will be deleted then edited");
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            await deleteMessageViaApi(request, testChatId, messageId);

            // Try to edit the deleted message
            const editResponse = await editMessage(request, testChatId, messageId, "Trying to edit deleted");

            // Should fail - deleted messages shouldn't be editable
            // This depends on implementation - might return 404 or 403
            expect([403, 404]).toContain(editResponse.status());
        });

        test("cannot delete an already deleted message", async ({ request }) => {
            await signin(request);

            // Create and delete a message
            const sendResponse = await sendMessage(request, testChatId, "Will be deleted twice");
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // First delete
            const firstDelete = await deleteMessageViaApi(request, testChatId, messageId);
            expect(firstDelete.status()).toBe(204);

            // Second delete attempt
            const secondDelete = await deleteMessageViaApi(request, testChatId, messageId);

            // Should handle gracefully - could be 204 (idempotent) or 404
            expect([204, 404]).toContain(secondDelete.status());
        });

    });

    // ==================== CROSS-USER VISIBILITY TESTS ====================

    test.describe("Cross-user message visibility", () => {

        test("participant can see messages sent by other participant", async ({ request }) => {
            // Mod user sends a message
            await signin(request);
            const sendResponse = await sendMessage(request, testChatId, "Message from mod user");
            expect(sendResponse.status()).toBe(201);
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Verify message exists in database (visible to both users)
            const dbMessage = await db.select().from(messages).where(eq(messages.id, messageId));
            expect(dbMessage.length).toBe(1);
            expect(dbMessage[0].chatId).toBe(testChatId);
        });

        test("regular user can send messages in shared chat", async ({ request }) => {
            // Login as regular user
            await signin(request, process.env.REG_USER, process.env.REG_PASS);

            const response = await sendMessage(request, testChatId, "Message from regular user");

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.message.author).toBe(regUserId);
            createdMessageIds.push(body.message.id);
        });

    });

    // ==================== DATABASE CONSISTENCY TESTS ====================

    test.describe("Database consistency", () => {

        test("message creation updates database atomically", async ({ request }) => {
            await signin(request);

            const content = "Atomicity test message";
            const response = await sendMessage(request, testChatId, content);
            
            expect(response.status()).toBe(201);
            const body = await response.json();
            const messageId = body.message.id;
            createdMessageIds.push(messageId);

            // Verify all fields are set correctly
            const dbMessage = await db.select().from(messages).where(eq(messages.id, messageId));
            expect(dbMessage.length).toBe(1);
            expect(dbMessage[0].id).toBe(messageId);
            expect(dbMessage[0].content).toBe(content);
            expect(dbMessage[0].chatId).toBe(testChatId);
            expect(dbMessage[0].author).toBe(modUserId);
            expect(dbMessage[0].edited).toBe(false);
            expect(dbMessage[0].deleted).toBe(false);
            expect(dbMessage[0].editHistory).toEqual([]);
            expect(dbMessage[0].attachments).toEqual([]);
        });

        test("message edit updates only relevant fields", async ({ request }) => {
            await signin(request);

            // Create message
            const sendResponse = await sendMessage(request, testChatId, "Original content");
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Get original record
            const before = (await db.select().from(messages).where(eq(messages.id, messageId)))[0];

            // Edit message
            await editMessage(request, testChatId, messageId, "New content");

            // Get updated record
            const after = (await db.select().from(messages).where(eq(messages.id, messageId)))[0];

            // These should change
            expect(after.content).not.toBe(before.content);
            expect(after.edited).not.toBe(before.edited);
            expect(after.editHistory.length).toBeGreaterThan(before.editHistory.length);

            // These should NOT change
            expect(after.id).toBe(before.id);
            expect(after.chatId).toBe(before.chatId);
            expect(after.author).toBe(before.author);
            expect(after.deleted).toBe(before.deleted);
        });

        test("message deletion is a soft delete preserving data", async ({ request }) => {
            await signin(request);

            const content = "Content that should be preserved after soft delete";
            const sendResponse = await sendMessage(request, testChatId, content);
            const messageId = (await sendResponse.json()).message.id;
            createdMessageIds.push(messageId);

            // Delete the message
            await deleteMessageViaApi(request, testChatId, messageId);

            // Verify data is preserved
            const dbMessage = await db.select().from(messages).where(eq(messages.id, messageId));
            expect(dbMessage.length).toBe(1);
            expect(dbMessage[0].deleted).toBe(true);
            expect(dbMessage[0].content).toBe(content); // Content preserved
            expect(dbMessage[0].author).toBe(modUserId); // Author preserved
        });

    });

});
