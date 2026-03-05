import pool from "../config/database.js";

export const getAllConnectConsolidates = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM connect_consolidates ORDER BY serial_no");
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const createConnectConsolidate = async (req, res, next) => {
    try {
        const { serial_no, ledger_code, sub_group_code, main_group_code, status } = req.body;

        const sql = `
            INSERT INTO connect_consolidates (serial_no, ledger_code, sub_group_code, main_group_code, status) 
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            serial_no || 0,
            ledger_code || null,
            sub_group_code || null,
            main_group_code || null,
            status || 'Active'
        ]);

        res.json({
            success: true,
            message: "Consolidation record created successfully",
            id: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

export const updateConnectConsolidate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { serial_no, ledger_code, sub_group_code, main_group_code, status } = req.body;

        const sql = `
            UPDATE connect_consolidates 
            SET serial_no = ?, ledger_code = ?, sub_group_code = ?, main_group_code = ?, status = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            serial_no,
            ledger_code,
            sub_group_code,
            main_group_code,
            status,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Consolidation record not found"
            });
        }

        res.json({
            success: true,
            message: "Consolidation record updated successfully"
        });

    } catch (error) {
        next(error);
    }
};

export const deleteConnectConsolidate = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM connect_consolidates WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Consolidation record not found"
            });
        }

        res.json({
            success: true,
            message: "Consolidation record deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};