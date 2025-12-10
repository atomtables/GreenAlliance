import { test } from "@playwright/test";
import { lackPerms, properPerms } from "./util";

test.describe("Calendar endpoint test", () => {

    test("lack of permissions", async ({ page }) => {
        // Sign in, go to url, expect redirect
        await lackPerms(page, "/meetings/calendar");
    });

    test("with proper permissions", async ({ page }) => {

        // Sign in, go to url, expect no redirect
        await properPerms(page, "/meetings/calendar");

    });

})
