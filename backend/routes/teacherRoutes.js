import express from "express";
import {
  getTeacherClasses,
  getAvailableClasses,
  assignClass,
  unassignClass,
  getTeacherStudents,
  getTeacherStudentsCount,
  getTasksStats,
} from "../controllers/teacherController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Route pour récupérer les classes assignées à l'enseignant
router.get("/classes", getTeacherClasses);

// Route pour récupérer les classes disponibles (non assignées)
router.get("/classes/available", getAvailableClasses);

// Route pour assigner une classe
router.post("/classes", assignClass);

// Route pour retirer une classe
router.delete("/classes/:affectation_id", unassignClass);

// Route pour récupérer les étudiants de l'enseignant
router.get("/students", getTeacherStudents);

// Route pour récupérer le nombre total d'étudiants
router.get("/students/count", getTeacherStudentsCount);

// Route pour récupérer les statistiques des tâches
router.get("/tasks/stats", getTasksStats);

export default router;

