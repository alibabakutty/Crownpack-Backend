import express from "express";
import {
    createVoucher,
    getAllVouchers,
    getVoucherById,
    updateVoucherStatus,
    deleteVoucher
} from "../controllers/voucherController.js";

const router = express.Router();

router.get("/", getAllVouchers);
router.get("/:id", getVoucherById);
router.post("/", createVoucher);
router.put("/:id/status", updateVoucherStatus);
router.delete("/:id", deleteVoucher);

export default router;