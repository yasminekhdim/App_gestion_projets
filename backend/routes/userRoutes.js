import express from "express";
import multer from "multer";
import { getProfile, updateProfilePicture } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configuration de multer pour les photos de profil
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max pour les photos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé. Formats acceptés: JPG, PNG, GIF, WEBP"), false);
    }
  },
});

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Route pour récupérer le profil
router.get("/profile", getProfile);

// Route pour mettre à jour la photo de profil
router.put("/profile/picture", (req, res, next) => {
  upload.single("profilePic")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Le fichier est trop volumineux (max 5MB)" });
        }
        return res.status(400).json({ message: "Erreur lors du téléversement du fichier" });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, updateProfilePicture);

export default router;

