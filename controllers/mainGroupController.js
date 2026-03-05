import pool from "../config/database.js";

export const getAllMainGroups = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM main_groups ORDER BY main_group_code");
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const createMainGroup = async (req, res, next) => {
    try {
        const { main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status } = req.body;

        if (!main_group_name) {
            return res.status(400).json({
                success: false,
                error: "Main group name is required"
            });
        }

        const sql = `
            INSERT INTO main_groups 
            (main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            main_group_code || null,
            main_group_name,
            tally_report || null,
            sub_report || null,
            debit_credit || null,
            trial_balance || null,
            status || 'Active'
        ]);

        res.json({
            success: true,
            message: "Main group created successfully",
            id: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

export const updateMainGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { main_group_code, main_group_name, tally_report, sub_report, debit_credit, trial_balance, status } = req.body;

        const sql = `
            UPDATE main_groups 
            SET main_group_code = ?, main_group_name = ?, tally_report = ?, sub_report = ?, 
                debit_credit = ?, trial_balance = ?, status = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            main_group_code,
            main_group_name,
            tally_report,
            sub_report,
            debit_credit,
            trial_balance,
            status,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Main group not found"
            });
        }

        res.json({
            success: true,
            message: "Main group updated successfully"
        });

    } catch (error) {
        next(error);
    }
};

export const deleteMainGroup = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM main_groups WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Main group not found"
            });
        }

        res.json({
            success: true,
            message: "Main group deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};

export const getMainGroupById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query("SELECT * FROM main_groups WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Main group not found"
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