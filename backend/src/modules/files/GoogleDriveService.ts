import { google } from 'googleapis';
import logger from '@loaders/logger';
import stream from 'stream';

export class GoogleDriveService {
    private drive;

    constructor() {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            logger.warn('GOOGLE_APPLICATION_CREDENTIALS not set. Google Drive Service will fail on operations.');
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        this.drive = google.drive({ version: 'v3', auth });
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
            const fileMetadata = {
                name: fileName,
                // Optional: parents: [folderId] if we add that to env later
            };

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

            // Ensure permissions allow anyone with link to view (optional, but robust for sharing)
            await this.drive.permissions.create({
                fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });

            logger.info('File uploaded to Google Drive', { fileName, fileId });
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
