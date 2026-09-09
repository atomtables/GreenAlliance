import {expect, test} from "@playwright/test";
import {drizzle} from "drizzle-orm/node-postgres";
import {eq} from "drizzle-orm";
import {Pool} from "pg";
import {Permission} from "$lib/types/types";
import {chatParticipants, chats, messages, users} from "../../src/lib/server/db/schema";
import {lackPerms, properPerms, setAllUserPermissions, signin} from "./util";
import {signin as signinRequest} from "../server/util";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const createdChatIds: string[] = [];

type DbUser = {
    id: string;
    firstName: string;
    lastName: string;
    permissions: Permission[];
};

const createPerms = [
    Permission.message_create_with_adults,
    Permission.message_create_with_leads,
    Permission.message_create_with_anyone,
];

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getUser(username: string): Promise<DbUser> {
    const [user] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        permissions: users.permissions,
    }).from(users).where(eq(users.username, username));

    if (!user) {
        throw new Error(`Could not find user ${username}`);
    }

    return user as DbUser;
}

async function deleteChat(chatId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.chatId, chatId));
    await db.delete(chatParticipants).where(eq(chatParticipants.chatId, chatId));
    await db.delete(chats).where(eq(chats.id, chatId));
}

async function openPage(page, url = "/messages/chat") {
    await page.goto(url);
    // await expect(page.getByText("CHATS", { exact: true })).toBeVisible();
}

function sidebarChat(page, label: string) {
    return page.locator("button.grow").filter({hasText: new RegExp(escapeRegExp(label), "i")}).first();
}

function messageBubble(page, text: string) {
    return page.locator("[data-menu-container]").filter({hasText: text}).first();
}

async function openBaselineChat(page, otherUserLabel: string, canSend = true) {
    // Debug: log all text on the page
    const allText = await page.textContent('body');
    console.log(`Page content sample: ${allText?.substring(0, 500)}`);

    // Try to find any button with text
    const allButtons = await page.locator('button').count();
    console.log(`Total buttons on page: ${allButtons}`);

    const chat = sidebarChat(page, otherUserLabel);
    await expect(chat).toBeVisible({timeout: 15000});
    await chat.click();

    const composer = page.getByPlaceholder(
        canSend ? "Type a message..." : "You may not send messages in this chat."
    );
    await expect(composer).toBeVisible({timeout: 5000});
    return composer;
}

async function openNewChatDropdown(page) {
    await page.locator("button").filter({hasText: "add"}).first().click();
    await expect(page.getByRole("button", {name: "Direct Message"})).toBeVisible();
    await expect(page.getByPlaceholder("Search users...")).toBeVisible();
}

async function pickDropdownUser(page, index = 0) {
    const items = page.locator("[data-new-chat-dropdown]").getByRole("button").filter({
        has: page.locator('img[alt="avatar"]'),
    });

    await expect(items.nth(index)).toBeVisible();
    return items.nth(index);
}

test.afterAll(async () => {
    for (const chatId of createdChatIds) {
        try {
            await deleteChat(chatId);
        } catch {
            // ignore cleanup failures
        }
    }

    await pool.end();
});

test.describe("Chat page tests (/messages/chat)", () => {
    let modUser: DbUser;
    let regUser: DbUser;

    test.beforeAll(async ({request}) => {
        await signinRequest(request);

        [modUser, regUser] = await Promise.all([
            getUser(process.env.MOD_USER!),
            getUser(process.env.REG_USER!),
        ]);

        const response = await request.put("/api/messages", {
            multipart: {
                participantIds: regUser.id,
            },
        });

        if (response.ok()) {
            const body = await response.json();
            if (!body.existing) {
                createdChatIds.push(body.chat.id);
            }
        }
    });

    test.describe("Access control", () => {
        test("redirects users without message permission", async ({page}) => {
            await lackPerms(page, "/messages/chat");
        });

        test("loads for users with message permission", async ({page}) => {
            await properPerms(page, "/messages/chat");
        });

        test("redirects unauthenticated users away", async ({page}) => {
            await page.goto("/messages/chat");
            await expect(page).not.toHaveURL("/messages/chat");
        });
    });

    test.describe("Sidebar and permissions", () => {
        test("shows create-chat button only when allowed", async ({page}) => {
            console.log("Starting test: shows create-chat button only when allowed");

            const canCreate = regUser.permissions.some((perm) => createPerms.includes(perm));
            console.log(`Evaluated canCreate: ${canCreate}`);

            console.log("Attempting to sign in...");
            await signin(page, process.env.REG_USER, process.env.REG_PASS);
            console.log("Sign in successful");

            console.log("Opening page...");
            await openPage(page);
            console.log("Page opened");

            console.log("Locating 'add' button...");
            const addButton = page.locator("button").filter({hasText: "add"});

            if (canCreate) {
                console.log("User has create permissions. Verifying button is visible...");
                await expect(addButton).toBeVisible();
                console.log("Assertion passed: Button is visible.");
            } else {
                console.log("User lacks create permissions. Verifying button is not present...");
                await expect(addButton).toHaveCount(0);
                console.log("Assertion passed: Button is not present.");
            }

            console.log("Test completed successfully");
        });

        test("shows composer and upload controls based on permissions", async ({page}) => {
            const canSend = regUser.permissions.includes(Permission.message_send);
            const canUpload = regUser.permissions.includes(Permission.attachment_upload);
            const perms = regUser.permissions;
            if (!perms.includes(Permission.message)) {
                await setAllUserPermissions(process.env.REG_USER!, [...perms, Permission.message]);
            }

            await signin(page, process.env.REG_USER, process.env.REG_PASS);
            await openPage(page);
            await openBaselineChat(page, `${modUser.firstName} ${modUser.lastName}`, canSend);

            const composer = page.getByPlaceholder(
                canSend ? "Type a message..." : "You may not send messages in this chat."
            );
            await expect(composer).toBeVisible();
            if (canSend) {
                await expect(composer).not.toBeDisabled();
                await expect(page.getByRole("button", {name: "send"})).toBeVisible();
            } else {
                await expect(composer).toBeDisabled();
                await expect(page.getByRole("button", {name: "send"})).toHaveClass(/cursor-not-allowed/);
            }

            const attachButton = page.getByRole("button", {name: "attach_file"});
            if (canUpload) {
                await expect(attachButton).toBeVisible();
            } else {
                await expect(attachButton).toHaveCount(0);
            }

            if (!perms.includes(Permission.message)) {
                await setAllUserPermissions(process.env.REG_USER!, perms);
            }
        });

        test("shows header, empty state, and selected chat state", async ({page}) => {
            await signin(page);
            await openPage(page);

            await expect(page.getByText("CHATS", {exact: true})).toBeVisible();

            const chatsVisible = await page.locator("button.grow").count();
            const emptyState = await page.getByText("No chats available.").count();
            expect(chatsVisible > 0 || emptyState > 0).toBeTruthy();
        });
    });

    test.describe("New chat dropdown", () => {
        test("opens, filters, and closes cleanly", async ({page}) => {
            await signin(page);
            await openPage(page);

            await openNewChatDropdown(page);
            await expect(page.getByRole("button", {name: "Direct Message"})).toBeVisible();
            await expect(page.getByRole("button", {name: "Group Chat"})).toBeVisible();

            const search = page.getByPlaceholder("Search users...");
            await search.fill("__no_such_user__");
            await expect(page.getByText("No users found")).toBeVisible();

            await search.fill("");
            await expect(page.getByText("No users found")).not.toBeVisible();

            await page.locator("body").click({position: {x: 10, y: 10}});
            await expect(page.getByRole("button", {name: "Direct Message"})).not.toBeVisible();
        });

        test("defaults to direct message mode and can switch to group mode", async ({page}) => {
            await signin(page);
            await openPage(page);

            await openNewChatDropdown(page);
            await expect(page.getByPlaceholder("Group name (optional)...")).not.toBeVisible();

            await page.getByRole("button", {name: "Group Chat"}).click();
            await expect(page.getByPlaceholder("Group name (optional)...")).toBeVisible();
            await expect(page.getByRole("button", {name: /Create Group/i})).toBeDisabled();

            await page.getByRole("button", {name: "Direct Message"}).click();
            await expect(page.getByPlaceholder("Group name (optional)...")).not.toBeVisible();
            await expect(page.getByRole("button", {name: /Create Group/i})).toHaveCount(0);
        });
    });

    test.describe("Chat creation", () => {
        test("creates or opens a direct chat from the dropdown", async ({page}) => {
            await signin(page);
            await openPage(page);

            await openNewChatDropdown(page);
            const firstUser = await pickDropdownUser(page, 0);
            const otherUserName = (await firstUser.textContent())?.trim() ?? "";

            const [response] = await Promise.all([
                page.waitForResponse((res) => res.request().method() === "PUT" && res.url().endsWith("/api/messages")),
                firstUser.click(),
            ]);

            expect(response.ok()).toBeTruthy();

            await expect(page.getByPlaceholder("Search users...")).not.toBeVisible();
            await expect(page.getByPlaceholder("Type a message...")).toBeVisible({timeout: 5000});
            await expect(sidebarChat(page, otherUserName)).toBeVisible();
        });

        test("creates a group chat with selected members and a name", async ({page}) => {
            await signin(page);
            await openPage(page);

            await openNewChatDropdown(page);
            await page.getByRole("button", {name: "Group Chat"}).click();

            const usersList = page.locator("[data-new-chat-dropdown]").getByRole("button").filter({
                has: page.locator('img[alt="avatar"]'),
            });

            if ((await usersList.count()) < 2) {
                test.skip();
                return;
            }

            const groupName = `Playwright Group ${Date.now()}`;
            await page.getByPlaceholder("Group name (optional)...").fill(groupName);

            await usersList.nth(0).click();
            await usersList.nth(1).click();
            await expect(page.getByRole("button", {name: /Create Group/i})).toBeEnabled();

            const [response] = await Promise.all([
                page.waitForResponse((res) => res.request().method() === "PUT" && res.url().endsWith("/api/messages")),
                page.getByRole("button", {name: /Create Group/i}).click(),
            ]);

            expect(response.ok()).toBeTruthy();
            const body = await response.json();

            await expect(page.getByPlaceholder("Type a message...")).toBeVisible({timeout: 5000});
            if (!body.existing) {
                await expect(page.getByText(groupName).first()).toBeVisible();
            }
            await expect(page.getByRole("button", {name: "email"})).toHaveCount(0);
        });
    });

    test.describe("Messaging", () => {
        test("sends messages with Enter and clears the composer", async ({page}) => {
            const canSend = modUser.permissions.includes(Permission.message_send);
            test.skip(!canSend, "MOD_USER needs message_send for composer coverage");

            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            const composer = page.getByPlaceholder("Type a message...");
            const message = `Playwright message ${Date.now()}`;
            await composer.fill(message);
            await composer.press("Enter");

            await expect(page.getByText(message).first()).toBeVisible({timeout: 5000});
            await expect(composer).toHaveValue("");
            await expect(sidebarChat(page, `${regUser.firstName} ${regUser.lastName}`)).toContainText(message.slice(0, 30));
        });

        test("sends messages with the send button", async ({page}) => {
            const canSend = modUser.permissions.includes(Permission.message_send);
            test.skip(!canSend, "MOD_USER needs message_send for composer coverage");

            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            const composer = page.getByPlaceholder("Type a message...");
            const message = `Playwright send button ${Date.now()}`;
            await composer.fill(message);
            await page.getByRole("button", {name: "send"}).click();

            await expect(page.getByText(message).first()).toBeVisible({timeout: 5000});
            await expect(composer).toHaveValue("");
        });

        test("supports emoji insertion before sending", async ({page}) => {
            const canSend = modUser.permissions.includes(Permission.message_send);
            test.skip(!canSend, "MOD_USER needs message_send for composer coverage");

            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            const composer = page.getByPlaceholder("Type a message...");
            await page.getByRole("button", {name: "emoji_emotions"}).click();
            await page.getByRole("button", {name: "🙂"}).click();

            await expect(composer).toHaveValue(/🙂/);
            const message = `Emoji ${Date.now()} 🙂`;
            await composer.fill(message);
            await composer.press("Enter");
            await expect(page.getByText(message).first()).toBeVisible({timeout: 5000});
        });
    });

    test.describe("Attachments", () => {
        test("uploads attachments, renders pending chips, and lets them be removed", async ({page}) => {
            console.log("Starting test: uploads attachments, renders pending chips, and lets them be removed");

            const canUpload = modUser.permissions.includes(Permission.attachment_upload);
            const perms = modUser.permissions;
            console.log(`Evaluated canUpload: ${canUpload}`);

            if (!canUpload) {
                console.log("User lacks upload permission. Temporarily granting it...");
                await setAllUserPermissions(process.env!.MOD_USER, [...perms, Permission.attachment_upload]);
                console.log("Upload permission granted.");
            }

            console.log("Mocking upload endpoint to return 200 Success...");
            await page.route("**/upload/attachments", async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({url: "/uploads/playwright-attachment.txt"}),
                });
            });

            console.log("Signing in and navigating to baseline chat...");
            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            const fileInput = page.locator('input[type="file"]');
            console.log("Verifying attach file button is visible...");
            await expect(page.locator('button').filter({hasText: 'attach_file'})).toBeVisible();

            console.log("Setting input files (playwright-attachment.txt)...");
            await fileInput.setInputFiles({
                name: "playwright-attachment.txt",
                mimeType: "text/plain",
                buffer: Buffer.from("hello"),
            });

            console.log("Waiting for attachment chip to appear...");
            await expect(page.getByText("playwright-attachment.txt")).toBeVisible({timeout: 5000});

            console.log("Clicking '✕' button to remove attachment...");
            await page.getByRole("button", {name: "✕"}).click();

            console.log("Verifying attachment chip was removed...");
            await expect(page.getByText("playwright-attachment.txt")).toHaveCount(0);

            if (!canUpload) {
                console.log("Restoring original user permissions...");
                await setAllUserPermissions(process.env!.MOD_USER, perms);
            }

            console.log("Test completed successfully.");
        });

        test("surfaces attachment upload failures", async ({page}) => {
            console.log("Starting test: surfaces attachment upload failures");

            const canUpload = modUser.permissions.includes(Permission.attachment_upload);
            const perms = modUser.permissions;
            console.log(`Evaluated canUpload: ${canUpload}`);

            if (!canUpload) {
                console.log("User lacks upload permission. Temporarily granting it...");
                await setAllUserPermissions(process.env!.MOD_USER, [...perms, Permission.attachment_upload]);
                console.log("Upload permission granted.");
            }

            console.log("Mocking upload endpoint to return 500 Failure...");
            await page.route("**/upload/attachments", async (route) => {
                await route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({error: "Upload refused"}),
                });
            });

            console.log("Signing in and navigating to baseline chat...");
            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            console.log("Setting input files (broken.txt)...");
            await page.locator('input[type="file"]').setInputFiles({
                name: "broken.txt",
                mimeType: "text/plain",
                buffer: Buffer.from("broken"),
            });

            console.log("Waiting for broken.txt chip to appear...");
            await expect(page.getByText("broken.txt")).toBeVisible({timeout: 5000});

            console.log("Verifying 'Failed' text is visible...");
            await expect(page.getByText("Failed")).toBeVisible();

            if (!canUpload) {
                console.log("Restoring original user permissions...");
                await setAllUserPermissions(process.env!.MOD_USER, perms);
            }

            console.log("Test completed successfully.");
        });
    });

    test.describe("Message actions", () => {
        test("shows edit, delete, and report for own messages", async ({page}) => {
            const canSend = modUser.permissions.includes(Permission.message_send);
            test.skip(!canSend, "MOD_USER needs message_send for message action coverage");

            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            const message = `Action menu ${Date.now()}`;
            await page.getByPlaceholder("Type a message...").fill(message);
            await page.getByRole("button", {name: "send"}).click();
            await expect(page.getByText(message).first()).toBeVisible({timeout: 5000});

            const bubble = messageBubble(page, message);
            await bubble.hover();
            await bubble.getByRole("button", {name: "more_vert"}).click();

            await expect(page.getByRole("button", {name: "Edit", exact: true})).toBeVisible();
            await expect(page.getByRole("button", {name: "Delete", exact: true})).toBeVisible();
            await expect(page.getByRole("button", {name: "Report", exact: true})).toBeVisible();
        });

        test("edits a message and marks it as edited", async ({page}) => {
            const canSend = modUser.permissions.includes(Permission.message_send);
            test.skip(!canSend, "MOD_USER needs message_send for message action coverage");

            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            const original = `Edit me ${Date.now()}`;
            await page.getByPlaceholder("Type a message...").fill(original);
            await page.getByRole("button", {name: "send"}).click();
            await expect(page.getByText(original).first()).toBeVisible({timeout: 5000});

            const bubble = messageBubble(page, original);
            await bubble.hover();
            await bubble.getByRole("button", {name: "more_vert"}).click();
            await page.getByRole("button", {name: "Edit", exact: true}).click();

            const edited = `${original} updated`;
            await page.getByLabel("Edit message").fill(edited);
            await page.getByRole("button", {name: "OK"}).click();

            await expect(page.getByText(edited).first()).toBeVisible({timeout: 5000});
            await expect(page.getByText("Edited")).toBeVisible();
        });

        test("deletes a message after confirmation", async ({page}) => {
            const canSend = modUser.permissions.includes(Permission.message_send);
            test.skip(!canSend, "MOD_USER needs message_send for message action coverage");

            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            const message = `Delete me ${Date.now()}`;
            await page.getByPlaceholder("Type a message...").fill(message);
            await page.getByRole("button", {name: "send"}).click();
            await expect(page.getByText(message).first()).toBeVisible({timeout: 5000});

            const bubble = messageBubble(page, message);
            await bubble.hover();
            await bubble.getByRole("button", {name: "more_vert"}).click();
            await page.getByRole("button", {name: "Delete", exact: true}).click();
            await page.getByRole("button", {name: "Yes", exact: true}).click();

            await expect(page.getByText(message).first()).toHaveCount(0);
        });

        test("reports a message and shows a success toast", async ({page}) => {
            const canSend = modUser.permissions.includes(Permission.message_send);
            test.skip(!canSend, "MOD_USER needs message_send for message action coverage");

            await signin(page);
            await openPage(page);
            await openBaselineChat(page, `${regUser.firstName} ${regUser.lastName}`, true);

            const message = `Report me ${Date.now()}`;
            await page.getByPlaceholder("Type a message...").fill(message);
            await page.getByRole("button", {name: "send"}).click();
            await expect(page.getByText(message).first()).toBeVisible({timeout: 5000});

            const bubble = messageBubble(page, message);
            await bubble.hover();
            await bubble.getByRole("button", {name: "more_vert"}).click();
            await page.getByRole("button", {name: "Report", exact: true}).click();
            await page.getByRole("button", {name: "Yes"}).click();

            await expect(page.getByText("Message reported successfully")).toBeVisible();
        });
    });
});
