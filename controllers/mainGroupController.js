import pool from "../config/database.js";

export const getMainGroups = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM main_groups");
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("❌ Error fetching main groups:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

export const createMainGroup = async (req, res) => {
    try {
        const { main_group_code, main_group_name } = req.body;

        const sql = `
            INSERT INTO main_groups (main_group_code, main_group_name) 
            VALUES (?, ?)
        `;

        const [result] = await pool.query(sql, [
            main_group_code,
            main_group_name
        ]);

        res.json({
            success: true,
            message: "Main group created successfully",
            id: result.insertId
        });

    } catch (error) {
        console.error("Error inserting main group:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};