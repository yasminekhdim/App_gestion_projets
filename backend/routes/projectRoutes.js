import express from "express";
import {
  createProject,
  getClassStudents,
  assignStudentsToProject,
  getTeacherProjects,
  updateProject,
  removeStudentFromProject,
  deleteProject,
} from "../controllers/projectController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadFiles } from "../middleware/multerMiddleware.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Route pour créer un projet (supporte multipart uploads via `files`)
router.post("/", uploadFiles("files", 10), createProject);

// Route pour récupérer les étudiants d'une classe
router.get("/classes/:classe_id/students", getClassStudents);

// Route pour assigner des étudiants à un projet
router.post("/:project_id/students", assignStudentsToProject);
// Route pour retirer un étudiant d'un projet
router.delete('/:project_id/students/:student_id', removeStudentFromProject);

// Route pour modifier un projet (supporte multipart uploads via `files`)
router.put('/:project_id', uploadFiles('files', 10), updateProject);

// Route pour supprimer un projet
router.delete('/:project_id', deleteProject);

// Route pour récupérer tous les projets de l'enseignant
router.get("/", getTeacherProjects);

export default router;

