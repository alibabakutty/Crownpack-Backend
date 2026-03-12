import pool from "../config/database.js";
import db from "../config/database.js"

/* =========================================
   GET ALL CONSOLIDATIONS
========================================= */

export const getAllConsolidations = async (req, res) => {
  try {

    const sql = `
      SELECT 
        cc.id,
        cc.serial_no,
        l.ledger_code,
        l.ledger_name,
        cc.sub_group_code,
        sg.sub_group_name,
        cc.main_group_code,
        mg.main_group_name,
        l.tally_report,
        l.debit_credit,
        l.trial_balance,
        cc.status
      FROM connect_consolidates cc
      JOIN ledgers l 
        ON l.ledger_code = cc.ledger_code
      LEFT JOIN sub_groups sg 
        ON sg.sub_group_code = cc.sub_group_code
      LEFT JOIN main_groups mg 
        ON mg.main_group_code = cc.main_group_code
      ORDER BY cc.serial_no
    `;

    const [rows] = await pool.execute(sql);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {

    console.error("Error fetching consolidations:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
};


/* =========================================
   GET ACTIVE CONSOLIDATIONS
========================================= */

export const getActiveConsolidations = async (req, res) => {

    try {

        const sql = `
            SELECT 
                cc.serial_no,
                l.ledger_code,
                l.ledger_name,
                sg.sub_group_name,
                mg.main_group_name
            FROM connect_consolidates cc
            JOIN ledgers l ON l.ledger_code = cc.ledger_code
            LEFT JOIN sub_groups sg ON sg.sub_group_code = cc.sub_group_code
            LEFT JOIN main_groups mg ON mg.main_group_code = cc.main_group_code
            WHERE cc.status = 'active'
            ORDER BY cc.serial_no
        `;

        const [rows] = await pool.execute(sql);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error("Error fetching active consolidations:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};


/* =========================================
   GET INACTIVE LEDGERS
========================================= */

export const getInactiveConsolidations = async (req, res) => {

    try {

        const sql = `
            SELECT 
                l.ledger_code,
                l.ledger_name
            FROM ledgers l
            LEFT JOIN connect_consolidates cc 
                ON l.ledger_code = cc.ledger_code
            WHERE cc.ledger_code IS NULL
               OR cc.status = 'inactive'
            ORDER BY l.ledger_name
        `;

        const [rows] = await pool.execute(sql);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error("Error fetching inactive consolidations:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};


export const getLedgerConsolidation = async (req, res) => {

  try {

    const { ledger_code } = req.params;

    const [rows] = await db.query(`
      SELECT 
        l.ledger_code,
        l.ledger_name,
        cc.sub_group_code,
        sg.sub_group_name,
        cc.main_group_code,
        mg.main_group_name,
        l.tally_report,
        l.debit_credit,
        l.trial_balance,
        cc.status
      FROM connect_consolidates cc
      LEFT JOIN ledgers l 
        ON l.ledger_code = cc.ledger_code
      LEFT JOIN sub_groups sg 
        ON sg.sub_group_code = cc.sub_group_code
      LEFT JOIN main_groups mg 
        ON mg.main_group_code = cc.main_group_code
      WHERE cc.ledger_code = ?
    `, [ledger_code]);

    res.json(rows);

  } catch (error) {

    console.error("Error fetching ledger consolidation:", error);

    res.status(500).json({
      message: "Error fetching ledger consolidation"
    });

  }

};


/* =========================================
   MERGE LEDGER
========================================= */

export const mergeLedger = async (req, res) => {
  try {

    console.log("REQUEST BODY:", req.body);

    const { ledger_code, sub_group_code, main_group_code } = req.body;

    if (!ledger_code) {
      return res.status(400).json({ error: "ledger_code required" });
    }

    // 1️⃣ Generate serial number
    const [serialRows] = await db.query(
      "SELECT MAX(serial_no) AS maxSerial FROM connect_consolidates"
    );

    const serial_no = (serialRows[0].maxSerial || 0) + 1;

    // 2️⃣ Fetch subgroup name
    let subGroupName = null;

    if (sub_group_code) {
      const [subRows] = await db.query(
        "SELECT sub_group_name FROM sub_groups WHERE sub_group_code=?",
        [sub_group_code]
      );

      subGroupName = subRows.length ? subRows[0].sub_group_name : null;
    }

    // 3️⃣ Fetch main group name
    let mainGroupName = null;

    if (main_group_code) {
      const [mainRows] = await db.query(
        "SELECT main_group_name FROM main_groups WHERE main_group_code=?",
        [main_group_code]
      );

      mainGroupName = mainRows.length ? mainRows[0].main_group_name : null;
    }

    // 4️⃣ Insert into connect_consolidates
    await db.query(
      `INSERT INTO connect_consolidates
       (serial_no, ledger_code, sub_group_code, main_group_code, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [serial_no, ledger_code, sub_group_code || null, main_group_code || null]
    );

    // 5️⃣ Update ledgers table
    await db.query(
      `UPDATE ledgers
       SET consolidated_sub_group_code=?,
           consolidated_sub_group_name=?,
           consolidated_main_group_code=?,
           consolidated_main_group_name=?,
           consolidation_status='active',
           link_status='active'
       WHERE ledger_code=?`,
      [
        sub_group_code || null,
        subGroupName,
        main_group_code || null,
        mainGroupName,
        ledger_code
      ]
    );

    res.json({
      message: "Ledger consolidated successfully"
    });

  } catch (error) {

    console.error("❌ MERGE ERROR:", error);

    res.status(500).json({
      error: error.message
    });
  }
};


/* =========================================
   DEMERGE LEDGER
========================================= */

export const demergeLedger = async (req, res) => {

  try {

    const { ledger_code } = req.params;

    await db.query(
      `UPDATE ledgers
       SET consolidated_sub_group_code=NULL,
           consolidated_sub_group_name=NULL,
           consolidated_main_group_code=NULL,
           consolidated_main_group_name=NULL,
           consolidation_status='inactive'
       WHERE ledger_code=?`,
      [ledger_code]
    );

    await db.query(
      `DELETE FROM connect_consolidates
       WHERE ledger_code=?`,
      [ledger_code]
    );

    res.json({
      message: "Ledger demerged successfully"
    });

  } catch (error) {
    console.error("Demerge error:", error);
    res.status(500).json({ error: error.message });
  }

};


/* =========================================
   DELETE CONSOLIDATION
========================================= */

export const deleteConsolidation = async (req, res) => {

    const { id } = req.params;

    try {

        const [result] = await pool.execute(
            "DELETE FROM connect_consolidates WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                error: "Consolidation record not found"
            });

        }

        res.json({
            success: true,
            message: "Consolidation deleted successfully"
        });

    } catch (error) {

        console.error("Error deleting consolidation:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

};