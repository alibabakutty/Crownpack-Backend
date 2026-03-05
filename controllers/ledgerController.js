import pool from "../config/database.js";

export const getAllLedgers = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM ledgers ORDER BY ledger_code");
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const createLedger = async (req, res, next) => {
    try {
        const { ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status } = req.body;

        if (!ledger_name) {
            return res.status(400).json({
                success: false,
                error: "Ledger name is required"
            });
        }

        const sql = `
            INSERT INTO ledgers 
            (ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            ledger_code || null,
            ledger_name,
            tally_report || null,
            debit_credit || null,
            trial_balance || null,
            status || 'Active',
            link_status || null
        ]);

        res.json({
            success: true,
            message: "Ledger created successfully",
            id: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

export const updateLedger = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { ledger_code, ledger_name, tally_report, debit_credit, trial_balance, status, link_status } = req.body;

        const sql = `
            UPDATE ledgers 
            SET ledger_code = ?, ledger_name = ?, tally_report = ?, debit_credit = ?, 
                trial_balance = ?, status = ?, link_status = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            ledger_code,
            ledger_name,
            tally_report,
            debit_credit,
            trial_balance,
            status,
            link_status,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Ledger not found"
            });
        }

        res.json({
            success: true,
            message: "Ledger updated successfully"
        });

    } catch (error) {
        next(error);
    }
};

export const deleteLedger = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM ledgers WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Ledger not found"
            });
        }

        res.json({
            success: true,
            message: "Ledger deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};

export const getLedgerByCode = async (req, res, next) => {
    try {
        const { ledger_code } = req.params;

        const [rows] = await pool.query("SELECT * FROM ledgers WHERE ledger_code = ?", [ledger_code]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Ledger not found"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        next(error);
    }
};