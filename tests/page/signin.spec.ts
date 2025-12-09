import { test, expect } from "@playwright/test";
import { signin } from "./util";

test.describe("Signin page endpoint test", () => {

    test("should redirect on successful login", async ({ page }) => {

        await signin(page);

        // Expect redirect
        await expect(page).toHaveURL("/");

    });

    test("should give error on unsuccessful login attempt", async ({ page }) => {

        await signin(page, "invaliduser", "fakepassword");

        // Expect no redirect
        await expect(page).toHaveURL("/account/signin");

        // Expect error message
        await expect(page.locator("body")).toContainText("Incorrect username or password");

    })


    test("should give warning on mistyped username", async ({ page }) => {

        await signin(page, process.env.MOD_USER.toUpperCase());

        // Expect no redirect
        await expect(page).toHaveURL("/account/signin");

        // Expect error message
        await expect(page.locator("body")).toContainText("Invalid username (min 3, max 31 characters, alphanumeric only)");

   });
});
