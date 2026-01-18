import { google } from 'googleapis';
import stream from 'stream';
import logger from '../../loaders/logger';

export class GoogleDriveService {
    private oauth2Client;
    private drive;

    constructor() {
        // Phase 6: Use OAuth 2.0 User Credentials (to bypass Service Account 0GB Quota)
        // See ADR-001 for details.

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            logger.warn('Google Drive OAuth credentials missing. Uploads will fail.');
            // Initialize with empty auth to prevent crash on startup, but methods will fail
            this.oauth2Client = new google.auth.OAuth2();
        } else {
            this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
            this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        }

        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    }

    /**
     * Upload a file to Google Drive and return the shareable web link
     * @param fileName Name of the file (e.g. "export_2024-01-01.csv")
     * @param buffer File content
     * @param mimeType MIME type (default text/csv)
     * @returns Object containing fileId and webViewLink
     */
    async uploadFile(fileName: string, buffer: Buffer, mimeType: string = 'text/csv'): Promise<{ fileId: string; webViewLink: string }> {
        try {
            // Ensure token is valid/refreshed
            // googleapis automatically refreshes access token if refresh_token is present

            const fileMetadata: any = {
                name: fileName,
            };

            // Support uploading to specific folder (Shared or Personal)
            if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
                fileMetadata.parents = [process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID];
            }

            const media = {
                mimeType,
                body: new stream.PassThrough().end(buffer),
            };

            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, webViewLink, webContentLink',
            });

            const fileId = response.data.id;
            const webViewLink = response.data.webViewLink;

            if (!fileId || !webViewLink) {
                throw new Error('Google Drive upload failed: No ID returned');
            }

            // Optional: Ensure permissions (User OAuth usually implies owner, but we can make it public/shared if needed)
            // For now, we rely on folder permissions.

            logger.info('File uploaded to Google Drive (OAuth)', { fileName, fileId });
            return { fileId, webViewLink };

        } catch (error) {
            logger.error('Failed to upload file to Google Drive', { error, fileName });
            throw error;
        }
    }

    /**
     * Get file metadata/URL by ID
     */
    async getFileUrl(fileId: string): Promise<string> {
        try {
            const response = await this.drive.files.get({
                fileId,
                fields: 'webViewLink',
            });

            if (!response.data.webViewLink) {
                throw new Error('File not found or no link available');
            }

            return response.data.webViewLink;
        } catch (error) {
            logger.error('Failed to get file URL', { error, fileId });
            throw error;
        }
    }
}
