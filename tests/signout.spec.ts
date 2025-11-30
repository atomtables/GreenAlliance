import { test, expect } from "@playwright/test";

test.describe("Sign out endpoint tests", () => {

    test("successful sign out", async ({ page }) => {

        // Go to sign in
        await page.goto("/account/signin");

        // Correctly fill form
        await page.fill("input[name='username']", process.env.ADMIN_USERNAME);
        await page.fill("input[name='password']", process.env.ADMIN_PASSWORD);

        // Sign in
        await page.click("button[type='submit']");

        // Go to page
        await page.goto("/account/logout");

        // Expect redirect
        await expect(page).toHaveURL("/")

    });

});
