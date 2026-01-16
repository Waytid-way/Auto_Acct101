import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { FlowAccountOAuthService } from '@modules/flowaccount/FlowAccountOAuthService';
import { connectMongoDB, disconnectMongoDB } from '@loaders/mongoose';
import config from '@config/env';

// Mock config for testing if needed, but we rely on validation.
// For integration tests, we expect the env vars to be present or we skip/fail.

let oauthService: FlowAccountOAuthService;

beforeAll(async () => {
    // We need DB connection for token storage tests, 
    // though getAuthorizationURL doesn't need it.
    await connectMongoDB();
    oauthService = new FlowAccountOAuthService();
});

afterAll(async () => {
    await disconnectMongoDB();
});

describe('FlowAccount OAuth', () => {
    test('generates authorization URL with correct parameters', () => {
        // Generate a random state
        const state = 'test-state-123';
        const url = oauthService.getAuthorizationURL(state);

        // Parse the URL to verify params
        const parsedUrl = new URL(url);

        expect(parsedUrl.origin).toBe('https://openapi.flowaccount.com');
        expect(parsedUrl.pathname).toBe('/oauth/authorize');
        expect(parsedUrl.searchParams.get('client_id')).toBe(config.FLOWACCOUNT_CLIENT_ID);
        expect(parsedUrl.searchParams.get('redirect_uri')).toBe(config.FLOWACCOUNT_REDIRECT_URI);
        expect(parsedUrl.searchParams.get('response_type')).toBe('code');
        expect(parsedUrl.searchParams.get('state')).toBe(state);
        expect(parsedUrl.searchParams.get('scope')).toContain('document.read');
    });

    // Note: We cannot easily test exchangeCodeForToken without a real code from FlowAccount
    // or extensive mocking of axios. For this phase, verifying the URL generation 
    // and the Service structure is a good start. 
    // In a real scenario, we would mock axios to return a fake token and verify encryption.
});
