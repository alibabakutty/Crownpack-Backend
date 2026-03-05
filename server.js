import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import mainGroupRoutes from "./routes/mainGroupRoutes.js";
import subGroupRoutes from "./routes/subGroupRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import divisionRoutes from "./routes/divisionRoutes.js";
import connectConsolidateRoutes from "./routes/connectConsolidateRoutes.js";
import consolidatedRoutes from "./routes/consolidatedRoutes.js";
import voucherRoutes from "./routes/voucherRoutes.js";
import importRoutes from "./routes/importRoutes.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";

// Configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
app.use("/api/main-groups", mainGroupRoutes);
app.use("/api/sub-groups", subGroupRoutes);
app.use("/api/ledgers", ledgerRoutes);
app.use("/api/divisions", divisionRoutes);
app.use("/api/connect-consolidates", connectConsolidateRoutes);
app.use("/api/consolidated", consolidatedRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/import", importRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});