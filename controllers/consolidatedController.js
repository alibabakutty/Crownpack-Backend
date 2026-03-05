import pool from "../config/database.js";
import consolidationService from "../services/consolidationService.js";

export const getAllConsolidated = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM consolidated_display ORDER BY serial_no");
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const getConsolidatedByLedger = async (req, res, next) => {
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

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        next(error);
    }
};

export const getConsolidatedForLedger = async (req, res, next) => {
    try {
        const { ledger_code } = req.params;

        const sql = `
            SELECT * 
            FROM consolidated_display 
            WHERE ledger_code = ?
            ORDER BY serial_no
        `;

        const [rows] = await pool.query(sql, [ledger_code]);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        next(error);
    }
};

export const mergeLedger = async (req, res, next) => {
    try {
        const { ledger_code, sub_group_code, main_group_code } = req.body;

        if (!ledger_code) {
            return res.status(400).json({
                success: false,
                error: "Ledger code is required"
            });
        }

        const result = await consolidationService.mergeLedger(ledger_code, sub_group_code, main_group_code);

        res.json({
            success: true,
            message: "Ledger merged successfully",
            data: result
        });

    } catch (error) {
        next(error);
    }
};

export const demergeLedger = async (req, res, next) => {
    try {
        const { ledger_code } = req.params;

        const result = await consolidationService.demergeLedger(ledger_code);

        res.json({
            success: true,
            message: "Ledger demerged successfully",
            data: result
        });

    } catch (error) {
        next(error);
    }
};

export const getActiveConsolidations = async (req, res, next) => {
    try {
        const rows = await consolidationService.getActiveConsolidations();

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        next(error);
    }
};

export const getInactiveConsolidations = async (req, res, next) => {
    try {
        const rows = await consolidationService.getInactiveConsolidations();

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        next(error);
    }
};