import express from "express";
import {
    getMainGroups,
    createMainGroup
} from "../controllers/mainGroupController.js";

const router = express.Router();

router.get("/", getMainGroups);
router.post("/", createMainGroup);

export default router;