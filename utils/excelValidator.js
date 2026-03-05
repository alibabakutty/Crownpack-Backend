export const validateMainGroupRow = (row, rowNumber) => {
    const errors = [];
    
    const main_group_code = row.getCell(1).value?.toString() || null;
    const main_group_name = row.getCell(2).value?.toString();
    const tally_report = row.getCell(3).value?.toString() || null;
    const sub_report = row.getCell(4).value?.toString() || null;
    const debit_credit = row.getCell(5).value?.toString() || null;
    const trial_balance = row.getCell(6).value?.toString() || null;
    const status = row.getCell(7).value?.toString() || 'Active';

    if (!main_group_name) {
        errors.push(`Row ${rowNumber}: Main Group Name is required`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: {
            main_group_code,
            main_group_name,
            tally_report,
            sub_report,
            debit_credit,
            trial_balance,
            status
        }
    };
};

export const validateSubGroupRow = (row, rowNumber) => {
    const errors = [];
    
    const sub_group_code = row.getCell(1).value?.toString() || null;
    const sub_group_name = row.getCell(2).value?.toString();
    const tally_report = row.getCell(3).value?.toString() || null;
    const sub_report = row.getCell(4).value?.toString() || null;
    const debit_credit = row.getCell(5).value?.toString() || null;
    const trial_balance = row.getCell(6).value?.toString() || null;
    const status = row.getCell(7).value?.toString() || 'Active';

    if (!sub_group_name) {
        errors.push(`Row ${rowNumber}: Sub Group Name is required`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: {
            sub_group_code,
            sub_group_name,
            tally_report,
            sub_report,
            debit_credit,
            trial_balance,
            status
        }
    };
};

export const validateLedgerRow = (row, rowNumber) => {
    const errors = [];
    
    const ledger_code = row.getCell(1).value?.toString() || null;
    const ledger_name = row.getCell(2).value?.toString();
    const tally_report = row.getCell(3).value?.toString() || null;
    const debit_credit = row.getCell(4).value?.toString() || null;
    const trial_balance = row.getCell(5).value?.toString() || null;
    const status = row.getCell(6).value?.toString() || 'Active';
    const link_status = row.getCell(7).value?.toString() || null;

    if (!ledger_name) {
        errors.push(`Row ${rowNumber}: Ledger Name is required`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: {
            ledger_code,
            ledger_name,
            tally_report,
            debit_credit,
            trial_balance,
            status,
            link_status
        }
    };
};

export const validateConnectConsolidateRow = (row, rowNumber) => {
    const errors = [];
    
    const serial_no = row.getCell(1).value || 0;
    const ledger_code = row.getCell(2).value?.toString() || null;
    const sub_group_code = row.getCell(3).value?.toString() || null;
    const main_group_code = row.getCell(4).value?.toString() || null;
    const status = row.getCell(5).value?.toString() || 'Active';

    if (!ledger_code && !sub_group_code && !main_group_code) {
        errors.push(`Row ${rowNumber}: At least one code (Ledger, Sub Group, or Main Group) is required`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: {
            serial_no,
            ledger_code,
            sub_group_code,
            main_group_code,
            status
        }
    };
};