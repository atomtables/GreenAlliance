import { test, expect } from "@playwright/test";
import { lackPerms, properPerms } from "./util";

test.describe("User list endpoint test", () => {

    test("lack of permissions", async ({ page }) => {
        // Sign in, go to url, expect redirect
        await lackPerms(page, "/users/list");
    });

    test("with proper permissions", async ({ page }) => {
        // Sign in, go to url, expect no redirect
        await properPerms(page, "/users/list");

        // Expect to get back db data (implement later)
    });

});
