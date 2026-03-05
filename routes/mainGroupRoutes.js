import express from "express";
import {
    getAllMainGroups,
    createMainGroup,
    updateMainGroup,
    deleteMainGroup,
    getMainGroupById
} from "../controllers/mainGroupController.js";

const router = express.Router();

router.get("/", getAllMainGroups);
router.get("/:id", getMainGroupById);
router.post("/", createMainGroup);
router.put("/:id", updateMainGroup);
router.delete("/:id", deleteMainGroup);

export default router;