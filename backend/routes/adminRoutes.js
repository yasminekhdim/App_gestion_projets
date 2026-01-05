import express from "express";
import { getPendingUsers, approveUser, rejectUser, getApprovedUsers,toggleUserStatus,deleteUser, getAdminDashboardStats, getAdminProfile, updateProfile, changePassword } from "../controllers/adminController.js";
import { verifyToken, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route : Voir les comptes en attente
router.get("/pending", verifyToken, requireAdmin, getPendingUsers);

// Route : Approuver un compte
router.put("/approve/:id", verifyToken, requireAdmin, approveUser);

// Route : Rejeter un compte + raison
router.put("/reject/:id", verifyToken, requireAdmin, rejectUser);

// 🔹 Gestion des utilisateurs approuvés
router.get("/users", verifyToken, requireAdmin, getApprovedUsers);
router.put("/users/:id/status", verifyToken, requireAdmin, toggleUserStatus);
router.delete("/users/:id", verifyToken, requireAdmin, deleteUser);

router.get("/dashboard",verifyToken,requireAdmin,getAdminDashboardStats);

// ================= ADMIN PROFILE =================
router.get("/profile", verifyToken, requireAdmin, getAdminProfile);
router.put("/profile", verifyToken, requireAdmin, updateProfile);
router.put("/change-password", verifyToken, requireAdmin, changePassword);


export default router;
