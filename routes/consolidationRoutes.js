import express from "express";
import {
    getAllConsolidated,
    getConsolidatedByLedger,
    mergeLedger,
    demergeLedger,
    getActiveConsolidations,
    getInactiveConsolidations,
    getLedgerConsolidation,
    createConsolidation,
    updateConsolidation,
    deleteConsolidation
} from "../controllers/consolidationController.js";

const router = express.Router();

router.get("/", getAllConsolidated);
router.get("/by-ledger", getConsolidatedByLedger);
router.get("/active", getActiveConsolidations);
router.get("/inactive", getInactiveConsolidations);
router.get("/ledger/:ledger_code", getLedgerConsolidation);

router.post("/merge", mergeLedger);
router.post("/demerge/:ledger_code", demergeLedger);

router.post("/", createConsolidation);
router.put("/:id", updateConsolidation);
router.delete("/:id", deleteConsolidation);

export default router;