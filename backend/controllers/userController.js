import db from "../config/db.js";
import { uploadFile, deleteFile, FOLDER_TYPES } from "../utils/cloudinaryUpload.js";

// Récupérer le profil complet de l'utilisateur
export const getProfile = async (req, res) => {
  try {
    const userId = req.userId;

    // Récupérer les informations complètes de l'utilisateur
    const [users] = await db.query(
      `SELECT 
        id, nom, prenom, email, role, cin, date_naissance, 
        departement, status, status_reason,
        profilePic_url, profilePic_name, profilePic_public_id,
        proof_of_id_url, proof_of_id_name, proof_of_id_added_at,
        classe_id,
        date_creation
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const user = users[0];

    // Si l'utilisateur est un étudiant, récupérer les infos de la classe
    let classeInfo = null;
    if (user.classe_id) {
      const [classes] = await db.query(
        "SELECT id, classe, departement FROM classes WHERE id = ?",
        [user.classe_id]
      );
      if (classes.length > 0) {
        classeInfo = classes[0];
      }
    }

    res.status(200).json({
      ...user,
      classe: classeInfo,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du profil :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération du profil." });
  }
};

// Mettre à jour la photo de profil
export const updateProfilePicture = async (req, res) => {
  try {
    const userId = req.userId;
    const profilePicFile = req.file;

    if (!profilePicFile) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    // Vérifier que c'est une image
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimes.includes(profilePicFile.mimetype)) {
      return res.status(400).json({ message: "Le fichier doit être une image (JPG, PNG, GIF, WEBP)" });
    }

    // Récupérer l'ancienne photo de profil pour la supprimer
    const [users] = await db.query(
      "SELECT profilePic_public_id FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const oldPublicId = users[0].profilePic_public_id;

    // Uploader la nouvelle photo vers Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadFile(profilePicFile, FOLDER_TYPES.PROFILE_PICS);
    } catch (uploadError) {
      console.error("❌ Erreur lors de l'upload Cloudinary :", uploadError);
      return res.status(500).json({ message: "Erreur lors du téléversement de la photo." });
    }

    // Supprimer l'ancienne photo de Cloudinary si elle existe
    if (oldPublicId) {
      try {
        await deleteFile(oldPublicId);
      } catch (deleteError) {
        console.warn("⚠️ Impossible de supprimer l'ancienne photo :", deleteError);
        // On continue même si la suppression échoue
      }
    }

    // Mettre à jour la base de données
    await db.query(
      `UPDATE users 
       SET profilePic_url = ?, 
           profilePic_name = ?, 
           profilePic_public_id = ?
       WHERE id = ?`,
      [
        uploadResult.secure_url,
        profilePicFile.originalname,
        uploadResult.public_id,
        userId,
      ]
    );

    res.status(200).json({
      message: "Photo de profil mise à jour avec succès ✅",
      profilePic: {
        url: uploadResult.secure_url,
        name: profilePicFile.originalname,
        public_id: uploadResult.public_id,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de la photo de profil :", error);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour de la photo." });
  }
};

