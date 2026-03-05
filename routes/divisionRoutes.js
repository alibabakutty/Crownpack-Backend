import express from "express";
import {
    getAllDivisions,
    createDivisions,
    updateDivisions,
    deleteDivision
} from "../controllers/divisionController.js";

const router = express.Router();

router.get("/", getAllDivisions);
router.post("/", createDivisions);
router.put("/", updateDivisions);
router.delete("/:id", deleteDivision);

export default router;