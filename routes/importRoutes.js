import express from "express";
import upload from "../config/upload.js";
import {
    importMainGroups,
    // importSubGroups,
    // importLedgers,
    // importConnectConsolidates
} from "../controllers/importController.js";

const router = express.Router();

router.post("/main-groups", upload.single('file'), importMainGroups);
// router.post("/sub-groups", upload.single('file'), importSubGroups);
// router.post("/ledgers", upload.single('file'), importLedgers);
// router.post("/connect-consolidates", upload.single('file'), importConnectConsolidates);

export default router;