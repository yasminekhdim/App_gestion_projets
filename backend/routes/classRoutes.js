import express from "express";
import { getClassesByDepartment } from "../controllers/classController.js";

const router = express.Router();

// Route pour récupérer les classes par département
router.get("/:departement", getClassesByDepartment);

export default router;

