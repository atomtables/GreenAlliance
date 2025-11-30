import { test, expect } from "@playwright/test";

test.describe("Signin endpoint test", () => {

    test("should redirect on successful login", async ({ page }) => {

        // Go to the signin page
        await page.goto("/account/signin");

        // Fill in form with standard user
        await page.fill("input[name='username']", process.env.ADMIN_USERNAME);
        await page.fill("input[name='password']", process.env.ADMIN_PASSWORD);

        // Submit form
        await page.click("button[type='submit']");

        // Expect redirect
        await expect(page).toHaveURL("/");

    });

    test("should give error on unsuccessful login attempt", async ({ page }) => {

        // Go to the signin page
        await page.goto("/account/signin");

        // Input invalid credentials
        await page.fill("input[name='username']", "invaliduser");
        await page.fill("input[name='password']", "fakepassword");

        // Submit the form
        await page.click("button[type='submit']");

        // Expect no redirect
        await expect(page).toHaveURL("/account/signin");

        // Expect error message
        await expect(page.locator("body")).toContainText("Incorrect username or password");

    })


    test("should give warning on mistyped username", async ({ page }) => {

        // Go to the signin page
        await page.goto("/account/signin");

        // Input invalid credentials
        await page.fill("input[name='username']", process.env.ADMIN_USERNAME.toUpperCase());
        await page.fill("input[name='password']", process.env.ADMIN_PASSWORD);

        // Submit form
        await page.click("button[type='submit']");

        // Expect no redirect
        await expect(page).toHaveURL("/account/signin");

        // Expect error message
        await expect(page.locator("body")).toContainText("Invalid username (min 3, max 31 characters, alphanumeric only)");

   });
});
