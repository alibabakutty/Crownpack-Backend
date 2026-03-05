import pool from "../config/database.js";
import exceljs from "exceljs";
import {
    validateMainGroupRow,
    validateSubGroupRow,
    validateLedgerRow,
    validateConnectConsolidateRow
} from "../utils/excelValidator.js";

class ImportService {
    async processExcelFile(filePath, tableName) {
        const workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet) {
            throw new Error('No worksheet found in the Excel file');
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
            try {
                let validation;
                let query;
                let params;

                switch (tableName) {
                    case 'main_groups':
                        validation = validateMainGroupRow(row, rowNumber);
                        if (validation.isValid) {
                            query = `INSERT INTO main_groups (main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE 
                                   main_group_code = VALUES(main_group_code), 
                                   tally_report = VALUES(tally_report), 
                                   sub_report = VALUES(sub_report),
                                   debit_credit = VALUES(debit_credit),
                                   trial_balance = VALUES(trial_balance),
                                   status = VALUES(status)`;
                            params = [
                                validation.data.main_group_code,
                                validation.data.main_group_name,
                                validation.data.tally_report,
                                validation.data.sub_report,
                                validation.data.debit_credit,
                                validation.data.trial_balance,
                                validation.data.status
                            ];
                        }
                        break;

                    case 'sub_groups':
                        validation = validateSubGroupRow(row, rowNumber);
                        if (validation.isValid) {
                            query = `INSERT INTO sub_groups (sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE 
                                   sub_group_code = VALUES(sub_group_code), 
                                   tally_report = VALUES(tally_report),
                                   sub_report = VALUES(sub_report),
                                   debit_credit = VALUES(debit_credit),
                                   trial_balance = VALUES(trial_balance), 
                                   status = VALUES(status)`;
                            params = [
                                validation.data.sub_group_code,
                                validation.data.sub_group_name,
                                validation.data.tally_report,
                                validation.data.sub_report,
                                validation.data.debit_credit,
                                validation.data.trial_balance,
                                validation.data.status
                            ];
                        }
                        break;

                    case 'ledgers':
                        validation = validateLedgerRow(row, rowNumber);
                        if (validation.isValid) {
                            query = `INSERT INTO ledgers (ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE 
                                   ledger_code = VALUES(ledger_code), 
                                   tally_report = VALUES(tally_report),
                                   debit_credit = VALUES(debit_credit),
                                   trial_balance = VALUES(trial_balance), 
                                   status = VALUES(status),
                                   link_status = VALUES(link_status)`;
                            params = [
                                validation.data.ledger_code,
                                validation.data.ledger_name,
                                validation.data.tally_report,
                                validation.data.debit_credit,
                                validation.data.trial_balance,
                                validation.data.status,
                                validation.data.link_status
                            ];
                        }
                        break;

                    case 'connect_consolidates':
                        validation = validateConnectConsolidateRow(row, rowNumber);
                        if (validation.isValid) {
                            query = `INSERT INTO connect_consolidates (serial_no, ledger_code, sub_group_code, main_group_code, status) 
                                   VALUES (?, ?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE 
                                   serial_no = VALUES(serial_no),
                                   ledger_code = VALUES(ledger_code),
                                   sub_group_code = VALUES(sub_group_code),
                                   main_group_code = VALUES(main_group_code),
                                   status = VALUES(status)`;
                            params = [
                                validation.data.serial_no,
                                validation.data.ledger_code,
                                validation.data.sub_group_code,
                                validation.data.main_group_code,
                                validation.data.status
                            ];
                        }
                        break;

                    default:
                        throw new Error(`Unknown table: ${tableName}`);
                }

                if (!validation.isValid) {
                    errors.push(...validation.errors);
                    errorCount++;
                    continue;
                }

                await pool.execute(query, params);
                successCount++;

            } catch (err) {
                errors.push(`Row ${rowNumber}: ${err.message}`);
                errorCount++;
            }
        }

        return {
            successCount,
            errorCount,
            errors: errors.slice(0, 20) // Return first 20 errors
        };
    }
}

export default new ImportService();