import pool from "../config/database.js";

export const createVoucher = async (req, res) => {
    console.log('📥 Received voucher data:', req.body);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            voucherNumber,
            dateTime,
            divisionType,
            transactions,
            createdBy,
            verifiedBy,
            approvedBy
            // totals
        } = req.body;

        const [datePart] = dateTime.split(" - ");
        const [day, month, year] = datePart.split("-");
        const formattedDate = `${year}-${month}-${day}`;

        console.log("Formatted Date:", formattedDate);
        const monthNames = [
            "Jan","Feb","Mar","Apr","May","Jun",
            "Jul","Aug","Sep","Oct","Nov","Dec"
        ];

        const voucherMonth = monthNames[parseInt(month)-1];
        const voucherYear = year;

        for (const row of transactions) {
            console.log("➡️ Inserting row:", row);

            await connection.query(
                `INSERT INTO vouchers (
                    voucher_number,
                    voucher_date,
                    voucher_month,
                    voucher_year,
                    division_type,
                    ledger_code,
                    ledger_name,
                    d1Amount,d1Type,
                    d2Amount,d2Type,
                    d3Amount,d3Type,
                    d4Amount,d4Type,
                    d5Amount,d5Type,
                    totalDr,totalCr,netAmt,
                    narration,
                    created_by,
                    verified_by,
                    approved_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    voucherNumber,
                    formattedDate,
                    voucherMonth,
                    voucherYear,
                    divisionType,
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
                    "Voucher created",
                    createdBy || null,
                    verifiedBy || null,
                    approvedBy || null
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
                v.*,

                l.ledger_name,
                l.tally_report,
                l.debit_credit,
                l.trial_balance,

                cc.sub_group_code,
                cc.main_group_code,
                cc.status,

                sg.sub_group_name,
                mg.main_group_name,

                DATE_FORMAT(v.voucher_date, '%Y-%m-%d') AS voucher_date_formatted,
                DATE_FORMAT(v.created_at, '%Y-%m-%d %H:%i:%s') AS created_at_formatted,

                CASE
                    WHEN v.approved_by IS NOT NULL THEN 'Approved'
                    WHEN v.verified_by IS NOT NULL THEN 'Verified'
                    ELSE 'Created'
                END AS voucher_status

            FROM vouchers v

            LEFT JOIN ledgers l
                ON v.ledger_code = l.ledger_code

            LEFT JOIN connect_consolidates cc
                ON v.ledger_code = cc.ledger_code

            LEFT JOIN sub_groups sg
                ON cc.sub_group_code = sg.sub_group_code

            LEFT JOIN main_groups mg
                ON cc.main_group_code = mg.main_group_code

            ORDER BY v.voucher_number DESC
        `);

        const formattedRows = rows.map(row => ({
            ...row,
            voucher_date: row.voucher_date_formatted || row.voucher_date,
            created_at: row.created_at_formatted || row.created_at
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

export const getVouchersByLedger = async (req, res) => {
    const { ledger } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT * FROM vouchers WHERE ledger_name = ? ORDER BY voucher_date ASC`,
            [ledger]
        );

        res.json({
            success: true,
            data: rows,
        })
    } catch (error) {
        console.error("Ledger fetch error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch ledger vouchers"
        });
        
    }
}

export const updateVoucher = async (req, res) => {
    console.log('📥 Update voucher request:', req.body);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const voucherNumber = req.params.voucherNumber;
        const { divisionType, transactions, month, year, createdBy, verifiedBy, approvedBy } = req.body;

        const [existingVoucher] = await connection.query(
            `SELECT voucher_date FROM vouchers WHERE voucher_number = ? LIMIT 1`,
            [voucherNumber]
        );

        if (existingVoucher.length === 0) {
            throw new Error("Voucher not found");
        }

        const formattedDate = existingVoucher[0].voucher_date;
        console.log("Using existing voucher date:", formattedDate);



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
                    voucher_month,
                    voucher_year,
                    division_type,
                    ledger_code,
                    ledger_name,
                    d1Amount,d1Type,
                    d2Amount,d2Type,
                    d3Amount,d3Type,
                    d4Amount,d4Type,
                    d5Amount,d5Type,
                    totalDr,totalCr,netAmt,
                    narration,
                    created_by,
                    verified_by,
                    approved_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    voucherNumber,
                    formattedDate,
                    month,
                    year,
                    divisionType,
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
                    "Voucher updated",
                    createdBy || null,
                    verifiedBy || null,
                    approvedBy || null
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

export const updateVoucherByLedger = async (req, res) => {

    console.log("📥 Update by ledger request:", req.body);

    const { ledger } = req.params;

    const {
        divisionType,
        transactions,
        createdBy,
        verifiedBy,
        approvedBy
    } = req.body;

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();

        const [existingRows] = await connection.query(
            `SELECT voucher_number, voucher_date, voucher_month, voucher_year
             FROM vouchers 
             WHERE ledger_name = ?`,
            [ledger]
        );

        if (existingRows.length === 0) {
            throw new Error("Ledger vouchers not found");
        }

        const voucherMonth = existingRows[0].voucher_month;
        const voucherYear = existingRows[0].voucher_year;

        console.log(`Found ${existingRows.length} rows for ledger: ${ledger}`);

        // Delete existing ledger rows
        await connection.query(
            `DELETE FROM vouchers WHERE ledger_name = ?`,
            [ledger]
        );

        console.log("🗑 Old ledger rows deleted");

        // Insert updated rows
        for (const row of transactions) {

            console.log("➡️ Inserting updated row:", row);

            await connection.query(
                `INSERT INTO vouchers (
                    voucher_number,
                    voucher_date,
                    voucher_month,
                    voucher_year,
                    division_type,
                    ledger_code,
                    ledger_name,
                    d1Amount,d1Type,
                    d2Amount,d2Type,
                    d3Amount,d3Type,
                    d4Amount,d4Type,
                    d5Amount,d5Type,
                    totalDr,totalCr,netAmt,
                    narration,
                    created_by,
                    verified_by,
                    approved_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    row.voucherNumber || existingRows[0].voucher_number,
                    existingRows[0].voucher_date,
                    voucherMonth,
                    voucherYear,
                    divisionType,
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

                    "Ledger voucher updated",

                    createdBy || null,
                    verifiedBy || null,
                    approvedBy || null
                ]
            );

            console.log("✅ Updated row inserted");

        }

        await connection.commit();

        console.log("🎉 Ledger vouchers updated successfully");

        res.json({
            success: true,
            message: "Ledger vouchers updated successfully"
        });

    } catch (error) {

        console.error("❌ UPDATE LEDGER ERROR:", error);

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
    console.log("📝 Getting random voucher number...");
    
    const sql = `
        SELECT voucher_number, created_at 
        FROM vouchers 
        WHERE voucher_number LIKE 'VCH-%' 
        ORDER BY created_at DESC 
        LIMIT 1
    `;

    pool.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Main query error:", err);
            console.error("Error code:", err.code);
            console.error("Error message:", err.message);
            
            // If created_at doesn't exist, try ordering by id
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log("⚠️ created_at column not found, trying with id...");
                
                const fallbackSql = `
                    SELECT voucher_number 
                    FROM vouchers 
                    WHERE voucher_number LIKE 'VCH-%' 
                    ORDER BY id DESC 
                    LIMIT 1
                `;
                
                return pool.query(fallbackSql, (err2, results2) => {
                    if (err2) {
                        console.error("❌ Fallback query also failed:", err2);
                        console.error("Fallback error code:", err2.code);
                        console.error("Fallback error message:", err2.message);
                        
                        // Instead of returning 500, generate a random number
                        console.log("✅ Generating random fallback number");
                        const today = new Date();
                        const day = String(today.getDate()).padStart(2, "0");
                        const month = String(today.getMonth() + 1).padStart(2, "0");
                        const year = today.getFullYear().toString().slice(-2);
                        const randomSeq = Math.floor(Math.random() * 9000 + 1000).toString().padStart(4, "0");
                        
                        const voucherNumber = `VCH-${day}-${month}-${year}-${randomSeq}`;
                        console.log("✅ Generated random number:", voucherNumber);
                        
                        return res.json({ 
                            success: true, 
                            voucherNumber,
                            method: 'random-fallback'
                        });
                    }
                    
                    console.log("✅ Fallback query successful, results:", results2);
                    
                    let nextSequence = "0001";
                    const today = new Date();
                    const day = String(today.getDate()).padStart(2, "0");
                    const month = String(today.getMonth() + 1).padStart(2, "0");
                    const year = today.getFullYear().toString().slice(-2);

                    if (results2.length > 0 && results2[0].voucher_number) {
                        const lastVoucher = results2[0].voucher_number;
                        console.log("Last voucher from fallback:", lastVoucher);
                        
                        const parts = lastVoucher.split("-");
                        console.log("Parts from fallback:", parts);
                        
                        if (parts.length >= 5) {
                            const lastDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
                            const currentDate = `${day}-${month}-${year}`;
                            
                            if (lastDate === currentDate) {
                                const lastSequence = parseInt(parts[4]) || 0;
                                nextSequence = (lastSequence + 1).toString().padStart(4, "0");
                                console.log("Next sequence from fallback:", nextSequence);
                            }
                        }
                    }

                    const voucherNumber = `VCH-${day}-${month}-${year}-${nextSequence}`;
                    console.log("✅ Generated voucher number from fallback:", voucherNumber);
                    
                    res.json({ 
                        success: true, 
                        voucherNumber,
                        method: 'id-fallback'
                    });
                });
            }
            
            // Instead of returning 500, generate a random number
            console.log("✅ Generating random fallback number due to error");
            const today = new Date();
            const day = String(today.getDate()).padStart(2, "0");
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const year = today.getFullYear().toString().slice(-2);
            const randomSeq = Math.floor(Math.random() * 9000 + 1000).toString().padStart(4, "0");
            
            const voucherNumber = `VCH-${day}-${month}-${year}-${randomSeq}`;
            console.log("✅ Generated random number:", voucherNumber);
            
            return res.json({ 
                success: true, 
                voucherNumber,
                method: 'error-fallback'
            });
        }

        console.log("✅ Main query successful, results:", results);
        
        let nextSequence = "0001";
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear().toString().slice(-2);

        if (results.length > 0 && results[0].voucher_number) {
            const lastVoucher = results[0].voucher_number;
            console.log("Last voucher from main query:", lastVoucher);
            
            const parts = lastVoucher.split("-");
            console.log("Parts from main query:", parts);

            if (parts.length >= 5) {
                const lastDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
                const currentDate = `${day}-${month}-${year}`;

                if (lastDate === currentDate) {
                    const lastSequence = parseInt(parts[4]) || 0;
                    nextSequence = (lastSequence + 1).toString().padStart(4, "0");
                    console.log("Next sequence from main query:", nextSequence);
                }
            }
        }

        const voucherNumber = `VCH-${day}-${month}-${year}-${nextSequence}`;
        console.log("✅ Generated voucher number from main query:", voucherNumber);
        
        res.json({ 
            success: true, 
            voucherNumber,
            method: 'main-query'
        });
    });
};