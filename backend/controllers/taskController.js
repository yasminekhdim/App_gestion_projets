import db from "../config/db.js";
import { deleteFile } from "../utils/cloudinaryUpload.js";

// Helper: normalize etudiant_id coming from JSON or FormData
const normalizeStudentId = (val) => {
  if (val === undefined || val === null) return null;
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "") return null;
    return isNaN(Number(t)) ? t : Number(t);
  }
  return val;
};

// Récupérer les détails d'un projet avec ses tâches
export const getProjectDetails = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { project_id } = req.params;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Récupérer les détails du projet
    const [projects] = await db.query(
      `SELECT 
        p.id,
        p.libelle,
        p.matiere,
        p.description,
        p.deadline,
        p.created_at,
        c.id as classe_id,
        c.classe as classe_nom,
        c.departement as classe_departement
      FROM projets p
      INNER JOIN classes c ON p.classe_id = c.id
      WHERE p.id = ? AND p.enseignant_id = ?`,
      [project_id, teacherId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: "Projet introuvable ou vous n'avez pas la permission." });
    }

    const project = projects[0];

    // Récupérer les tâches du projet
    const [tasks] = await db.query(
      `SELECT 
        t.id,
        t.libelle,
        t.description,
        t.deadline,
        t.etudiant_id,
        t.created_at,
        u.nom as etudiant_nom,
        u.prenom as etudiant_prenom,
        u.email as etudiant_email
      FROM taches t
      LEFT JOIN users u ON t.etudiant_id = u.id
      WHERE t.projet_id = ?
      ORDER BY t.created_at DESC`,
      [project_id]
    );

    // Récupérer les étudiants assignés au projet
    const [students] = await db.query(
      `SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.profilePic_url
      FROM users u
      INNER JOIN projet_etudiant pe ON u.id = pe.etudiant_id
      WHERE pe.projet_id = ?
      ORDER BY u.nom, u.prenom`,
      [project_id]
    );
        // Récupérer les pièces jointes du projet
        let projectAttachments = [];
        try {
          const [attachments] = await db.query(
            `SELECT id, fichier_url, fichier_name, fichier_public_id, file_size, file_type, uploaded_at
             FROM attachments
             WHERE entity_type = 'projet' AND entity_id = ?
             ORDER BY uploaded_at DESC`,
            [project_id]
          );
          projectAttachments = attachments || [];
        } catch (attachError) {
          console.warn("⚠️ Erreur lors de la récupération des pièces jointes du projet:", attachError);
          // Si la table n'existe pas encore, on continue avec un tableau vide
          projectAttachments = [];
        }
    
        // Récupérer les pièces jointes de chaque tâche
        const taskIds = tasks.map((t) => t.id);
        let taskAttachmentsMap = {};
        if (taskIds.length > 0) {
          try {
            const [allTaskAttachments] = await db.query(
              `SELECT id, entity_id, fichier_url, fichier_name, fichier_public_id, file_size, file_type, uploaded_at
               FROM attachments
               WHERE entity_type = 'tache' AND entity_id IN (${taskIds.map(() => "?").join(",")})
               ORDER BY uploaded_at DESC`,
              taskIds
            );
    
            allTaskAttachments.forEach((att) => {
              if (!taskAttachmentsMap[att.entity_id]) {
                taskAttachmentsMap[att.entity_id] = [];
              }
              taskAttachmentsMap[att.entity_id].push(att);
            });
          } catch (attachError) {
            console.warn("⚠️ Erreur lors de la récupération des pièces jointes des tâches:", attachError);
            // Si la table n'existe pas encore, on continue avec un objet vide
          }
        }
    
        // Ajouter les pièces jointes à chaque tâche
        tasks.forEach((task) => {
          task.attachments = taskAttachmentsMap[task.id] || [];
        });

    res.status(200).json({
      project: {
        ...project,
        attachments: projectAttachments,
      },
      tasks,
      students,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des détails du projet :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des détails." });
  }
};

// Récupérer les étudiants assignés à un projet
export const getProjectStudents = async (req, res) => {
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

    // Récupérer les étudiants assignés au projet
    const [students] = await db.query(
      `SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.profilePic_url
      FROM users u
      INNER JOIN projet_etudiant pe ON u.id = pe.etudiant_id
      WHERE pe.projet_id = ?
      ORDER BY u.nom, u.prenom`,
      [project_id]
    );

    res.status(200).json({ students });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des étudiants :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des étudiants." });
  }
};

// Créer une tâche
export const createTask = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { project_id } = req.params;

    if (!req.body) {
      return res.status(400).json({ message: "Corps de la requête manquant ou incorrect." });
    }

    // Les données peuvent venir d'un JSON ou d'un FormData (champs en string)
    const libelle = req.body.libelle;
    const description = req.body.description || null;
    const deadline = req.body.deadline;
    const etudiant_id = normalizeStudentId(req.body.etudiant_id);

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Validation des champs obligatoires
    if (!libelle || !deadline) {
      return res.status(400).json({ message: "Le libellé et la date limite sont obligatoires." });
    }

    // Vérifier que le projet appartient à cet enseignant
    const [projects] = await db.query(
      "SELECT id, deadline as project_deadline FROM projets WHERE id = ? AND enseignant_id = ?",
      [project_id, teacherId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: "Projet introuvable ou vous n'avez pas la permission." });
    }

    const project = projects[0];

    // Vérifier que la deadline de la tâche ne dépasse pas celle du projet
    const taskDeadline = new Date(deadline);
    const projectDeadline = new Date(project.project_deadline);
    if (taskDeadline > projectDeadline) {
      return res.status(400).json({
        message: `La date limite de la tâche ne peut pas dépasser celle du projet (${projectDeadline.toLocaleDateString("fr-FR")}).`,
      });
    }

    // Vérifier que la deadline n'est pas dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (taskDeadline < today) {
      return res.status(400).json({ message: "La date limite doit être dans le futur." });
    }

    // Si un étudiant est assigné (valeur non nulle), vérifier qu'il est assigné au projet
    if (etudiant_id !== null) {
      const [studentAssignments] = await db.query(
        "SELECT id FROM projet_etudiant WHERE projet_id = ? AND etudiant_id = ?",
        [project_id, etudiant_id]
      );

      if (studentAssignments.length === 0) {
        return res.status(400).json({ message: "Cet étudiant n'est pas assigné à ce projet." });
      }
    }

    // Créer la tâche (les pièces jointes seront ajoutées via la table attachments)
    const [result] = await db.query(
      `INSERT INTO taches (
        libelle, description, projet_id, etudiant_id, deadline
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        libelle,
        description || null,
        project_id,
        etudiant_id || null,
        deadline,
      ]
    );

    const taskId = result.insertId;

    // Si des fichiers multipart ont été envoyés, les traiter et les sauvegarder
    let attachmentsResult;
    if (req.files && req.files.length > 0) {
      try {
        const { processAndSaveAttachments } = await import("../utils/attachmentsHelper.js");
        const { uploadedAttachments, errors } = await processAndSaveAttachments(req.files, "tache", taskId);
        attachmentsResult = { uploadedAttachments, errors };
      } catch (attachErr) {
        console.error("❌ Erreur lors du traitement des pièces jointes de la tâche :", attachErr);
        attachmentsResult = { uploadedAttachments: [], errors: [attachErr.message] };
      }
    }

    res.status(201).json({
      message: "Tâche créée avec succès ✅",
      task: {
        id: taskId,
        libelle,
        description,
        deadline,
        etudiant_id: etudiant_id || null,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la création de la tâche :", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "Une tâche avec ce libellé existe déjà pour cet étudiant dans ce projet.",
      });
    }
    res.status(500).json({ message: "Erreur serveur lors de la création de la tâche." });
  }
};

// Modifier une tâche
export const updateTask = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { task_id } = req.params;

    if (!req.body) {
      return res.status(400).json({ message: "Corps de la requête manquant ou incorrect." });
    }

    // Les données peuvent venir d'un JSON ou d'un FormData (champs en string)
    const libelle = req.body.libelle;
    const description = req.body.description || null;
    const deadline = req.body.deadline;
    const hasEtudiantProp = Object.prototype.hasOwnProperty.call(req.body, 'etudiant_id');
    const etudiant_id = hasEtudiantProp ? normalizeStudentId(req.body.etudiant_id) : undefined;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Récupérer la tâche et vérifier qu'elle appartient à un projet de l'enseignant
    const [tasks] = await db.query(
      `SELECT t.id, t.projet_id, p.deadline as project_deadline, p.enseignant_id
       FROM taches t
       INNER JOIN projets p ON t.projet_id = p.id
       WHERE t.id = ? AND p.enseignant_id = ?`,
      [task_id, teacherId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: "Tâche introuvable ou vous n'avez pas la permission." });
    }

    const task = tasks[0];

    // Vérifier la deadline si elle est modifiée
    if (deadline) {
      const taskDeadline = new Date(deadline);
      const projectDeadline = new Date(task.project_deadline);

      if (taskDeadline > projectDeadline) {
        return res.status(400).json({
          message: `La date limite de la tâche ne peut pas dépasser celle du projet (${projectDeadline.toLocaleDateString("fr-FR")}).`,
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (taskDeadline < today) {
        return res.status(400).json({ message: "La date limite doit être dans le futur." });
      }
    }

    // Si l'étudiant est fourni (propriété présente) et non null, vérifier qu'il est assigné au projet
    if (hasEtudiantProp && etudiant_id !== null) {
      const [studentAssignments] = await db.query(
        "SELECT id FROM projet_etudiant WHERE projet_id = ? AND etudiant_id = ?",
        [task.projet_id, etudiant_id]
      );

      if (studentAssignments.length === 0) {
        return res.status(400).json({ message: "Cet étudiant n'est pas assigné à ce projet." });
      }
    }

    // Construire la requête de mise à jour
    const updates = [];
    const values = [];

    if (libelle) {
      updates.push("libelle = ?");
      values.push(libelle);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description || null);
    }
    if (deadline) {
      updates.push("deadline = ?");
      values.push(deadline);
    }
    if (hasEtudiantProp) {
      updates.push("etudiant_id = ?");
      values.push(etudiant_id !== null ? etudiant_id : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "Aucune modification à apporter." });
    }

    values.push(task_id);

    await db.query(`UPDATE taches SET ${updates.join(", ")} WHERE id = ?`, values);

    // Si des fichiers multipart ont été envoyés, les traiter et les sauvegarder
    let attachmentsResult;
    if (req.files && req.files.length > 0) {
      try {
        const { processAndSaveAttachments } = await import("../utils/attachmentsHelper.js");
        const { uploadedAttachments, errors } = await processAndSaveAttachments(req.files, "tache", task_id);
        attachmentsResult = { uploadedAttachments, errors };
      } catch (attachErr) {
        console.error("❌ Erreur lors du traitement des pièces jointes de la tâche :", attachErr);
        attachmentsResult = { uploadedAttachments: [], errors: [attachErr.message] };
      }
    }

    res.status(200).json({ message: "Tâche modifiée avec succès ✅", attachments: attachmentsResult });
  } catch (error) {
    console.error("❌ Erreur lors de la modification de la tâche :", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "Une tâche avec ce libellé existe déjà pour cet étudiant dans ce projet.",
      });
    }
    res.status(500).json({ message: "Erreur serveur lors de la modification de la tâche." });
  }
};

// Supprimer une tâche
export const deleteTask = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { task_id } = req.params;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Récupérer la tâche et vérifier qu'elle appartient à un projet de l'enseignant
    const [tasks] = await db.query(
      `SELECT t.id
       FROM taches t
       INNER JOIN projets p ON t.projet_id = p.id
       WHERE t.id = ? AND p.enseignant_id = ?`,
      [task_id, teacherId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: "Tâche introuvable ou vous n'avez pas la permission." });
    }

    // Récupérer les pièces jointes de la tâche pour les supprimer de Cloudinary
    const [taskAttachments] = await db.query(
      "SELECT fichier_public_id FROM attachments WHERE entity_type = 'tache' AND entity_id = ?",
      [task_id]
    );

    // Supprimer les fichiers de Cloudinary
    for (const attachment of taskAttachments) {
      try {
        await deleteFile(attachment.fichier_public_id);
      } catch (deleteError) {
        console.warn(`⚠️ Impossible de supprimer le fichier Cloudinary ${attachment.fichier_public_id}:`, deleteError);
      }
    }

    // Supprimer la tâche (les CASCADE supprimeront automatiquement les pièces jointes)
    await db.query("DELETE FROM taches WHERE id = ?", [task_id]);

    res.status(200).json({ message: "Tâche supprimée avec succès ✅" });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de la tâche :", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression de la tâche." });
  }
};

