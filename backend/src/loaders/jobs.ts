import { DailyExportJob } from '../jobs/DailyExportJob';
import { ExpressExportService } from '../modules/export/ExpressExportService';
import { GoogleDriveService } from '../modules/files/GoogleDriveService';
import logger from './logger';

let dailyExportJob: DailyExportJob | null = null;

/**
 * Initialize all scheduled jobs
 */
export function initializeJobs(): void {
    try {
        const exportService = new ExpressExportService();
        const googleDrive = new GoogleDriveService();

        dailyExportJob = new DailyExportJob(exportService, googleDrive);
        dailyExportJob.start();

        logger.info('[Loader] All scheduled jobs initialized');
    } catch (error: any) {
        logger.error('[Loader] Failed to initialize jobs:', error);
        throw error;
    }
}

/**
 * Gracefully shutdown jobs
 */
export function shutdownJobs(): void {
    if (dailyExportJob) {
        dailyExportJob.stop();
    }

    logger.info('[Loader] All scheduled jobs stopped');
}
