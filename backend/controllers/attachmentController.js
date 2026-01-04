import db from "../config/db.js";
import { uploadFile, deleteFile, FOLDER_TYPES } from "../utils/cloudinaryUpload.js";

// Ajouter des pièces jointes à un projet ou une tâche
export const addAttachments = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { entity_type, entity_id } = req.body;
    const files = req.files || [];

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    if (!entity_type || !entity_id || files.length === 0) {
      return res.status(400).json({ message: "Type d'entité, ID et fichiers requis." });
    }

    if (!["projet", "tache"].includes(entity_type)) {
      return res.status(400).json({ message: "Type d'entité invalide. Doit être 'projet' ou 'tache'." });
    }

    // Vérifier que l'entité existe et appartient à l'enseignant
    if (entity_type === "projet") {
      const [projects] = await db.query(
        "SELECT id FROM projets WHERE id = ? AND enseignant_id = ?",
        [entity_id, teacherId]
      );
      if (projects.length === 0) {
        return res.status(404).json({ message: "Projet introuvable ou vous n'avez pas la permission." });
      }
    } else if (entity_type === "tache") {
      const [tasks] = await db.query(
        `SELECT t.id FROM taches t
         INNER JOIN projets p ON t.projet_id = p.id
         WHERE t.id = ? AND p.enseignant_id = ?`,
        [entity_id, teacherId]
      );
      if (tasks.length === 0) {
        return res.status(404).json({ message: "Tâche introuvable ou vous n'avez pas la permission." });
      }
    }

    // Déterminer le dossier Cloudinary
    const folderType = entity_type === "projet" ? FOLDER_TYPES.PROJETS : FOLDER_TYPES.RENDUS;
    const subFolder = entity_id.toString();

    // Uploader tous les fichiers
    const uploadedAttachments = [];
    const errors = [];

    for (const file of files) {
      try {
        const uploadResult = await uploadFile(file, folderType, subFolder);
        
        // Insérer dans la base de données
        const [result] = await db.query(
          `INSERT INTO attachments (
            entity_type, entity_id, fichier_url, fichier_name, fichier_public_id, file_size, file_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            entity_type,
            entity_id,
            uploadResult.secure_url,
            file.originalname,
            uploadResult.public_id,
            file.size,
            file.mimetype,
          ]
        );

        uploadedAttachments.push({
          id: result.insertId,
          fichier_url: uploadResult.secure_url,
          fichier_name: file.originalname,
          fichier_public_id: uploadResult.public_id,
          file_size: file.size,
          file_type: file.mimetype,
        });
      } catch (uploadError) {
        console.error(`❌ Erreur lors de l'upload de ${file.originalname}:`, uploadError);
        errors.push(`Erreur pour ${file.originalname}: ${uploadError.message}`);
      }
    }

    if (uploadedAttachments.length === 0) {
      return res.status(500).json({
        message: "Aucun fichier n'a pu être uploadé.",
        errors,
      });
    }

    res.status(201).json({
      message: `${uploadedAttachments.length} fichier(s) ajouté(s) avec succès ✅`,
      attachments: uploadedAttachments,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des pièces jointes :", error);
    res.status(500).json({ message: "Erreur serveur lors de l'ajout des pièces jointes." });
  }
};

// Récupérer les pièces jointes d'un projet ou d'une tâche
export const getAttachments = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { entity_type, entity_id } = req.params;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    if (!["projet", "tache"].includes(entity_type)) {
      return res.status(400).json({ message: "Type d'entité invalide." });
    }

    // Vérifier les permissions
    if (entity_type === "projet") {
      const [projects] = await db.query(
        "SELECT id FROM projets WHERE id = ? AND enseignant_id = ?",
        [entity_id, teacherId]
      );
      if (projects.length === 0) {
        return res.status(404).json({ message: "Projet introuvable ou vous n'avez pas la permission." });
      }
    } else if (entity_type === "tache") {
      const [tasks] = await db.query(
        `SELECT t.id FROM taches t
         INNER JOIN projets p ON t.projet_id = p.id
         WHERE t.id = ? AND p.enseignant_id = ?`,
        [entity_id, teacherId]
      );
      if (tasks.length === 0) {
        return res.status(404).json({ message: "Tâche introuvable ou vous n'avez pas la permission." });
      }
    }

    // Récupérer les pièces jointes
    const [attachments] = await db.query(
      `SELECT 
        id, fichier_url, fichier_name, fichier_public_id, 
        file_size, file_type, uploaded_at
      FROM attachments
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY uploaded_at DESC`,
      [entity_type, entity_id]
    );

    res.status(200).json({ attachments });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des pièces jointes :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des pièces jointes." });
  }
};

// Supprimer une pièce jointe
export const deleteAttachment = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { attachment_id } = req.params;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Récupérer la pièce jointe et vérifier les permissions
    const [attachments] = await db.query(
      `SELECT a.*, 
        CASE 
          WHEN a.entity_type = 'projet' THEN p.enseignant_id
          WHEN a.entity_type = 'tache' THEN p2.enseignant_id
        END as enseignant_id
      FROM attachments a
      LEFT JOIN projets p ON a.entity_type = 'projet' AND a.entity_id = p.id
      LEFT JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
      LEFT JOIN projets p2 ON a.entity_type = 'tache' AND t.projet_id = p2.id
      WHERE a.id = ?`,
      [attachment_id]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ message: "Pièce jointe introuvable." });
    }

    const attachment = attachments[0];

    if (attachment.enseignant_id !== teacherId) {
      return res.status(403).json({ message: "Vous n'avez pas la permission de supprimer cette pièce jointe." });
    }

    // Supprimer de Cloudinary
    try {
      await deleteFile(attachment.fichier_public_id);
    } catch (deleteError) {
      console.warn("⚠️ Impossible de supprimer le fichier Cloudinary :", deleteError);
    }

    // Supprimer de la base de données
    await db.query("DELETE FROM attachments WHERE id = ?", [attachment_id]);

    res.status(200).json({ message: "Pièce jointe supprimée avec succès ✅" });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de la pièce jointe :", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression de la pièce jointe." });
  }
};

