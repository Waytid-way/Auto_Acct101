import crypto from 'crypto';
import config from '@config/env';

export class EncryptionService {
    private algorithm = config.ENCRYPTION_ALGORITHM; // aes-256-gcm
    private key: Buffer;

    // Create a default 32-byte key if one isn't provided (FOR DEVELOPMENT ONLY)
    // In production, Zod validation ensures a strong key is provided via env
    private defaultKey = Buffer.alloc(32, '0');

    private ivLength = config.ENCRYPTION_IV_LENGTH; // 16

    constructor() {
        if (config.ENCRYPTION_KEY) {
            if (config.ENCRYPTION_KEY.length !== 64 && config.ENCRYPTION_KEY.length !== 32) {
                // Assuming hex string input for 32-byte key (64 hex chars) or direct 32 chars
                // For simplicity here, we'll try to handle hex or raw
                try {
                    this.key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
                    if (this.key.length !== 32) {
                        // Fallback if not valid hex or wrong length, blindly use as utf8 buffer slice
                        this.key = Buffer.from(config.ENCRYPTION_KEY).subarray(0, 32);
                    }
                } catch (e) {
                    this.key = Buffer.from(config.ENCRYPTION_KEY).subarray(0, 32);
                }
            } else if (config.ENCRYPTION_KEY.length === 64) {
                this.key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
            } else {
                this.key = Buffer.from(config.ENCRYPTION_KEY);
            }
        } else {
            console.warn('⚠️ No ENCRYPTION_KEY provided. Using default zero-filled key. DO NOT USE IN PRODUCTION.');
            this.key = this.defaultKey;
        }
    }

    /**
     * Encrypt sensitive data (OAuth tokens, passwords)
     * Returns: base64(iv + authTag + encrypted)
     */
    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Combine: iv + authTag + encrypted
        const combined = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, 'hex'),
        ]);

        return combined.toString('base64');
    }

    /**
     * Decrypt data encrypted by encrypt()
     */
    decrypt(ciphertext: string): string {
        const combined = Buffer.from(ciphertext, 'base64');

        const iv = combined.subarray(0, this.ivLength);
        const authTag = combined.subarray(this.ivLength, this.ivLength + 16);
        const encrypted = combined.subarray(this.ivLength + 16);

        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}
