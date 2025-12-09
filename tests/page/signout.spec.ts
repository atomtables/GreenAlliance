import { test, expect } from "@playwright/test";
import { signin } from "./util";

test.describe("Sign out endpoint tests", () => {

    test("successful sign out", async ({ page }) => {

        await signin(page);

        // Go to page
        await page.goto("/account/logout");

        // Expect redirect
        await expect(page).toHaveURL("/")

    });

});
