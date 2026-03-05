import pool from "../config/database.js";

export const getAllDivisions = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM divisions ORDER BY position");
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const createDivisions = async (req, res, next) => {
    try {
        const { divisions } = req.body;

        if (!divisions || divisions.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: "No divisions provided" 
            });
        }

        // Prepare values
        const values = divisions.map((division, index) => [
            division,
            index + 1
        ]);

        const query = `
            INSERT INTO divisions (division_name, position)
            VALUES ?
        `;

        const [result] = await pool.query(query, [values]);

        res.json({
            success: true,
            message: "Divisions inserted successfully",
            inserted: result.affectedRows
        });

    } catch (error) {
        next(error);
    }
};

export const updateDivisions = async (req, res, next) => {
    try {
        const { divisions } = req.body;

        if (!divisions || divisions.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: "No divisions provided" 
            });
        }

        const ids = divisions.map(d => d.id);

        // Build CASE statement
        let caseStatement = "CASE id ";
        divisions.forEach(d => {
            caseStatement += `WHEN ${d.id} THEN ? `;
        });
        caseStatement += "END";

        const query = `
            UPDATE divisions
            SET division_name = ${caseStatement}
            WHERE id IN (${ids.join(",")})
        `;

        const values = divisions.map(d => d.division_name);

        const [result] = await pool.query(query, values);

        res.json({
            success: true,
            message: "Divisions updated successfully",
            updated: result.affectedRows
        });

    } catch (error) {
        next(error);
    }
};

export const deleteDivision = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM divisions WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Division not found"
            });
        }

        res.json({
            success: true,
            message: "Division deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};