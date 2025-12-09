import { test, expect } from "@playwright/test";
import { lackPerms, properPerms } from "./util";

test.describe("Modify users endpoint test", () => {

    test("lack of permissions", async ({ page }) => {
        // Sign in, go to url, expect redirect
        await lackPerms(page, "/users/modify");
    });

    test("with proper permissions", async ({ page }) => {
        // Sign in, go to url, expect no redirect
        await properPerms(page, "/users/modify");

        // Expect to get back db data (implement later)
    });

});