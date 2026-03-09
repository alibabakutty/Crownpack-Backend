import pool from "../config/database.js";

export const createVoucher = async (req, res) => {
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

        const [datePart] = dateTime.split(" - ");
        const [day, month, year] = datePart.split("-");
        const formattedDate = `${year}-${month}-${day}`;

        console.log("Formatted Date:", formattedDate);

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
};

export const getAllVouchers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                *,
                DATE_FORMAT(voucher_date, '%Y-%m-%d') as voucher_date_formatted
            FROM vouchers
            ORDER BY voucher_number DESC
        `);

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
};

export const getVoucherByNumber = async (req, res) => {
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
};

export const updateVoucher = async (req, res) => {
    console.log('📥 Update voucher request:', req.body);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const voucherNumber = req.params.voucherNumber;
        const { dateTime, transactions } = req.body;

        const [datePart] = dateTime.split(" - ");
        const [day, month, year] = datePart.split("-");
        const formattedDate = `${year}-${month}-${day}`;

        console.log("Formatted Date:", formattedDate);

        await connection.query(
            `DELETE FROM vouchers WHERE voucher_number = ?`,
            [voucherNumber]
        );

        console.log("🗑 Old voucher rows deleted");

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
};

export const getNextVoucherNumber = async (req, res) => {
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
};

export const getRandomVoucherNumber = (req, res) => {
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
                    nextSequence = (lastSequence + 1).toString().padStart(4, "0");
                }
            }
        }

        const voucherNumber = `VCH-${day}-${month}-${year}-${nextSequence}`;

        res.json({
            success: true,
            voucherNumber: voucherNumber
        });
    });
};