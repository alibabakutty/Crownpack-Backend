import exceljs from "exceljs";
import fs from "fs";
import pool from "../config/database.js";

export const importMainGroups = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
            return res.status(400).json({ error: 'No worksheet found in the Excel file' });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        const rows = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) {
                rows.push({ row, rowNumber });
            }
        });

        for (const { row, rowNumber } of rows) {
            const main_group_code = row.getCell(1).value?.toString() || null;
            const main_group_name = row.getCell(2).value?.toString();
            const tally_report = row.getCell(3).value?.toString() || null;
            const sub_report = row.getCell(4).value?.toString() || null;
            const debit_credit = row.getCell(5).value?.toString() || null;
            const trial_balance = row.getCell(6).value?.toString() || null;
            const status = row.getCell(7).value?.toString() || 'Active';

            if (!main_group_name) {
                errors.push(`Row ${rowNumber}: Main Group Name is required`);
                errorCount++;
                continue;
            }

            const query = `INSERT INTO main_groups (main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status) 
                          VALUES (?, ?, ?, ?, ?, ?, ?) 
                          ON DUPLICATE KEY UPDATE 
                          main_group_code = VALUES(main_group_code), 
                          tally_report = VALUES(tally_report), 
                          sub_report = VALUES(sub_report),
                          debit_credit = VALUES(debit_credit),
                          trial_balance = VALUES(trial_balance),
                          status = VALUES(status)`;

            try {
                await pool.execute(query, [main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status]);
                successCount++;
            } catch (err) {
                errors.push(`Row ${rowNumber}: ${err.message}`);
                errorCount++;
            }
        }

        fs.unlinkSync(req.file.path);

        res.json({
            message: 'Import completed',
            successCount,
            errorCount,
            errors: errors.slice(0, 10)
        });

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
};

// Similar functions for subGroups, ledgers, connectConsolidates...
// (Copy the remaining import functions here)