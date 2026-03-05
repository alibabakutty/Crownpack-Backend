import express from "express";
import {
    getAllSubGroups,
    createSubGroup,
    updateSubGroup,
    deleteSubGroup
} from "../controllers/subGroupController.js";

const router = express.Router();

router.get("/", getAllSubGroups);
router.post("/", createSubGroup);
router.put("/:id", updateSubGroup);
router.delete("/:id", deleteSubGroup);

export default router;