import cloudinary, { CLOUDINARY_FOLDERS, UPLOAD_PRESET } from "../config/cloudinary.js";
import { Readable } from "stream";

/**
 * Upload un fichier vers Cloudinary avec le preset et le dossier spécifiés
 * @param {Object} file - Fichier multer (req.file)
 * @param {String} folderType - Type de dossier: 'IDENTITE', 'PROFILE_PICS', 'PROJETS', 'RENDUS', 'DIVERS'
 * @param {String|Number} subFolder - Sous-dossier optionnel (ex: taskId pour rendus/42)
 * @returns {Promise<Object>} Résultat de l'upload Cloudinary
 */
export const uploadFile = (file, folderType, subFolder = null) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("Aucun fichier fourni"));
    }

    // Construire le chemin du dossier
    let folderPath = CLOUDINARY_FOLDERS[folderType];
    if (!folderPath) {
      return reject(new Error(`Type de dossier invalide: ${folderType}`));
    }

    // Ajouter un sous-dossier si spécifié (ex: pour rendus/42)
    if (subFolder) {
      folderPath = `${folderPath}/${subFolder}`;
    }

    const uploadOptions = {
      resource_type: "auto",
      folder: folderPath,
      upload_preset: UPLOAD_PRESET, // Utilise le preset "projectHub"
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream
    const bufferStream = Readable.from(file.buffer);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Supprime un fichier de Cloudinary
 * @param {String} publicId - Public ID du fichier à supprimer
 * @returns {Promise<Object>} Résultat de la suppression
 */
export const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("❌ Erreur lors de la suppression Cloudinary :", error);
    throw error;
  }
};

/**
 * Types de dossiers disponibles pour les uploads
 */
export const FOLDER_TYPES = {
  IDENTITE: "IDENTITE",      // projectHub/identite
  PROFILE_PICS: "PROFILE_PICS", // projectHub/profile_pics
  PROJETS: "PROJETS",        // projectHub/projets
  RENDUS: "RENDUS",          // projectHub/rendus/{taskId}
  DIVERS: "DIVERS",          // projectHub/divers
};

