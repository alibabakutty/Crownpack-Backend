import express from "express";
import mysql from "mysql2";
import cors from "cors";
import multer from "multer";
import exceljs from "exceljs";
import fs from "fs";
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(express.json());

dotenv.config();

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

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

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
                await pool.execute(query, [main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status]);
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
                await pool.execute(query, [sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status]);
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
                await pool.execute(query, [ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status]);
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
                await pool.execute(query, [serial_no, ledger_code, sub_group_code, main_group_code, status]);
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
app.get("/main_groups", async (req, res) => {
    try {

        const [rows] = await pool.query("SELECT * FROM main_groups");

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error("❌ Error fetching main groups:", error);

        res.status(500).json({
            error: error.message
        });

    }
});

app.post("/main_groups", async (req, res) => {

    try {

        const { main_group_code, main_group_name } = req.body;

        const sql = `
      INSERT INTO main_groups 
      (main_group_code, main_group_name) 
      VALUES (?, ?)
    `;

        const [result] = await pool.query(sql, [
            main_group_code,
            main_group_name
        ]);

        res.json({
            success: true,
            message: "Main group created successfully",
            id: result.insertId
        });

    } catch (error) {

        console.error("Error inserting main group:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

// CRUD routes for sub_groups
app.get("/sub_groups", async (req, res) => {

    try {

        const [rows] = await pool.query("SELECT * FROM sub_groups");

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

});

app.post("/sub_groups", (req, res) => {
    const { sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status } = req.body;
    const query = "INSERT INTO sub_groups (sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
    pool.query(query, [sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Sub group created successfully", id: results.insertId });
    });
});

// CRUD routes for ledgers
app.get("/ledgers", async (req, res) => {

    try {

        const [rows] = await pool.query(
            "SELECT * FROM ledgers ORDER BY ledger_code"
        );

        res.json(rows);

    } catch (error) {

        console.error("❌ Error fetching ledgers:", error);

        res.status(500).json({
            error: error.message
        });

    }

});

app.post("/ledgers", (req, res) => {
    const { ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status } = req.body;
    const query = "INSERT INTO ledgers (ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status) VALUES (?, ?, ?, ?, ?, ?, ?)";
    pool.query(query, [ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Ledger created successfully", id: results.insertId });
    });
});

// CRUD routes for divisions
app.get("/divisions", async (req, res) => {

    try {

        const [rows] = await pool.query("SELECT * FROM divisions");

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

});

app.post("/divisions", (req, res) => {
    const { divisions } = req.body;

    if (!divisions || divisions.length === 0) {
        return res.status(400).json({ message: "No divisions provided" });
    }

    // Prepare values
    const values = divisions.map((division, index) => [
        division,
        index + 1
    ]);

    const query = `
        INSERT INTO divisions (division_name, position)
        VALUES ?
    `;

    pool.query(query, [values], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err });
        }

        res.json({
            message: "Divisions inserted successfully",
            inserted: results.affectedRows
        });
    });
});

app.put("/divisions", (req, res) => {
    const { divisions } = req.body;

    if (!divisions || divisions.length === 0) {
        return res.status(400).json({ message: "No divisions provided" });
    }

    const ids = divisions.map(d => d.id);

    // Build CASE statement
    let caseStatement = "CASE id ";
    divisions.forEach(d => {
        caseStatement += `WHEN ${d.id} THEN ? `;
    });
    caseStatement += "END";

    const query = `
        UPDATE divisions
        SET division_name = ${caseStatement}
        WHERE id IN (${ids.join(",")})
    `;

    const values = divisions.map(d => d.division_name);

    pool.query(query, values, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err });
        }

        res.json({
            message: "Divisions updated successfully",
            updated: results.affectedRows
        });
    });
});

// CRUD routes for connect_consolidates
app.get("/connect_consolidates", async (req, res) => {
    try {

        const [rows] = await pool.query(
            "SELECT * FROM connect_consolidates ORDER BY serial_no"
        );

        res.json(rows);

    } catch (error) {

        console.error("❌ Error fetching connect_consolidates:", error);

        res.status(500).json({
            error: error.message
        });

    }
});

app.post("/connect_consolidates", (req, res) => {
    const { serial_no, ledger_code, sub_group_code, main_group_code, status } = req.body;
    const query = "INSERT INTO connect_consolidates (serial_no, ledger_code, sub_group_code, main_group_code, status) VALUES (?, ?, ?, ?, ?)";
    pool.query(query, [serial_no, ledger_code, sub_group_code, main_group_code, status], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Consolidation record created successfully", id: results.insertId });
    });
});

// Route 1 → all consolidated
app.get("/consolidated", async (req, res) => {
    try {

        const sql = "SELECT * FROM consolidated_display ORDER BY serial_no";

        const [rows] = await pool.query(sql);

        res.json(rows);

    } catch (error) {

        console.error("❌ Error fetching consolidated:", error);

        res.status(500).json({
            error: error.message
        });

    }
});

// Route 2 → consolidated for specific ledger
app.get("/consolidated/by-ledger", async (req, res) => {

    try {

        const { ledger_code } = req.query;

        let sql = "SELECT * FROM consolidated_display";
        let params = [];

        if (ledger_code) {
            sql += " WHERE ledger_code = ? ORDER BY serial_no";
            params.push(ledger_code);
        } else {
            sql += " ORDER BY serial_no";
        }

        const [rows] = await pool.query(sql, params);

        res.json(rows);

    } catch (error) {

        console.error("❌ Error fetching consolidated by ledger:", error);

        res.status(500).json({
            error: error.message
        });

    }

});

// Create new consolidation record
app.post("/consolidated", (req, res) => {
    const { serial_no, ledger_code, sub_group_code, main_group_code, status } = req.body;

    const query = `
        INSERT INTO connect_consolidates (serial_no, ledger_code, sub_group_code, main_group_code, status) 
        VALUES (?, ?, ?, ?, ?)
    `;

    pool.query(query, [serial_no, ledger_code, sub_group_code, main_group_code, status], (err, results) => {
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

    pool.query(query, [serial_no, ledger_code, sub_group_code, main_group_code, status, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Consolidation record updated successfully" });
    });
});

// Delete consolidation record
app.delete("/consolidated/:id", (req, res) => {
    const { id } = req.params;

    const query = "DELETE FROM connect_consolidates WHERE id = ?";

    pool.query(query, [id], (err, results) => {
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
            const subGroupResult = await pool.execute(
                "SELECT sub_group_name FROM sub_groups WHERE sub_group_code = ?",
                [sub_group_code]
            );
            sub_group_name = subGroupResult[0][0]?.sub_group_name || null;
        }

        if (main_group_code) {
            const mainGroupResult = await pool.execute(
                "SELECT main_group_name FROM main_groups WHERE main_group_code = ?",
                [main_group_code]
            );
            main_group_name = mainGroupResult[0][0]?.main_group_name || null;
        }

        // Update ledger table with consolidation data
        await pool.execute(
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
        await pool.execute(
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
app.get("/consolidated/active", async (req, res) => {

    try {

        const sql = `
        SELECT 
            l.*,
            cc.sub_group_code,
            sg.sub_group_name,
            cc.main_group_code,
            mg.main_group_name,
            cc.status as consolidation_status
        FROM ledgers l
        INNER JOIN connect_consolidates cc 
            ON l.ledger_code = cc.ledger_code 
            AND cc.status = 'active'
        LEFT JOIN sub_groups sg 
            ON cc.sub_group_code = sg.sub_group_code
        LEFT JOIN main_groups mg 
            ON cc.main_group_code = mg.main_group_code
        ORDER BY cc.serial_no
    `;

        const [rows] = await pool.query(sql);

        res.json(rows);

    } catch (error) {

        console.error("❌ Error fetching active consolidations:", error);

        res.status(500).json({
            error: error.message
        });

    }

});

// Get demerged ledgers (inactive consolidation)
app.get("/consolidated/inactive", async (req, res) => {

    try {

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

        const [rows] = await pool.query(sql);

        res.json(rows);

    } catch (error) {

        console.error("❌ Error fetching inactive consolidations:", error);

        res.status(500).json({
            error: error.message
        });

    }

});

// Get consolidated data for specific ledger_code
app.get("/consolidated/ledger/:ledger_code", async (req, res) => {

    try {

        const { ledger_code } = req.params;

        const sql = `
      SELECT * 
      FROM consolidated_display 
      WHERE ledger_code = ?
      ORDER BY serial_no
    `;

        const [rows] = await pool.query(sql, [ledger_code]);

        res.json(rows);

    } catch (error) {

        console.error("❌ Error fetching ledger consolidated data:", error);

        res.status(500).json({
            error: error.message
        });

    }

});


app.post('/vouchers', async (req, res) => {

    console.log('📥 Received voucher data:', req.body);

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();

        const {
            voucherNumber,
            dateTime,
            transactions,
            totals
        } = req.body;

        // FORMAT DATE
        const [datePart] = dateTime.split(" - ");
        const [day, month, year] = datePart.split("-");
        const formattedDate = `${year}-${month}-${day}`;

        console.log("Formatted Date:", formattedDate);

        // INSERT EACH ROW INTO SAME TABLE
        for (const row of transactions) {

            console.log("➡️ Inserting row:", row);

            await connection.query(
                `INSERT INTO vouchers (
    voucher_number,
    voucher_date,
    ledger_code,
    ledger_name,
    d1Amount,d1Type,
    d2Amount,d2Type,
    d3Amount,d3Type,
    d4Amount,d4Type,
    d5Amount,d5Type,
    totalDr,totalCr,netAmt,
    narration
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    voucherNumber,
                    formattedDate,

                    row.ledgerCode,
                    row.ledgerName,

                    row.d1Amount || row.amount || 0,
                    row.d1Type || row.type || "Debit",

                    row.d2Amount || 0,
                    row.d2Type || "Debit",

                    row.d3Amount || 0,
                    row.d3Type || "Debit",

                    row.d4Amount || 0,
                    row.d4Type || "Debit",

                    row.d5Amount || 0,
                    row.d5Type || "Debit",

                    row.totalDr || 0,
                    row.totalCr || 0,
                    row.netAmt || 0,

                    "Voucher created"
                ]
            );

            console.log("✅ Row inserted");
        }

        await connection.commit();

        console.log("🎉 Transaction committed");

        res.json({
            success: true,
            message: "Voucher saved successfully"
        });

    } catch (error) {

        console.error("❌ ERROR:", error);

        await connection.rollback();

        res.status(500).json({
            success: false,
            error: error.message
        });

    } finally {
        connection.release();
    }

});

// GET all vouchers
app.get('/vouchers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        *,
        DATE_FORMAT(voucher_date, '%Y-%m-%d') as voucher_date_formatted
      FROM vouchers
      ORDER BY voucher_number DESC
    `);

    // Replace the original voucher_date with the formatted one
    const formattedRows = rows.map(row => ({
      ...row,
      voucher_date: row.voucher_date_formatted || row.voucher_date
    }));

    res.json({
      success: true,
      data: formattedRows,
      count: rows.length
    });

  } catch (error) {
    console.error("❌ Error fetching vouchers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vouchers",
      error: error.message
    });
  }
});

app.get('/vouchers-by-number/:voucher_number', async (req, res) => {

  const { voucher_number } = req.params;

  if (!voucher_number) {
    return res.status(400).json({
      success: false,
      message: "Voucher number is required"
    });
  }

  try {

    const [rows] = await pool.query(
      `SELECT *
       FROM vouchers
       WHERE voucher_number = ?
       ORDER BY id ASC`,
      [voucher_number]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found"
      });
    }

    res.json({
      success: true,
      voucherNumber: voucher_number,
      count: rows.length,
      data: rows
    });

  } catch (error) {

    console.error("❌ Error fetching voucher:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch voucher",
      error: error.message
    });

  }
});

app.put('/vouchers/:voucherNumber', async (req, res) => {

    console.log('📥 Update voucher request:', req.body);

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();

        const voucherNumber = req.params.voucherNumber;

        const {
            dateTime,
            transactions,
            totals
        } = req.body;

        // FORMAT DATE
        const [datePart] = dateTime.split(" - ");
        const [day, month, year] = datePart.split("-");
        const formattedDate = `${year}-${month}-${day}`;

        console.log("Formatted Date:", formattedDate);

        // DELETE OLD ROWS
        await connection.query(
            `DELETE FROM vouchers WHERE voucher_number = ?`,
            [voucherNumber]
        );

        console.log("🗑 Old voucher rows deleted");

        // INSERT UPDATED ROWS
        for (const row of transactions) {

            console.log("➡️ Inserting updated row:", row);

            await connection.query(
                `INSERT INTO vouchers (
                    voucher_number,
                    voucher_date,
                    ledger_code,
                    ledger_name,
                    d1Amount,d1Type,
                    d2Amount,d2Type,
                    d3Amount,d3Type,
                    d4Amount,d4Type,
                    d5Amount,d5Type,
                    totalDr,totalCr,netAmt,
                    narration
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    voucherNumber,
                    formattedDate,

                    row.ledgerCode,
                    row.ledgerName,

                    row.d1Amount || row.amount || 0,
                    row.d1Type || row.type || "Debit",

                    row.d2Amount || 0,
                    row.d2Type || "Debit",

                    row.d3Amount || 0,
                    row.d3Type || "Debit",

                    row.d4Amount || 0,
                    row.d4Type || "Debit",

                    row.d5Amount || 0,
                    row.d5Type || "Debit",

                    row.totalDr || 0,
                    row.totalCr || 0,
                    row.netAmt || 0,

                    "Voucher updated"
                ]
            );

            console.log("✅ Updated row inserted");
        }

        await connection.commit();

        console.log("🎉 Voucher updated successfully");

        res.json({
            success: true,
            message: "Voucher updated successfully"
        });

    } catch (error) {

        console.error("❌ UPDATE ERROR:", error);

        await connection.rollback();

        res.status(500).json({
            success: false,
            error: error.message
        });

    } finally {

        connection.release();

    }

});

app.get("/vouchers/next-number", async (req, res) => {
    try {

        const [rows] = await pool.query(`
      SELECT voucher_number 
      FROM vouchers 
      ORDER BY id DESC 
      LIMIT 1
    `);

        if (rows.length === 0) {
            return res.json({ voucherNumber: "VCH-10001" });
        }

        const lastVoucher = rows[0].voucher_number;

        const number = parseInt(lastVoucher.split("-")[1]) + 1;

        const nextVoucher = `VCH-${number.toString().padStart(5, "0")}`;

        res.json({ voucherNumber: nextVoucher });

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
});

app.get("/vouchers/random-number", (req, res) => {

    const sql = `
      SELECT voucher_number
      FROM vouchers
      WHERE voucher_number LIKE 'VCH-%'
      ORDER BY created_at DESC
      LIMIT 1
  `;

    pool.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        let nextSequence = "0001";

        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear().toString().slice(-2);

        if (results.length > 0 && results[0].voucher_number) {

            const lastVoucher = results[0].voucher_number;

            const parts = lastVoucher.split("-");

            if (parts.length >= 5) {

                const lastDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
                const currentDate = `${day}-${month}-${year}`;

                if (lastDate === currentDate) {

                    const lastSequence = parseInt(parts[4]) || 0;

                    nextSequence = (lastSequence + 1)
                        .toString()
                        .padStart(4, "0");

                }

            }

        }

        const voucherNumber = `VCH-${day}-${month}-${year}-${nextSequence}`;

        res.json({
            success: true,
            voucherNumber: voucherNumber
        });

    });

});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: 'File upload error: ' + error.message });
    }
    res.status(500).json({ error: error.message });
});

app.listen(7000, () => {
    console.log("Backend running on http://localhost:7000");
});