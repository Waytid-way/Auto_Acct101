import { EventEmitter } from 'events';
import { SystemConfigModel } from '../models/SystemConfig';
import { ConfigVersionModel, IConfigVersion } from '../models/ConfigVersion';
import { ConfigAuditLogModel } from '../models/ConfigAuditLog';
import { ConfigValidator } from './ConfigValidator';

/**
 * ConfigService - Singleton service for system configuration management
 * Features: Caching, Versioning, Hot-Reload, Audit Trail
 */

interface CacheEntry {
    value: string;
    timestamp: number;
    ttl: number;
}

interface ConfigChangeEvent {
    key: string;
    oldValue: string | null;
    newValue: string;
    version: number;
    changedBy: string;
}

export class ConfigService extends EventEmitter {
    private static instance: ConfigService;
    private cache: Map<string, CacheEntry> = new Map();
    private validator: ConfigValidator;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Default configurations
    private readonly DEFAULTS: Record<string, string> = {
        'DAILY_EXPORT_TIME': '18:00',
        'AI_CONFIDENCE_THRESHOLD': '0.85',
        'MAX_BATCH_SIZE': '100',
        'IMMEDIATE_EXPORT_BUFFER': '30' // minutes
    };

    private constructor() {
        super();
        this.validator = new ConfigValidator();
        this.setupCacheInvalidation();
    }

    static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    /**
     * Setup cache invalidation on config changes
     */
    private setupCacheInvalidation(): void {
        this.on('config:changed', (event: ConfigChangeEvent) => {
            this.cache.delete(event.key);
            console.log(`🗑️  Cache invalidated for: ${event.key}`);
        });
    }

    /**
     * Get configuration value (with caching)
     */
    async get(key: string): Promise<string> {
        const normalizedKey = key.toUpperCase();

        // 1. Check cache
        const cached = this.cache.get(normalizedKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.value;
        }

        // 2. Query database
        const config = await SystemConfigModel.findOne({
            key: normalizedKey,
            isActive: true
        });

        // 3. Return value or default
        const value = config?.value ?? this.DEFAULTS[normalizedKey];

        if (!value) {
            // If no default exists, check if it's a known key anyway
            // But for now, just return empty string or error?
            // Better to return undefined or throw if strict.
            // Assuming keys are generally known.
            throw new Error(`Config key not found: ${normalizedKey}`);
        }

        // 4. Cache it
        this.cache.set(normalizedKey, {
            value,
            timestamp: Date.now(),
            ttl: this.CACHE_TTL
        });

        return value;
    }

    /**
     * Get all active configurations
     */
    async getAll(): Promise<Record<string, string>> {
        const configs = await SystemConfigModel.find({ isActive: true });
        const result: Record<string, string> = { ...this.DEFAULTS };

        // Overlay DB values
        for (const config of configs) {
            result[config.key] = config.value;
        }

        return result;
    }

    /**
     * Set configuration value (with versioning & validation)
     */
    async set(
        key: string,
        value: string,
        changedBy: string,
        reason?: string
    ): Promise<{ success: boolean; version?: number; error?: string; warning?: string }> {
        const normalizedKey = key.toUpperCase();

        // 1. Validate
        const validation = this.validator.validate(normalizedKey, value);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // 2. Get current config
        const currentConfig = await SystemConfigModel.findOne({
            key: normalizedKey,
            isActive: true
        });

        const oldValue = currentConfig?.value ?? null;
        const newVersion = (currentConfig?.version ?? 0) + 1;

        // 3. Create audit log (pending)
        const auditLog = await ConfigAuditLogModel.create({
            key: normalizedKey,
            action: 'set',
            oldValue,
            newValue: value,
            version: newVersion,
            status: 'pending',
            changedBy,
            reason: reason ?? 'No reason provided'
        });

        try {
            // 4. Create version history
            await ConfigVersionModel.create({
                key: normalizedKey,
                value,
                version: newVersion,
                isActive: false,
                updatedBy: changedBy,
                reason
            });

            // 5. Update or create main config
            await SystemConfigModel.findOneAndUpdate(
                { key: normalizedKey },
                {
                    key: normalizedKey,
                    value,
                    version: newVersion,
                    isActive: true,
                    updatedBy: changedBy
                },
                { upsert: true, new: true }
            );

            // 6. Mark audit log as success
            auditLog.status = 'success';
            await auditLog.save();

            // 7. Emit event (for hot-reload)
            this.emit('config:changed', {
                key: normalizedKey,
                oldValue,
                newValue: value,
                version: newVersion,
                changedBy
            } as ConfigChangeEvent);

            console.log(`✅ Config updated: ${normalizedKey} = ${value} (v${newVersion})`);

            return {
                success: true,
                version: newVersion,
                warning: validation.warning
            };
        } catch (error: any) {
            // Rollback - mark audit log as failed
            auditLog.status = 'failed';
            auditLog.error = error.message;
            await auditLog.save();

            console.error(`❌ Failed to set config ${normalizedKey}:`, error);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Rollback to specific version
     */
    async rollback(
        key: string,
        toVersion: number,
        changedBy: string
    ): Promise<{ success: boolean; error?: string }> {
        const normalizedKey = key.toUpperCase();

        // 1. Find target version
        const targetVersion = await ConfigVersionModel.findOne({
            key: normalizedKey,
            version: toVersion
        });

        if (!targetVersion) {
            return {
                success: false,
                error: `Version ${toVersion} not found for key ${normalizedKey}`
            };
        }

        // 2. Get current value
        const currentConfig = await SystemConfigModel.findOne({
            key: normalizedKey,
            isActive: true
        });

        const oldValue = currentConfig?.value ?? null;

        // 3. Create audit log
        const auditLog = await ConfigAuditLogModel.create({
            key: normalizedKey,
            action: 'rollback',
            oldValue,
            newValue: targetVersion.value,
            version: toVersion,
            status: 'pending',
            changedBy,
            reason: `Rollback to version ${toVersion}`
        });

        try {
            // 4. Update main config to target version
            await SystemConfigModel.findOneAndUpdate(
                { key: normalizedKey },
                {
                    key: normalizedKey,
                    value: targetVersion.value,
                    version: toVersion,
                    isActive: true,
                    updatedBy: changedBy
                },
                { upsert: true }
            );

            // 5. Mark audit log as success
            auditLog.status = 'success';
            await auditLog.save();

            // 6. Emit event
            this.emit('config:changed', {
                key: normalizedKey,
                oldValue,
                newValue: targetVersion.value,
                version: toVersion,
                changedBy
            } as ConfigChangeEvent);

            console.log(`↩️  Rolled back ${normalizedKey} to version ${toVersion}`);

            return { success: true };
        } catch (error: any) {
            auditLog.status = 'failed';
            auditLog.error = error.message;
            await auditLog.save();

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Reset to default value
     */
    async reset(key: string, changedBy: string): Promise<{ success: boolean; error?: string }> {
        const normalizedKey = key.toUpperCase();
        const defaultValue = this.DEFAULTS[normalizedKey];

        if (!defaultValue) {
            return {
                success: false,
                error: `No default value defined for ${normalizedKey}`
            };
        }

        return this.set(normalizedKey, defaultValue, changedBy, 'Reset to default');
    }

    /**
     * Get version history for a key
     */
    async getHistory(key: string, limit: number = 10): Promise<IConfigVersion[]> {
        return ConfigVersionModel.find({ key: key.toUpperCase() })
            .sort({ version: -1 })
            .limit(limit)
            .lean() as unknown as IConfigVersion[];
    }

    /**
     * Get audit logs for a key
     */
    async getAuditLogs(key: string, limit: number = 20): Promise<any[]> {
        return ConfigAuditLogModel.find({ key: key.toUpperCase() })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }

    /**
     * Initialize default configs on first run
     */
    async initialize(): Promise<void> {
        console.log('🔧 Initializing ConfigService...');

        for (const [key, value] of Object.entries(this.DEFAULTS)) {
            const exists = await SystemConfigModel.findOne({ key });
            if (!exists) {
                await SystemConfigModel.create({
                    key,
                    value,
                    version: 1,
                    isActive: true,
                    updatedBy: 'system',
                    description: this.getDescription(key)
                });
                console.log(`✅ Initialized default: ${key} = ${value}`);
            }
        }

        console.log('✅ ConfigService initialized');
    }

    private getDescription(key: string): string {
        const descriptions: Record<string, string> = {
            'DAILY_EXPORT_TIME': 'Time for daily batch export (HH:MM)',
            'AI_CONFIDENCE_THRESHOLD': 'Minimum confidence score (0.0-1.0) to auto-approve',
            'MAX_BATCH_SIZE': 'Maximum number of records per export batch',
            'IMMEDIATE_EXPORT_BUFFER': 'Buffer time in minutes for immediate export processing'
        };
        return descriptions[key] || 'System configuration';
    }
}

// Export Singleton Instance
export const configService = ConfigService.getInstance();
