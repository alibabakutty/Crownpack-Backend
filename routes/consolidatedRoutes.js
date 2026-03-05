import express from "express";
import {
    getAllConsolidated,
    getConsolidatedByLedger,
    getConsolidatedForLedger,
    mergeLedger,
    demergeLedger,
    getActiveConsolidations,
    getInactiveConsolidations
} from "../controllers/consolidatedController.js";

const router = express.Router();

router.get("/", getAllConsolidated);
router.get("/by-ledger", getConsolidatedByLedger);
router.get("/active", getActiveConsolidations);
router.get("/inactive", getInactiveConsolidations);
router.get("/ledger/:ledger_code", getConsolidatedForLedger);

router.post("/merge", mergeLedger);
router.post("/demerge/:ledger_code", demergeLedger);

export default router;