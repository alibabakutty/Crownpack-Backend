import express from "express";
import {
    createVoucher,
    getAllVouchers,
    getVoucherByNumber,
    updateVoucher,
    getNextVoucherNumber,
    getRandomVoucherNumber,
    getVouchersByLedger,
    updateVoucherByLedger
} from "../controllers/voucherController.js";

const router = express.Router();

router.get("/", getAllVouchers);
router.get("/next-number", getNextVoucherNumber);
router.get("/random-number", getRandomVoucherNumber);
router.get("/:voucher_number", getVoucherByNumber);
router.get("/ledger/:ledger", getVouchersByLedger);
router.post("/", createVoucher);
router.put("/:voucherNumber", updateVoucher);
router.put("/ledger/:ledger", updateVoucherByLedger);

export default router;