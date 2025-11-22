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

// Import route for main_groups
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

// Import route for connect_consolidates
app.post("/import/connect-consolidates", upload.single('file'), async (req, res) => {
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
            const serial_no = row.getCell(1).value || 0;
            const ledger_code = row.getCell(2).value?.toString() || null;
            const sub_group_code = row.getCell(3).value?.toString() || null;
            const main_group_code = row.getCell(4).value?.toString() || null;
            const status = row.getCell(5).value?.toString() || 'Active';

            if (!ledger_code && !sub_group_code && !main_group_code) {
                errors.push(`Row ${rowNumber}: At least one code (Ledger, Sub Group, or Main Group) is required`);
                errorCount++;
                continue;
            }

            const query = `INSERT INTO connect_consolidates (serial_no, ledger_code, sub_group_code, main_group_code, status) 
                          VALUES (?, ?, ?, ?, ?) 
                          ON DUPLICATE KEY UPDATE 
                          serial_no = VALUES(serial_no),
                          ledger_code = VALUES(ledger_code),
                          sub_group_code = VALUES(sub_group_code),
                          main_group_code = VALUES(main_group_code),
                          status = VALUES(status)`;
            
            try {
                await db.promise().execute(query, [serial_no, ledger_code, sub_group_code, main_group_code, status]);
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

// CRUD routes for main_groups
app.get("/main_groups", (req, res) => {
    db.query("SELECT * FROM main_groups ORDER BY main_group_code", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.post("/main_groups", (req, res) => {
    const { main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status } = req.body;
    const query = "INSERT INTO main_groups (main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(query, [main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Main group created successfully", id: results.insertId });
    });
});

// CRUD routes for sub_groups
app.get("/sub_groups", (req, res) => {
    db.query("SELECT * FROM sub_groups ORDER BY sub_group_code", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.post("/sub_groups", (req, res) => {
    const { sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status } = req.body;
    const query = "INSERT INTO sub_groups (sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(query, [sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Sub group created successfully", id: results.insertId });
    });
});

// CRUD routes for ledgers
app.get("/ledgers", (req, res) => {
    db.query("SELECT * FROM ledgers ORDER BY ledger_code", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.post("/ledgers", (req, res) => {
    const { ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status } = req.body;
    const query = "INSERT INTO ledgers (ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(query, [ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Ledger created successfully", id: results.insertId });
    });
});

// CRUD routes for divisions
app.get("/divisions", (req, res) => {
    db.query("SELECT * FROM divisions ORDER BY division_code", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.post("/divisions", (req, res) => {
    const { division_code, division_name, report, status } = req.body;
    const query = "INSERT INTO divisions (division_code, division_name, report, status) VALUES (?, ?, ?, ?)";
    db.query(query, [division_code, division_name, report, status], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Division created successfully", id: results.insertId });
    });
});

// CRUD routes for connect_consolidates
app.get("/connect_consolidates", (req, res) => {
    db.query("SELECT * FROM connect_consolidates ORDER BY serial_no", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.post("/connect_consolidates", (req, res) => {
    const { serial_no, ledger_code, sub_group_code, main_group_code, status } = req.body;
    const query = "INSERT INTO connect_consolidates (serial_no, ledger_code, sub_group_code, main_group_code, status) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [serial_no, ledger_code, sub_group_code, main_group_code, status], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Consolidation record created successfully", id: results.insertId });
    });
});

// Get all consolidated data using the LEFT JOIN view
app.get("/consolidated", (req, res) => {
    const sql = "SELECT * FROM consolidated_display ORDER BY serial_no";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get specific consolidated data by ledger_code
app.get("/consolidated", (req, res) => {
    const { ledger_code } = req.query;

    let sql = "SELECT * FROM consolidated_display";
    let params = [];

    if (ledger_code) {
        sql += "WHERE ledger_code = ? ORDER BY serial_no";
        params.push(ledger_code);
    } else {
        sql += " ORDER BY serial_no";
    }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error : err.message });
        res.json(results);
    })
});

// Create new consolidation record
app.post("/consolidated", (req, res) => {
    const { serial_no, ledger_code, sub_group_code, main_group_code, status } = req.body;
    
    const query = `
        INSERT INTO connect_consolidates (serial_no, ledger_code, sub_group_code, main_group_code, status) 
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(query, [serial_no, ledger_code, sub_group_code, main_group_code, status], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Consolidation record created successfully", id: results.insertId });
    });
});

// Update consolidation record
app.put("/consolidated/:id", (req, res) => {
    const { id } = req.params;
    const { serial_no, ledger_code, sub_group_code, main_group_code, status } = req.body;
    
    const query = `
        UPDATE connect_consolidates 
        SET serial_no = ?, ledger_code = ?, sub_group_code = ?, main_group_code = ?, status = ?
        WHERE id = ?
    `;
    
    db.query(query, [serial_no, ledger_code, sub_group_code, main_group_code, status, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Consolidation record updated successfully" });
    });
});

// Delete consolidation record
app.delete("/consolidated/:id", (req, res) => {
    const { id } = req.params;
    
    const query = "DELETE FROM connect_consolidates WHERE id = ?";
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Consolidation record deleted successfully" });
    });
});

// UPGRADED VERSION WITH MERGE AND DEMERGE CONCEPT
// Enhanced merge endpoint
app.post("/consolidated/merge", async (req, res) => {
    const { ledger_code, sub_group_code, main_group_code } = req.body;
    
    try {
        // Get sub_group and main_group names
        let sub_group_name = null;
        let main_group_name = null;

        if (sub_group_code) {
            const subGroupResult = await db.promise().execute(
                "SELECT sub_group_name FROM sub_groups WHERE sub_group_code = ?",
                [sub_group_code]
            );
            sub_group_name = subGroupResult[0][0]?.sub_group_name || null;
        }

        if (main_group_code) {
            const mainGroupResult = await db.promise().execute(
                "SELECT main_group_name FROM main_groups WHERE main_group_code = ?",
                [main_group_code]
            );
            main_group_name = mainGroupResult[0][0]?.main_group_name || null;
        }

        // Update ledger table with consolidation data
        await db.promise().execute(
            `UPDATE ledgers 
             SET link_status = 'active',
                 consolidated_sub_group_code = ?,
                 consolidated_sub_group_name = ?,
                 consolidated_main_group_code = ?,
                 consolidated_main_group_name = ?,
                 consolidation_status = 'active'
             WHERE ledger_code = ?`,
            [sub_group_code, sub_group_name, main_group_code, main_group_name, ledger_code]
        );

        res.json({ 
            message: "Ledger merged successfully", 
            ledger_code,
            sub_group_code, 
            sub_group_name,
            main_group_code,
            main_group_name
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enhanced demerge endpoint
app.post("/consolidated/demerge/:ledger_code", async (req, res) => {
    const { ledger_code } = req.params;
    
    try {
        // Clear consolidation data from ledger table
        await db.promise().execute(
            `UPDATE ledgers 
             SET link_status = 'inactive',
                 consolidated_sub_group_code = NULL,
                 consolidated_sub_group_name = NULL,
                 consolidated_main_group_code = NULL,
                 consolidated_main_group_name = NULL,
                 consolidation_status = 'inactive'
             WHERE ledger_code = ?`,
            [ledger_code]
        );

        res.json({ 
            message: "Ledger demerged successfully", 
            ledger_code 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get merged ledgers (active consolidation)
app.get("/consolidated/active", (req, res) => {
    const sql = `
        SELECT 
            l.*,
            cc.sub_group_code,
            sg.sub_group_name,
            cc.main_group_code,
            mg.main_group_name,
            cc.status as consolidation_status
        FROM ledgers l
        INNER JOIN connect_consolidates cc ON l.ledger_code = cc.ledger_code AND cc.status = 'active'
        LEFT JOIN sub_groups sg ON cc.sub_group_code = sg.sub_group_code
        LEFT JOIN main_groups mg ON cc.main_group_code = mg.main_group_code
        ORDER BY cc.serial_no
    `;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get demerged ledgers (inactive consolidation)
app.get("/consolidated/inactive", (req, res) => {
    const sql = `
        SELECT 
            l.*,
            'inactive' as consolidation_status
        FROM ledgers l
        WHERE l.ledger_code NOT IN (
            SELECT ledger_code FROM connect_consolidates WHERE status = 'active'
        )
        OR l.ledger_code IN (
            SELECT ledger_code FROM connect_consolidates WHERE status = 'inactive'
        )
        ORDER BY l.ledger_code
    `;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get consolidated data for specific ledger_code
app.get("/consolidated/ledger/:ledger_code", (req, res) => {
    const { ledger_code } = req.params;
    
    const sql = "SELECT * FROM consolidated_display WHERE ledger_code = ? ORDER BY serial_no";
    
    db.query(sql, [ledger_code], (err, results) => {
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