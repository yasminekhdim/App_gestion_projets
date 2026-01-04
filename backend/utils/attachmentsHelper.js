import db from "../config/db.js";
import { uploadFile, FOLDER_TYPES } from "./../utils/cloudinaryUpload.js";

export async function processAndSaveAttachments(files, entity_type, entity_id) {
  const uploadedAttachments = [];
  const errors = [];

  for (const file of files) {
    try {
      const folderType = entity_type === "projet" ? FOLDER_TYPES.PROJETS : FOLDER_TYPES.RENDUS;
      const uploadResult = await uploadFile(file, folderType, entity_id.toString());
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
    } catch (err) {
      console.error(`Erreur upload ${file.originalname}:`, err);
      errors.push(`Erreur pour ${file.originalname}: ${err.message}`);
    }
  }

  return { uploadedAttachments, errors };
}
