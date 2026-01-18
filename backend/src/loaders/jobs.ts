import { DailyExportJob } from '../jobs/DailyExportJob';
import { TeablePollingJob } from '../jobs/TeablePollingJob'; // Import
import { ExpressExportService } from '../modules/export/ExpressExportService';
import { GoogleDriveService } from '../modules/files/GoogleDriveService';
import logger from './logger';

let dailyExportJob: DailyExportJob | null = null;
let teablePollingJob: TeablePollingJob | null = null; // Variable

/**
 * Initialize all scheduled jobs
 */
export function initializeJobs(): void {
    try {
        const exportService = new ExpressExportService();
        const googleDrive = new GoogleDriveService();

        dailyExportJob = new DailyExportJob(googleDrive);
        dailyExportJob.start();

        teablePollingJob = new TeablePollingJob(); // Initialize
        teablePollingJob.start();

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
    if (teablePollingJob) { // Stop
        teablePollingJob.stop();
    }

    logger.info('[Loader] All scheduled jobs stopped');
}
