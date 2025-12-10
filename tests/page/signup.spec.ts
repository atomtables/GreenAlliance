import { test, expect } from "@playwright/test";

test.describe("Signup endpoint tests", () => {
    
    test("invalid join code", async ({ page }) => {

        // Go to page
        await page.goto("/account/signup");

        // Inject invalid join code
        await page.fill("input[name='fname']", "John");
        await page.fill("input[name='lname']", "Doe");
        await page.fill("input[name='jcode']", "ThisIsAnInvalidJoinCode");

        // Submit form
        await page.click("button[type='submit']")

        // Expect no redirect
        await expect(page).toHaveURL("/account/signup");

        // Expect error message
        await expect(page.locator("body")).toContainText("Please enter a valid join code as given to you by your team administrators.");

    });

});
