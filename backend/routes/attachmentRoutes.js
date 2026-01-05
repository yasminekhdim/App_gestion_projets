import express from "express";
import multer from "multer";
import {
  addAttachments,
  getAttachments,
  deleteAttachment,
} from "../controllers/attachmentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import db from "../config/db.js";

const router = express.Router();

// Configuration de multer pour plusieurs fichiers
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max par fichier
    files: 10, // Maximum 10 fichiers à la fois
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
      "application/x-zip-compressed",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Type de fichier non autorisé. Formats acceptés: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, XLS, XLSX, ZIP"
        ),
        false
      );
    }
  },
});

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Route pour ajouter des pièces jointes
router.post("/", (req, res, next) => {
  upload.array("files", 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Un ou plusieurs fichiers sont trop volumineux (max 10MB chacun)" });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ message: "Trop de fichiers (max 10 à la fois)" });
        }
        return res.status(400).json({ message: "Erreur lors du téléversement des fichiers" });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, addAttachments);

// Route pour afficher / rediriger vers un attachment - utile pour ouvrir dans un nouvel onglet
router.get('/id/:attachment_id/view', async (req, res) => {
  try {
    const { attachment_id } = req.params;
    // Delegate to controller-like logic inline to reuse verifyToken above
    const [attachments] = await db.query(
      `SELECT a.id, a.fichier_url, a.fichier_name, a.file_type, a.entity_type, a.entity_id,
        CASE WHEN a.entity_type = 'projet' THEN p.enseignant_id
             WHEN a.entity_type = 'tache' THEN p2.enseignant_id
        END as enseignant_id
       FROM attachments a
       LEFT JOIN projets p ON a.entity_type = 'projet' AND a.entity_id = p.id
       LEFT JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
       LEFT JOIN projets p2 ON a.entity_type = 'tache' AND t.projet_id = p2.id
       WHERE a.id = ?`,
      [attachment_id]
    );

    if (attachments.length === 0) return res.status(404).json({ message: 'Pièce jointe introuvable.' });
    const attachment = attachments[0];

    if (attachment.enseignant_id !== req.userId) {
      return res.status(403).json({ message: "Vous n'avez pas la permission d'accéder à cette pièce jointe." });
    }

    // Redirect to stored secure URL directly
    res.redirect(attachment.fichier_url);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// New route: return stored URL as JSON (authenticated) so frontend can open in new tab
router.get('/id/:attachment_id/signed', async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const [attachments] = await db.query(
      `SELECT a.id, a.fichier_url, a.fichier_name, a.file_type, a.entity_type, a.entity_id,
        CASE WHEN a.entity_type = 'projet' THEN p.enseignant_id
             WHEN a.entity_type = 'tache' THEN p2.enseignant_id
        END as enseignant_id
       FROM attachments a
       LEFT JOIN projets p ON a.entity_type = 'projet' AND a.entity_id = p.id
       LEFT JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
       LEFT JOIN projets p2 ON a.entity_type = 'tache' AND t.projet_id = p2.id
       WHERE a.id = ?`,
      [attachment_id]
    );

    if (attachments.length === 0) return res.status(404).json({ message: 'Pièce jointe introuvable.' });
    const attachment = attachments[0];

    if (attachment.enseignant_id !== req.userId) {
      return res.status(403).json({ message: "Vous n'avez pas la permission d'accéder à cette pièce jointe." });
    }

    // Return stored secure URL directly
    res.status(200).json({ url: attachment.fichier_url });
  } catch (error) {
    console.error('Erreur lors de la récupération de l URL:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Route pour stream un attachment via le serveur (evite CORS/401 côté client)
router.get('/id/:attachment_id/stream', async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const [attachments] = await db.query(
      `SELECT a.id, a.fichier_url, a.fichier_name, a.file_type, a.entity_type, a.entity_id,
        CASE WHEN a.entity_type = 'projet' THEN p.enseignant_id
             WHEN a.entity_type = 'tache' THEN p2.enseignant_id
        END as enseignant_id
       FROM attachments a
       LEFT JOIN projets p ON a.entity_type = 'projet' AND a.entity_id = p.id
       LEFT JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
       LEFT JOIN projets p2 ON a.entity_type = 'tache' AND t.projet_id = p2.id
       WHERE a.id = ?`,
      [attachment_id]
    );

    if (attachments.length === 0) return res.status(404).json({ message: 'Pièce jointe introuvable.' });
    const attachment = attachments[0];

    if (attachment.enseignant_id !== req.userId) {
      return res.status(403).json({ message: "Vous n'avez pas la permission d'accéder à cette pièce jointe." });
    }

    // Use stored secure URL directly
    const https = await import('https');
    https.get(attachment.fichier_url, (remoteRes) => {
      if (remoteRes.statusCode !== 200) {
        return res.status(remoteRes.statusCode).send('Erreur lors de la récupération du fichier.');
      }
      res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // Serve inline so browser can preview
      res.setHeader('Content-Disposition', `inline; filename="${attachment.fichier_name}"`);
      remoteRes.pipe(res);
    }).on('error', (err) => {
      console.error('Erreur lors du proxy du fichier:', err);
      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier.' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Route pour télécharger un attachment (force download)
router.get('/id/:attachment_id/download', async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const [attachments] = await db.query(
      `SELECT a.id, a.fichier_url, a.fichier_name, a.file_type, a.entity_type, a.entity_id,
        CASE WHEN a.entity_type = 'projet' THEN p.enseignant_id
             WHEN a.entity_type = 'tache' THEN p2.enseignant_id
        END as enseignant_id
       FROM attachments a
       LEFT JOIN projets p ON a.entity_type = 'projet' AND a.entity_id = p.id
       LEFT JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
       LEFT JOIN projets p2 ON a.entity_type = 'tache' AND t.projet_id = p2.id
       WHERE a.id = ?`,
      [attachment_id]
    );

    if (attachments.length === 0) return res.status(404).json({ message: 'Pièce jointe introuvable.' });
    const attachment = attachments[0];

    if (attachment.enseignant_id !== req.userId) {
      return res.status(403).json({ message: "Vous n'avez pas la permission d'accéder à cette pièce jointe." });
    }

    const https = await import('https');
    https.get(attachment.fichier_url, (remoteRes) => {
      if (remoteRes.statusCode !== 200) {
        return res.status(remoteRes.statusCode).send('Erreur lors de la récupération du fichier.');
      }
      res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fichier_name}"`);
      remoteRes.pipe(res);
    }).on('error', (err) => {
      console.error('Erreur lors du proxy du fichier (download):', err);
      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier.' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
// ... code existant ...

// New route: return stored URL as JSON (authenticated) so frontend can open in new tab
router.get('/id/:attachment_id/signed', async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const [attachments] = await db.query(
      `SELECT a.id, a.fichier_url, a.fichier_name, a.file_type, a.entity_type, a.entity_id,
        CASE WHEN a.entity_type = 'projet' THEN p.enseignant_id
             WHEN a.entity_type = 'tache' THEN p2.enseignant_id
        END as enseignant_id
       FROM attachments a
       LEFT JOIN projets p ON a.entity_type = 'projet' AND a.entity_id = p.id
       LEFT JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
       LEFT JOIN projets p2 ON a.entity_type = 'tache' AND t.projet_id = p2.id
       WHERE a.id = ?`,
      [attachment_id]
    );

    if (attachments.length === 0) return res.status(404).json({ message: 'Pièce jointe introuvable.' });
    const attachment = attachments[0];

    if (attachment.enseignant_id !== req.userId) {
      return res.status(403).json({ message: "Vous n'avez pas la permission d'accéder à cette pièce jointe." });
    }

    // Return stored secure URL directly
    res.status(200).json({ url: attachment.fichier_url });
  } catch (error) {
    console.error('Erreur lors de la récupération de l URL:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Route pour stream un attachment via le serveur (evite CORS/401 côté client)
router.get('/id/:attachment_id/stream', async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const [attachments] = await db.query(
      `SELECT a.id, a.fichier_url, a.fichier_name, a.file_type, a.entity_type, a.entity_id,
        CASE WHEN a.entity_type = 'projet' THEN p.enseignant_id
             WHEN a.entity_type = 'tache' THEN p2.enseignant_id
        END as enseignant_id
       FROM attachments a
       LEFT JOIN projets p ON a.entity_type = 'projet' AND a.entity_id = p.id
       LEFT JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
       LEFT JOIN projets p2 ON a.entity_type = 'tache' AND t.projet_id = p2.id
       WHERE a.id = ?`,
      [attachment_id]
    );

    if (attachments.length === 0) return res.status(404).json({ message: 'Pièce jointe introuvable.' });
    const attachment = attachments[0];

    if (attachment.enseignant_id !== req.userId) {
      return res.status(403).json({ message: "Vous n'avez pas la permission d'accéder à cette pièce jointe." });
    }

    // Use stored secure URL directly
    const https = await import('https');
    https.get(attachment.fichier_url, (remoteRes) => {
      if (remoteRes.statusCode !== 200) {
        return res.status(remoteRes.statusCode).send('Erreur lors de la récupération du fichier.');
      }
      res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // Serve inline so browser can preview
      res.setHeader('Content-Disposition', `inline; filename="${attachment.fichier_name}"`);
      remoteRes.pipe(res);
    }).on('error', (err) => {
      console.error('Erreur lors du proxy du fichier:', err);
      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier.' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Route pour télécharger un attachment (force download)
router.get('/id/:attachment_id/download', async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const [attachments] = await db.query(
      `SELECT a.id, a.fichier_url, a.fichier_name, a.file_type, a.entity_type, a.entity_id,
        CASE WHEN a.entity_type = 'projet' THEN p.enseignant_id
             WHEN a.entity_type = 'tache' THEN p2.enseignant_id
        END as enseignant_id
       FROM attachments a
       LEFT JOIN projets p ON a.entity_type = 'projet' AND a.entity_id = p.id
       LEFT JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
       LEFT JOIN projets p2 ON a.entity_type = 'tache' AND t.projet_id = p2.id
       WHERE a.id = ?`,
      [attachment_id]
    );

    if (attachments.length === 0) return res.status(404).json({ message: 'Pièce jointe introuvable.' });
    const attachment = attachments[0];

    if (attachment.enseignant_id !== req.userId) {
      return res.status(403).json({ message: "Vous n'avez pas la permission d'accéder à cette pièce jointe." });
    }

    const https = await import('https');
    https.get(attachment.fichier_url, (remoteRes) => {
      if (remoteRes.statusCode !== 200) {
        return res.status(remoteRes.statusCode).send('Erreur lors de la récupération du fichier.');
      }
      res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fichier_name}"`);
      remoteRes.pipe(res);
    }).on('error', (err) => {
      console.error('Erreur lors du proxy du fichier (download):', err);
      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier.' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


export default router;


