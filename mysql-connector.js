import express from "express";
import mysql from "mysql2";
import cors from "cors";
import multer from "multer";
import exceljs from "exceljs";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed!'), false);
        }
    }
});

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Rup@@.123$',
    database: 'crownpack_database'
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database connection failed:", err);
    } else {
        console.log("✅ Connected to MySQL Database");
    }
});

// Create uploads directory if not exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Import route for main_groups (with latpl column)
app.post("/import/main-groups", upload.single('file'), async (req, res) => {
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

        // Get all rows as array for better async handling
        const rows = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) { // Skip header row
                rows.push({ row, rowNumber });
            }
        });

        // Process each row
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
                await db.promise().execute(query, [main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status]);
                successCount++;
            } catch (err) {
                errors.push(`Row ${rowNumber}: ${err.message}`);
                errorCount++;
            }
        }

        // Clean up uploaded file
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
});

// Import route for sub_groups
app.post("/import/sub-groups", upload.single('file'), async (req, res) => {
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
            const sub_group_code = row.getCell(1).value?.toString() || null;
            const sub_group_name = row.getCell(2).value?.toString();
            const tally_report = row.getCell(3).value?.toString() || null;
             const sub_report = row.getCell(4).value?.toString() || null;
            const debit_credit = row.getCell(5).value?.toString() || null;
            const trial_balance = row.getCell(6).value?.toString() || null;
            const status = row.getCell(7).value?.toString() || 'Active';

            if (!sub_group_name) {
                errors.push(`Row ${rowNumber}: Sub Group Name is required`);
                errorCount++;
                continue;
            }

            const query = `INSERT INTO sub_groups (sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status) 
                          VALUES (?, ?, ?, ?, ?, ?, ?) 
                          ON DUPLICATE KEY UPDATE 
                          sub_group_code = VALUES(sub_group_code), 
                          tally_report = VALUES(tally_report),
                          sub_report = VALUES(sub_report),
                          debit_credit = VALUES(debit_credit),
                          trial_balance = VALUES(trial_balance), 
                          status = VALUES(status)`;
            
            try {
                await db.promise().execute(query, [sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status]);
                successCount++;
            } catch (err) {
                errors.push(`Row ${rowNumber}: ${err.message}`);
                errorCount++;
            }
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import completed', successCount, errorCount, errors });

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// Import route for ledgers
app.post("/import/ledgers", upload.single('file'), async (req, res) => {
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
            const ledger_code = row.getCell(1).value?.toString() || null;
            const ledger_name = row.getCell(2).value?.toString();
            const tally_report = row.getCell(3).value?.toString() || null;
            const debit_credit = row.getCell(4).value?.toString() || null;
            const trial_balance = row.getCell(5).value?.toString() || null;
            const status = row.getCell(6).value?.toString() || 'Active';
            const link_status = row.getCell(7).value?.toString() || null;

            if (!ledger_name) {
                errors.push(`Row ${rowNumber}: Ledger Name is required`);
                errorCount++;
                continue;
            }

            const query = `INSERT INTO ledgers (ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status) 
                          VALUES (?, ?, ?, ?, ?, ?, ?) 
                          ON DUPLICATE KEY UPDATE 
                          ledger_code = VALUES(ledger_code), 
                          tally_report = VALUES(tally_report),
                          debit_credit = VALUES(debit_credit),
                          trial_balance = VALUES(trial_balance), 
                          status = VALUES(status),
                          link_status = VALUES(link_status)`;
            
            try {
                await db.promise().execute(query, [ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status]);
                successCount++;
            } catch (err) {
                errors.push(`Row ${rowNumber}: ${err.message}`);
                errorCount++;
            }
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import completed', successCount, errorCount, errors });

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// Import route for divisions
app.post("/import/divisions", upload.single('file'), async (req, res) => {
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
            const division_code = row.getCell(1).value?.toString() || null;
            const division_name = row.getCell(2).value?.toString();
            const report = row.getCell(3).value?.toString() || null;
            const status = row.getCell(4).value?.toString() || 'Active';

            if (!division_name) {
                errors.push(`Row ${rowNumber}: Division Name is required`);
                errorCount++;
                continue;
            }

            const query = `INSERT INTO divisions (division_code, division_name, report, status) 
                          VALUES (?, ?, ?, ?) 
                          ON DUPLICATE KEY UPDATE 
                          division_code = VALUES(division_code), 
                          report = VALUES(report), 
                          status = VALUES(status)`;
            
            try {
                await db.promise().execute(query, [division_code, division_name, report, status]);
                successCount++;
            } catch (err) {
                errors.push(`Row ${rowNumber}: ${err.message}`);
                errorCount++;
            }
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import completed', successCount, errorCount, errors });

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// Download template endpoints
app.get("/download-template/:type", async (req, res) => {
    try {
        const { type } = req.params;
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Template');
        
        let headers = [];
        let sampleData = [];
        let fileName = '';

        switch (type) {
            case 'main-groups':
                headers = ['main_group_code', 'main_group_name', 'latpl', 'report', 'status'];
                sampleData = ['MG001', 'Current Assets', 'LATPL001', 'Balance Sheet', 'Active'];
                fileName = 'main_groups_template.xlsx';
                break;
                
            case 'sub-groups':
                headers = ['sub_group_code', 'sub_group_name', 'report', 'status'];
                sampleData = ['SG001', 'Bank Accounts', 'Profit & Loss', 'Active'];
                fileName = 'sub_groups_template.xlsx';
                break;
                
            case 'ledgers':
                headers = ['ledger_code', 'ledger_name', 'report', 'status', 'link_status'];
                sampleData = ['L001', 'HDFC Bank', 'Trial Balance', 'Active', 'Linked'];
                fileName = 'ledgers_template.xlsx';
                break;
                
            case 'divisions':
                headers = ['division_code', 'division_name', 'report', 'status'];
                sampleData = ['D001', 'Manufacturing Division', 'Division Report', 'Active'];
                fileName = 'divisions_template.xlsx';
                break;
                
            case 'connect-consolidates':
                headers = ['serial_no', 'ledger_code', 'ledger_name', 'sub_group_code', 'sub_group_name', 'main_group_code', 'main_group_name'];
                sampleData = [1, 'L001', 'HDFC Bank', 'SG001', 'Bank Accounts', 'MG001', 'Current Assets'];
                fileName = 'connect_consolidates_template.xlsx';
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid template type' });
        }

        // Add headers
        worksheet.addRow(headers);
        
        // Add sample data
        worksheet.addRow(sampleData);
        
        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' }
        };

        // Set column widths
        worksheet.columns = headers.map(() => ({ width: 20 }));

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Your existing routes (with correct table names)
app.get("/main_groups", (req, res) => {
    db.query("SELECT * FROM main_groups", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.get("/sub_groups", (req, res) => {
    db.query("SELECT * FROM sub_groups", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.get("/ledgers", (req, res) => {
    db.query("SELECT * FROM ledgers", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.get("/divisions", (req, res) => {
    db.query("SELECT * FROM divisions", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.get("/connect_consolidates", (req, res) => {
    db.query("SELECT * FROM connect_consolidates", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Get all consolidated data
app.get("/consolidated", (req, res) => {
    const sql = "SELECT * FROM consolidated_display ORDER BY serial_no";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: 'File upload error: ' + error.message });
    }
    res.status(500).json({ error: error.message });
});

app.listen(5000, () => {
    console.log("Backend running on http://localhost:5000");
});