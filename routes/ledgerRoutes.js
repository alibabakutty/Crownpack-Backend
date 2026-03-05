import express from "express";
import {
    getAllLedgers,
    createLedger,
    updateLedger,
    deleteLedger,
    getLedgerByCode
} from "../controllers/ledgerController.js";

const router = express.Router();

router.get("/", getAllLedgers);
router.get("/:ledger_code", getLedgerByCode);
router.post("/", createLedger);
router.put("/:id", updateLedger);
router.delete("/:id", deleteLedger);

export default router;