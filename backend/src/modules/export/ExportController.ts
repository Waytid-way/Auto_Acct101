import { Request, Response, NextFunction } from 'express';
import { ExportService } from './ExportService';

const service = new ExportService();

export class ExportController {
    async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { clientId, startDate, endDate } = req.query;

            if (!clientId || !startDate || !endDate) {
                res.status(400).json({
                    error: 'BadRequest',
                    message: 'clientId, startDate, endDate required',
                });
                return;
            }

            const buffer = await service.exportClientEntries(
                clientId as string,
                new Date(startDate as string),
                new Date(endDate as string)
            );

            const fileName = `express_export_${clientId}_${Date.now()}.csv`;

            // Important: UTF-8 with BOM requires charset=utf-8
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(buffer);
        } catch (error) {
            next(error);
        }
    }
}
