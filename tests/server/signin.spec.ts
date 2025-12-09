import { test, expect } from "@playwright/test";
import { signin } from "./util"

test.describe("Signin endpoint test", () => {

    test("successful post request login", async ({ request }) => {

        // Login
        const response = await signin(request)

        expect(response.status()).toBe(200);

    });

    test("unsuccessful post request login", async ({ request }) => {

        // Login
        const response = await signin(request, "InvalidUser", "fakepassword")

        expect(response.status()).toBe(400);

    });
    
});