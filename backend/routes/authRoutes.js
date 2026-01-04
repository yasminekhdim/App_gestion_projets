import express from "express";
import multer from "multer";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

// Configuration de multer pour gérer les fichiers en mémoire
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter PDF et images
    const allowedMimes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé. Formats acceptés: PDF, JPG, PNG"), false);
    }
  },
});

// Route pour s'inscrire (avec upload de fichier)
router.post("/register", (req, res, next) => {
  upload.single("proofOfId")(req, res, (err) => {
    if (err) {
      // Gérer les erreurs multer
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Le fichier est trop volumineux (max 10MB)" });
        }
        return res.status(400).json({ message: "Erreur lors du téléversement du fichier" });
      }
      // Erreur de validation de type de fichier
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, register);

// Route pour se connecter
router.post("/login", login);

export default router;