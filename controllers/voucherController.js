import pool from "../config/database.js";
import { formatDateForDB } from "../utils/dateFormatter.js";

export const createVoucher = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        console.log('📥 Received voucher data:', req.body);

        await connection.beginTransaction();

        const {
            voucherNumber,
            dateTime,
            divisionType,
            numberOfDivisions,
            transactions,
            totals
        } = req.body;

        const formattedDate = formatDateForDB(dateTime);

        console.log("Formatted Date:", formattedDate);

        // INSERT VOUCHER
        const [voucherResult] = await connection.query(
            `INSERT INTO vouchers (
                voucher_number,
                voucher_date,
                division_type,
                num_divisions,
                total_debit,
                total_credit,
                narration,
                created_by,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                voucherNumber,
                formattedDate,
                divisionType,
                numberOfDivisions,
                totals.grandTotalDr,
                totals.grandTotalCr,
                "Voucher created",
                "admin",
                "DRAFT"
            ]
        );

        console.log("✅ Voucher inserted:", voucherResult);

        const voucherId = voucherResult.insertId;

        // INSERT ROWS
        for (const row of transactions) {
            console.log("➡️ Inserting row:", row);

            await connection.query(
                `INSERT INTO voucher_rows (
                    voucher_id,
                    ledger_code,
                    ledger_name,
                    d1Amount,d1Type,
                    d2Amount,d2Type,
                    d3Amount,d3Type,
                    d4Amount,d4Type,
                    d5Amount,d5Type,
                    totalDr,totalCr,netAmt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    voucherId,
                    row.ledgerCode,
                    row.ledgerName,

                    row.d1Amount || 0, row.d1Type,
                    row.d2Amount || 0, row.d2Type,
                    row.d3Amount || 0, row.d3Type,
                    row.d4Amount || 0, row.d4Type,
                    row.d5Amount || 0, row.d5Type,

                    row.totalDr || 0,
                    row.totalCr || 0,
                    row.netAmt || 0
                ]
            );

            console.log("✅ Row inserted");
        }

        await connection.commit();

        console.log("🎉 Transaction committed");

        res.json({
            success: true,
            message: "Voucher saved successfully",
            voucherId
        });

    } catch (error) {
        await connection.rollback();
        console.error("❌ ERROR:", error);
        next(error);
    } finally {
        connection.release();
    }
};

export const getAllVouchers = async (req, res, next) => {
    try {
        const [vouchers] = await pool.query(`
            SELECT v.*, COUNT(vr.id) as row_count 
            FROM vouchers v 
            LEFT JOIN voucher_rows vr ON v.id = vr.voucher_id 
            GROUP BY v.id 
            ORDER BY v.id DESC
        `);

        res.json({
            success: true,
            data: vouchers
        });

    } catch (error) {
        next(error);
    }
};

export const getVoucherById = async (req, res, next) => {
    try {
        const [vouchers] = await pool.query(
            'SELECT * FROM vouchers WHERE id = ?',
            [req.params.id]
        );

        if (vouchers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        const [rows] = await pool.query(
            'SELECT * FROM voucher_rows WHERE voucher_id = ? ORDER BY id',
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...vouchers[0],
                transactions: rows
            }
        });

    } catch (error) {
        next(error);
    }
};

export const updateVoucherStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [result] = await pool.query(
            'UPDATE vouchers SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        res.json({
            success: true,
            message: `Voucher status updated to ${status}`
        });

    } catch (error) {
        next(error);
    }
};

export const deleteVoucher = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Delete voucher rows first
        await connection.query('DELETE FROM voucher_rows WHERE voucher_id = ?', [req.params.id]);

        // Delete voucher
        const [result] = await connection.query('DELETE FROM vouchers WHERE id = ?', [req.params.id]);

        await connection.commit();

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        res.json({
            success: true,
            message: 'Voucher deleted successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};