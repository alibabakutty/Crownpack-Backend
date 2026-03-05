export const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);

    // Default error
    let error = { ...err };
    error.message = err.message;

    // Multer error
    if (err.code === 'LIMIT_FILE_SIZE') {
        error.message = 'File too large. Maximum size is 10MB.';
        return res.status(400).json({ error: error.message });
    }

    // MySQL duplicate entry
    if (err.code === 'ER_DUP_ENTRY') {
        error.message = 'Duplicate entry found';
        return res.status(409).json({ error: error.message });
    }

    // MySQL foreign key constraint
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        error.message = 'Referenced record does not exist';
        return res.status(400).json({ error: error.message });
    }

    // Send response
    res.status(error.statusCode || 500).json({
        error: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};