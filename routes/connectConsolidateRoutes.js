import express from "express";
import {
    getAllConnectConsolidates,
    createConnectConsolidate,
    updateConnectConsolidate,
    deleteConnectConsolidate
} from "../controllers/connectConsolidateController.js";

const router = express.Router();

router.get("/", getAllConnectConsolidates);
router.post("/", createConnectConsolidate);
router.put("/:id", updateConnectConsolidate);
router.delete("/:id", deleteConnectConsolidate);

export default router;