import db from "../config/db.js";
import { deleteFile } from "../utils/cloudinaryUpload.js";

// Créer un nouveau projet
export const createProject = async (req, res) => {
  try {
    const teacherId = req.userId;
    // Defensive: if body is missing (e.g., wrong content-type), avoid crashing
    const { libelle, matiere, description, classe_id, deadline } = req.body || {};

    if (!req.body) {
      return res.status(400).json({ message: "Corps de la requête manquant ou incorrect." });
    }

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Validation des champs obligatoires
    if (!libelle || !matiere || !classe_id || !deadline) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires." });
    }

    // Vérifier que la classe est assignée à cet enseignant
    const [classAssignments] = await db.query(
      "SELECT id FROM classe_enseignant WHERE enseignant_id = ? AND classe_id = ?",
      [teacherId, classe_id]
    );

    if (classAssignments.length === 0) {
      return res.status(403).json({ message: "Cette classe n'est pas assignée à vous." });
    }

    // Vérifier que la deadline est dans le futur
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deadlineDate < today) {
      return res.status(400).json({ message: "La date limite doit être dans le futur." });
    }

    // Créer le projet (les pièces jointes seront ajoutées via la table attachments)
    const [result] = await db.query(
      `INSERT INTO projets (
        libelle, matiere, description, classe_id, enseignant_id, 
        deadline
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        libelle,
        matiere,
        description || null,
        classe_id,
        teacherId,
        deadline,
      ]
    );

    const projectId = result.insertId;

    // Si des fichiers ont été envoyés via multipart, les traiter et les sauvegarder
    let attachmentsResult;
    if (req.files && req.files.length > 0) {
      try {
        const { processAndSaveAttachments } = await import("../utils/attachmentsHelper.js");
        const { uploadedAttachments, errors } = await processAndSaveAttachments(req.files, "projet", projectId);
        attachmentsResult = { uploadedAttachments, errors };
      } catch (attachErr) {
        console.error("❌ Erreur lors du traitement des pièces jointes du projet :", attachErr);
        attachmentsResult = { uploadedAttachments: [], errors: [attachErr.message] };
      }
    }

    res.status(201).json({
      message: "Projet créé avec succès ✅",
      project: {
        id: projectId,
        libelle,
        matiere,
        description,
        classe_id,
        deadline,
      },
      attachments: attachmentsResult,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la création du projet :", error);
    res.status(500).json({ message: "Erreur serveur lors de la création du projet." });
  }
};

// Récupérer les étudiants d'une classe spécifique (pour l'assignation)
export const getClassStudents = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { classe_id } = req.params;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Vérifier que la classe est assignée à cet enseignant
    const [classAssignments] = await db.query(
      "SELECT id FROM classe_enseignant WHERE enseignant_id = ? AND classe_id = ?",
      [teacherId, classe_id]
    );

    if (classAssignments.length === 0) {
      return res.status(403).json({ message: "Cette classe n'est pas assignée à vous." });
    }

    // Récupérer les étudiants de cette classe
    const [students] = await db.query(
      `SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.profilePic_url,
        u.status
      FROM users u
      WHERE u.role = 'etudiant' AND u.classe_id = ?
      ORDER BY u.nom, u.prenom`,
      [classe_id]
    );

    res.status(200).json({ students });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des étudiants :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des étudiants." });
  }
};

// Assigner des étudiants à un projet
export const assignStudentsToProject = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { project_id, student_ids } = req.body;

    if (!project_id || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ message: "L'ID du projet et les IDs des étudiants sont requis." });
    }

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Vérifier que le projet appartient à cet enseignant
    const [projects] = await db.query(
      "SELECT id, classe_id FROM projets WHERE id = ? AND enseignant_id = ?",
      [project_id, teacherId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: "Projet introuvable ou vous n'avez pas la permission." });
    }

    const project = projects[0];

    // Vérifier que tous les étudiants appartiennent à la classe du projet
    const placeholders = student_ids.map(() => "?").join(",");
    const [students] = await db.query(
      `SELECT id, classe_id FROM users 
       WHERE id IN (${placeholders}) AND role = 'etudiant'`,
      student_ids
    );

    if (students.length !== student_ids.length) {
      return res.status(400).json({ message: "Certains étudiants sont introuvables." });
    }

    // Vérifier que tous les étudiants sont de la même classe que le projet
    const invalidStudents = students.filter((s) => s.classe_id !== project.classe_id);
    if (invalidStudents.length > 0) {
      return res.status(400).json({
        message: "Tous les étudiants doivent appartenir à la classe du projet.",
      });
    }

    // Assigner les étudiants au projet (ignorer les doublons)
    const assignments = [];
    for (const studentId of student_ids) {
      try {
        await db.query(
          "INSERT INTO projet_etudiant (projet_id, etudiant_id) VALUES (?, ?)",
          [project_id, studentId]
        );
        assignments.push(studentId);
      } catch (error) {
        // Ignorer les erreurs de doublon (UNIQUE constraint)
        if (error.code !== "ER_DUP_ENTRY") {
          throw error;
        }
      }
    }

    res.status(201).json({
      message: `${assignments.length} étudiant(s) assigné(s) au projet avec succès ✅`,
      assigned_count: assignments.length,
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'assignation des étudiants :", error);
    res.status(500).json({ message: "Erreur serveur lors de l'assignation des étudiants." });
  }
};

// Récupérer tous les projets d'un enseignant
export const getTeacherProjects = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Paramètres de requête pour pagination et tri
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const sort = req.query.sort || 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    // Validation des paramètres
    const allowedSortFields = ['created_at', 'libelle', 'deadline'];
    if (!allowedSortFields.includes(sort)) {
      return res.status(400).json({ message: "Champ de tri invalide." });
    }

    // Construction de la requête SQL
    let sql = `
      SELECT
        p.id,
        p.libelle,
        p.matiere,
        p.description,
        p.deadline,
        p.created_at,
        c.id as classe_id,
        c.classe as classe_nom,
        c.departement as classe_departement,
        (SELECT COUNT(*) FROM projet_etudiant WHERE projet_id = p.id) as students_count
      FROM projets p
      INNER JOIN classes c ON p.classe_id = c.id
      WHERE p.enseignant_id = ?
      ORDER BY p.${sort} ${order}
    `;

    const params = [teacherId];

    // Ajouter LIMIT si spécifié
    if (limit && limit > 0) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const [projects] = await db.query(sql, params);

    res.status(200).json({ projects });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des projets :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des projets." });
  }
};

// Modifier un projet (libelle, matiere, description, deadline)
export const updateProject = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { project_id } = req.params;
    const { libelle, matiere, description, deadline } = req.body || {};

    if (!req.body) {
      return res.status(400).json({ message: "Corps de la requête manquant ou incorrect." });
    }

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Récupérer le projet et vérifier qu'il appartient à l'enseignant
    const [projects] = await db.query("SELECT id FROM projets WHERE id = ? AND enseignant_id = ?", [project_id, teacherId]);
    if (projects.length === 0) {
      return res.status(404).json({ message: "Projet introuvable ou vous n'avez pas la permission." });
    }

    // Validation de la date limite si fournie
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        return res.status(400).json({ message: "La date limite doit être dans le futur." });
      }
    }

    const updates = [];
    const values = [];

    if (libelle) {
      updates.push("libelle = ?");
      values.push(libelle);
    }
    if (matiere) {
      updates.push("matiere = ?");
      values.push(matiere);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description || null);
    }
    if (deadline) {
      updates.push("deadline = ?");
      values.push(deadline);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "Aucune modification fournie." });
    }

    values.push(project_id);

    await db.query(`UPDATE projets SET ${updates.join(", ")} WHERE id = ?`, values);

    // Si des fichiers multipart ont été envoyés, les traiter et les sauvegarder
    let attachmentsResult;
    if (req.files && req.files.length > 0) {
      try {
        const { processAndSaveAttachments } = await import("../utils/attachmentsHelper.js");
        const { uploadedAttachments, errors } = await processAndSaveAttachments(req.files, "projet", project_id);
        attachmentsResult = { uploadedAttachments, errors };
      } catch (attachErr) {
        console.error("❌ Erreur lors du traitement des pièces jointes du projet :", attachErr);
        attachmentsResult = { uploadedAttachments: [], errors: [attachErr.message] };
      }
    }

    // Récupérer le projet mis à jour
    const [updatedRows] = await db.query(
      `SELECT p.id, p.libelle, p.matiere, p.description, p.deadline, c.id as classe_id, c.classe as classe_nom, c.departement as classe_departement
       FROM projets p
       INNER JOIN classes c ON p.classe_id = c.id
       WHERE p.id = ?`,
      [project_id]
    );

    res.status(200).json({ message: "Projet modifié avec succès ✅", project: updatedRows[0], attachments: attachmentsResult });
  } catch (error) {
    console.error("❌ Erreur lors de la modification du projet :", error);
    res.status(500).json({ message: "Erreur serveur lors de la modification du projet." });
  }
};

// Retirer un étudiant d'un projet
export const removeStudentFromProject = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { project_id, student_id } = req.params;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Vérifier que le projet appartient à cet enseignant
    const [projects] = await db.query(
      "SELECT id FROM projets WHERE id = ? AND enseignant_id = ?",
      [project_id, teacherId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: "Projet introuvable ou vous n'avez pas la permission." });
    }

    // Vérifier que l'étudiant est assigné au projet
    const [assignments] = await db.query(
      "SELECT id FROM projet_etudiant WHERE projet_id = ? AND etudiant_id = ?",
      [project_id, student_id]
    );

    if (assignments.length === 0) {
      return res.status(404).json({ message: "Cet étudiant n'est pas assigné à ce projet." });
    }

    // Supprimer l'assignation
    await db.query("DELETE FROM projet_etudiant WHERE projet_id = ? AND etudiant_id = ?", [project_id, student_id]);

    res.status(200).json({ message: "Étudiant retiré du projet avec succès ✅" });
  } catch (error) {
    console.error("❌ Erreur lors du retrait de l'étudiant du projet :", error);
    res.status(500).json({ message: "Erreur serveur lors du retrait de l'étudiant." });
  }
};

// Supprimer un projet
export const deleteProject = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { project_id } = req.params;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Vérifier que le projet appartient à cet enseignant
    const [projects] = await db.query(
      "SELECT id FROM projets WHERE id = ? AND enseignant_id = ?",
      [project_id, teacherId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: "Projet introuvable ou vous n'avez pas la permission." });
    }

    // Récupérer toutes les pièces jointes du projet pour les supprimer de Cloudinary
    const [projectAttachments] = await db.query(
      "SELECT fichier_public_id FROM attachments WHERE entity_type = 'projet' AND entity_id = ?",
      [project_id]
    );

    // Supprimer les fichiers de Cloudinary
    for (const attachment of projectAttachments) {
      try {
        await deleteFile(attachment.fichier_public_id);
      } catch (deleteError) {
        console.warn(`⚠️ Impossible de supprimer le fichier Cloudinary ${attachment.fichier_public_id}:`, deleteError);
      }
    }

    // Récupérer toutes les pièces jointes des tâches du projet
    const [taskAttachments] = await db.query(
      `SELECT a.fichier_public_id 
       FROM attachments a
       INNER JOIN taches t ON a.entity_type = 'tache' AND a.entity_id = t.id
       WHERE t.projet_id = ?`,
      [project_id]
    );

    // Supprimer les fichiers des tâches de Cloudinary
    for (const attachment of taskAttachments) {
      try {
        await deleteFile(attachment.fichier_public_id);
      } catch (deleteError) {
        console.warn(`⚠️ Impossible de supprimer le fichier Cloudinary ${attachment.fichier_public_id}:`, deleteError);
      }
    }

    // Supprimer le projet (les CASCADE supprimeront automatiquement les tâches, assignations, et pièces jointes)
    await db.query("DELETE FROM projets WHERE id = ?", [project_id]);

    res.status(200).json({ message: "Projet supprimé avec succès ✅" });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du projet :", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression du projet." });
  }
};

