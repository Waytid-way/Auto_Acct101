import { Router } from 'express';
import { ExportController } from './ExportController';

const router = Router();
const controller = new ExportController();

router.get('/csv', controller.exportCSV.bind(controller));

export default router;
