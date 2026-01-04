import express from "express";
import {
  getProjectDetails,
  getProjectStudents,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadFiles } from "../middleware/multerMiddleware.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Route pour récupérer les détails d'un projet avec ses tâches
router.get("/projects/:project_id", getProjectDetails);

// Route pour récupérer les étudiants d'un projet
router.get("/projects/:project_id/students", getProjectStudents);

// Route pour créer une tâche (supporte multipart uploads via `files`)
router.post("/projects/:project_id/tasks", uploadFiles('files', 10), createTask);

// Route pour modifier une tâche (supporte multipart uploads via `files`)
router.put("/tasks/:task_id", uploadFiles('files', 10), updateTask);

// Route pour supprimer une tâche
router.delete("/tasks/:task_id", deleteTask);

export default router;

