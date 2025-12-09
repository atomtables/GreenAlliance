import { test, expect } from '@playwright/test';
import { signin, successfulMeetingPut } from './util';

test.describe("Meeting endpoint tests", () => {

    test("insufficient permissions (PUT)", async ({ request }) => {
        
        // Make request without proper permissions
        const response = await request.put('/api/meetings', {
            data: {
                title: "Test Meeting",
                date: new Date().toISOString()
            }
        });

        expect(response.status()).toBe(403);

    });

    test("bad request (PUT)", async ({ request, storageState }) => {
        
        await signin(request);
        
        // Sign in with proper permissions
        const response = await request.put('/api/meetings', {
            data: {
                date: new Date().toISOString()
            }
        });

        expect(response.status()).toBe(400);

    });

    test("insufficient permissions (DELETE)", async ({ request }) => {
        
        // Make request without proper permissions
        const response = await request.delete('/api/meetings', {
            data: { /* meetingId not needed */  }
        });

        expect(response.status()).toBe(403);

    });

    test("bad request (DELETE)", async ({ request }) => {
        
        await signin(request);
        
        // Sign in with proper permissions
        const response = await request.delete('/api/meetings', {
            data: { /* missing meetingId */ }
        });

        expect(response.status()).toBe(400);

    });

    test("successful meeting creation + deletion", async ({ request }) => {

        // Sign in and create a meeting to delete
        await signin(request);

        const responseCreate = await successfulMeetingPut(request);

        expect(responseCreate.status()).toBe(201);

        const meetingId = (await responseCreate.json()).data.id;
        expect(meetingId).toBeDefined();
        const responseDelete = await request.delete('/api/meetings', {
            data: { meetingId }
        });

        expect(responseDelete.status()).toBe(200);

    });
});
