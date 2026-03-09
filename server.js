import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

// Import routes
import importRoutes from "./routes/importRoutes.js";
import mainGroupRoutes from "./routes/mainGroupRoutes.js";
import subGroupRoutes from "./routes/subGroupRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import divisionRoutes from "./routes/divisionRoutes.js";
import consolidationRoutes from "./routes/consolidationRoutes.js";
import voucherRoutes from "./routes/voucherRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/import", importRoutes);
app.use("/main_groups", mainGroupRoutes);
app.use("/sub_groups", subGroupRoutes);
app.use("/ledgers", ledgerRoutes);
app.use("/divisions", divisionRoutes);
app.use("/consolidated", consolidationRoutes);
app.use("/vouchers", voucherRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: 'File upload error: ' + error.message });
    }
    res.status(500).json({ error: error.message });
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});