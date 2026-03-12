import express from "express";

import {
    getAllConsolidations,
    getActiveConsolidations,
    getInactiveConsolidations,
    mergeLedger,
    demergeLedger,
    deleteConsolidation,
    getLedgerConsolidation
} from "../controllers/consolidationController.js";

const router = express.Router();

router.get("/", getAllConsolidations);

router.get("/active", getActiveConsolidations);

router.get("/inactive", getInactiveConsolidations);

router.get("/ledger/:ledger_code", getLedgerConsolidation);

router.post("/merge", mergeLedger);

router.put("/demerge/:ledger_code", demergeLedger);

router.delete("/:id", deleteConsolidation);

export default router;