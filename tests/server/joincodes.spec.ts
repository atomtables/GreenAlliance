import { test, expect } from '@playwright/test';
import { signin } from './util';

test.describe("Join code endpoint tests", () => {

    test("lacking permissions (PUT)", async ({ request }) => {
        
        const response = await request.put('/api/users/joincodes', {
            data: { /* Data not needed */ }
        });

        expect(response.status()).toBe(403);

    });

    test("bad request (PUT)", async ({ request }) => {
        
        await signin(request);

        // Sign in with proper permissions
        const response = await request.put('/api/users/joincodes', {
            data: { /* Missing data */ }
        });

        expect(response.status()).toBe(400);

    });

    test("lacking permissions (DELETE)", async ({ request }) => {
        
        const response = await request.delete('/api/users/joincodes', {
            data: { /* Data not needed */ }
        });

        expect(response.status()).toBe(403);

    });

    test("bad request (DELETE)", async ({ request }) => {
        
        await signin(request);
        
        // Sign in with proper permissions
        const responseEmpty = await request.delete('/api/users/joincodes', {
            data: { /* Missing data */ }
        });

        expect(responseEmpty.status()).toBe(400);

        const responseBlank = await request.delete('/api/users/joincodes', {
            data: { joinCodes: [] }
        });

        expect(responseBlank.status()).toBe(400);

    });

    test("successful join code creation + deletion", async ({ request }) => {
        
        await signin(request);

        // Create join code
        const responseCreate = await request.put('/api/users/joincodes', {
            data: {
                firstName: "Test",
                lastName: "User",
                role: "Member",
                subteam: "All"
            }
        });

        expect(responseCreate.status()).toBe(201);

        const joinCode = (await responseCreate.json()).data.joinCode;
        expect(joinCode).toBeDefined();

        // Delete join code
        const responseDelete = await request.delete('/api/users/joincodes', {
            data: [ joinCode ]
        });

        expect(responseDelete.status()).toBe(200);

    });

});