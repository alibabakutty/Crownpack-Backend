import express from "express";
import {
    createVoucher,
    getAllVouchers,
    getVoucherByNumber,
    updateVoucher,
    getNextVoucherNumber,
    getRandomVoucherNumber
} from "../controllers/voucherController.js";

const router = express.Router();

router.get("/", getAllVouchers);
router.get("/next-number", getNextVoucherNumber);
router.get("/random-number", getRandomVoucherNumber);
router.get("/:voucher_number", getVoucherByNumber);

router.post("/", createVoucher);
router.put("/:voucherNumber", updateVoucher);

export default router;