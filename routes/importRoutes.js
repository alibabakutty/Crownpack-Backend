import express from "express";
import { upload, handleMulterError } from "../middleware/uploadMiddleware.js";
import {
    importMainGroups,
    importSubGroups,
    importLedgers,
    importConnectConsolidates
} from "../controllers/importController.js";

const router = express.Router();

router.post("/main-groups", upload.single('file'), handleMulterError, importMainGroups);
router.post("/sub-groups", upload.single('file'), handleMulterError, importSubGroups);
router.post("/ledgers", upload.single('file'), handleMulterError, importLedgers);
router.post("/connect-consolidates", upload.single('file'), handleMulterError, importConnectConsolidates);

export default router;