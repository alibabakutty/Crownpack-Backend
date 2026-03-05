import pool from "../config/database.js";

export const getAllSubGroups = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM sub_groups ORDER BY sub_group_code");
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const createSubGroup = async (req, res, next) => {
    try {
        const { sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status } = req.body;

        if (!sub_group_name) {
            return res.status(400).json({
                success: false,
                error: "Sub group name is required"
            });
        }

        const sql = `
            INSERT INTO sub_groups 
            (sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            sub_group_code || null,
            sub_group_name,
            tally_report || null,
            sub_report || null,
            debit_credit || null,
            trial_balance || null,
            status || 'Active'
        ]);

        res.json({
            success: true,
            message: "Sub group created successfully",
            id: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

export const updateSubGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sub_group_code, sub_group_name, tally_report, sub_report, debit_credit, trial_balance, status } = req.body;

        const sql = `
            UPDATE sub_groups 
            SET sub_group_code = ?, sub_group_name = ?, tally_report = ?, sub_report = ?, 
                debit_credit = ?, trial_balance = ?, status = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            sub_group_code,
            sub_group_name,
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
                error: "Sub group not found"
            });
        }

        res.json({
            success: true,
            message: "Sub group updated successfully"
        });

    } catch (error) {
        next(error);
    }
};

export const deleteSubGroup = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM sub_groups WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Sub group not found"
            });
        }

        res.json({
            success: true,
            message: "Sub group deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};