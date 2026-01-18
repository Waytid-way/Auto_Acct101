// Global test setup
import { beforeAll, afterAll } from 'bun:test';

beforeAll(() => {
    // Setup code if needed
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test_db';
    process.env.NODE_ENV = 'test';
});

afterAll(() => {
    // Cleanup code if needed
});
