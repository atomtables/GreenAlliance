import { test, expect } from "@playwright/test";

test.describe("Signin endpoint test", () => {

    test("successful post request login", async ({ request }) => {

        // Login
        const response = await request.post("/account/signin", {
            data: {
                username: process.env.MOD_USER,
                password: process.env.MOD_PASS
            }
        });

        expect(response.status()).toBe(200);

    })
    
});