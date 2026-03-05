import importService from "../services/importService.js";
import { cleanupFile } from "../utils/fileCleanUp.js";

export const importMainGroups = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await importService.processExcelFile(req.file.path, 'main_groups');

        // Clean up uploaded file
        await cleanupFile(req.file.path);

        res.json({
            message: 'Import completed',
            ...result
        });

    } catch (error) {
        if (req.file) await cleanupFile(req.file.path);
        next(error);
    }
};

export const importSubGroups = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await importService.processExcelFile(req.file.path, 'sub_groups');

        await cleanupFile(req.file.path);

        res.json({
            message: 'Import completed',
            ...result
        });

    } catch (error) {
        if (req.file) await cleanupFile(req.file.path);
        next(error);
    }
};

export const importLedgers = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await importService.processExcelFile(req.file.path, 'ledgers');

        await cleanupFile(req.file.path);

        res.json({
            message: 'Import completed',
            ...result
        });

    } catch (error) {
        if (req.file) await cleanupFile(req.file.path);
        next(error);
    }
};

export const importConnectConsolidates = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await importService.processExcelFile(req.file.path, 'connect_consolidates');

        await cleanupFile(req.file.path);

        res.json({
            message: 'Import completed',
            ...result
        });

    } catch (error) {
        if (req.file) await cleanupFile(req.file.path);
        next(error);
    }
};