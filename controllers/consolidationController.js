import pool from "../config/database.js";

export const getAllConsolidated = async (req, res) => {
    try {
        const sql = "SELECT * FROM consolidated_display ORDER BY serial_no";
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("❌ Error fetching consolidated:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getConsolidatedByLedger = async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
};

export const mergeLedger = async (req, res) => {
    const { ledger_code, sub_group_code, main_group_code } = req.body;

    try {
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
};

export const demergeLedger = async (req, res) => {
    const { ledger_code } = req.params;

    try {
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
};

export const getActiveConsolidations = async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
};

export const getInactiveConsolidations = async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
};

export const getLedgerConsolidation = async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
};

export const createConsolidation = (req, res) => {
    const { serial_no, ledger_code, sub_group_code, main_group_code, status } = req.body;

    const query = `
        INSERT INTO connect_consolidates (serial_no, ledger_code, sub_group_code, main_group_code, status) 
        VALUES (?, ?, ?, ?, ?)
    `;

    pool.query(query, [serial_no, ledger_code, sub_group_code, main_group_code, status], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Consolidation record created successfully", id: results.insertId });
    });
};

export const updateConsolidation = (req, res) => {
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
};

export const deleteConsolidation = (req, res) => {
    const { id } = req.params;

    const query = "DELETE FROM connect_consolidates WHERE id = ?";

    pool.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Consolidation record deleted successfully" });
    });
};