import pool from "../config/database.js";

class ConsolidationService {
    async mergeLedger(ledgerCode, subGroupCode, mainGroupCode) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Get sub_group and main_group names
            let subGroupName = null;
            let mainGroupName = null;

            if (subGroupCode) {
                const [subGroupResult] = await connection.execute(
                    "SELECT sub_group_name FROM sub_groups WHERE sub_group_code = ?",
                    [subGroupCode]
                );
                subGroupName = subGroupResult[0]?.sub_group_name || null;
            }

            if (mainGroupCode) {
                const [mainGroupResult] = await connection.execute(
                    "SELECT main_group_name FROM main_groups WHERE main_group_code = ?",
                    [mainGroupCode]
                );
                mainGroupName = mainGroupResult[0]?.main_group_name || null;
            }

            // Update ledger table with consolidation data
            await connection.execute(
                `UPDATE ledgers 
                 SET link_status = 'active',
                     consolidated_sub_group_code = ?,
                     consolidated_sub_group_name = ?,
                     consolidated_main_group_code = ?,
                     consolidated_main_group_name = ?,
                     consolidation_status = 'active'
                 WHERE ledger_code = ?`,
                [subGroupCode, subGroupName, mainGroupCode, mainGroupName, ledgerCode]
            );

            await connection.commit();

            return {
                ledgerCode,
                subGroupCode,
                subGroupName,
                mainGroupCode,
                mainGroupName
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async demergeLedger(ledgerCode) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            await connection.execute(
                `UPDATE ledgers 
                 SET link_status = 'inactive',
                     consolidated_sub_group_code = NULL,
                     consolidated_sub_group_name = NULL,
                     consolidated_main_group_code = NULL,
                     consolidated_main_group_name = NULL,
                     consolidation_status = 'inactive'
                 WHERE ledger_code = ?`,
                [ledgerCode]
            );

            await connection.commit();

            return { ledgerCode };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getActiveConsolidations() {
        const sql = `
            SELECT 
                l.*,
                cc.sub_group_code,
                sg.sub_group_name,
                cc.main_group_code,
                mg.main_group_name,
                cc.status as consolidation_status
            FROM ledgers l
            INNER JOIN connect_consolidates cc 
                ON l.ledger_code = cc.ledger_code 
                AND cc.status = 'active'
            LEFT JOIN sub_groups sg 
                ON cc.sub_group_code = sg.sub_group_code
            LEFT JOIN main_groups mg 
                ON cc.main_group_code = mg.main_group_code
            ORDER BY cc.serial_no
        `;

        const [rows] = await pool.query(sql);
        return rows;
    }

    async getInactiveConsolidations() {
        const sql = `
            SELECT 
                l.*,
                'inactive' as consolidation_status
            FROM ledgers l
            WHERE l.ledger_code NOT IN (
                SELECT ledger_code FROM connect_consolidates WHERE status = 'active'
            )
            OR l.ledger_code IN (
                SELECT ledger_code FROM connect_consolidates WHERE status = 'inactive'
            )
            ORDER BY l.ledger_code
        `;

        const [rows] = await pool.query(sql);
        return rows;
    }
}

export default new ConsolidationService();