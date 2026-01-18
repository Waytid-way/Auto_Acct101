#!/usr/bin/env bun
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as readline from 'readline';

async function main() {
    console.log('๐” Google Drive OAuth Setup');
    console.log('โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€');
    console.log('This script will help you generate a Refresh Token for Google Drive Access.\n');

    // 1. Check for required env vars (User must have set these first)
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback';

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('โ Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
        console.log('Please create OAuth 2.0 Credentials in Google Cloud Console first.');
        process.exit(1);
    }

    // 2. Initialize OAuth Client
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    // 3. Generate Auth URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Critical: asks for refresh token
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent' // Force approval to ensure refresh token is returned
    });

    console.log('1. Visit this URL to authorize the app (Login with your Personal Gmail):\n');
    console.log(authUrl);
    console.log('\n2. After authorizing, you will be redirected to an error page (localhost).');
    console.log('   Check the URL bar for a code parameter: ?code=4/0A...');
    console.log('   Copy the ENTIRE Value of the "code" parameter.');
    console.log('\n3. Paste the code below:');

    // 4. Get Code from User
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const code = await new Promise<string>((resolve) => {
        rl.question('> ', (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });

    try {
        console.log('\n๐“ฅ Exchanging code for tokens...');
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\nโ… Success! Here is your Refresh Token:');
        console.log('โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€');
        console.log('\nCopy the line above into your .env file.');
        console.log('You can now use this token to upload files via the backend.');

    } catch (error: any) {
        console.error('\nโ Error exchanging code for token:', error.response?.data || error.message);
    }
}

main().catch(console.error);
