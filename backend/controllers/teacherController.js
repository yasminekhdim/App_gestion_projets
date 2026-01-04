import db from "../config/db.js";

// Récupérer les classes assignées à un enseignant
export const getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Récupérer les classes assignées avec leurs informations
    const [classes] = await db.query(
      `SELECT 
        ce.id as affectation_id,
        ce.date_affectation,
        c.id as classe_id,
        c.classe,
        c.departement
      FROM classe_enseignant ce
      INNER JOIN classes c ON ce.classe_id = c.id
      WHERE ce.enseignant_id = ?
      ORDER BY c.classe`,
      [teacherId]
    );

    res.status(200).json({ classes });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des classes :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des classes." });
  }
};

// Récupérer les classes disponibles pour un enseignant (de son département et non assignées)
export const getAvailableClasses = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role, departement FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    const teacherDepartment = users[0].departement;
    if (!teacherDepartment) {
      return res.status(400).json({ message: "Aucun département assigné à cet enseignant." });
    }

    // Récupérer les classes du département qui ne sont pas déjà assignées à cet enseignant
    const [availableClasses] = await db.query(
      `SELECT 
        c.id,
        c.classe,
        c.departement
      FROM classes c
      WHERE c.departement = ?
        AND c.id NOT IN (
          SELECT classe_id 
          FROM classe_enseignant 
          WHERE enseignant_id = ?
        )
      ORDER BY c.classe`,
      [teacherDepartment, teacherId]
    );

    res.status(200).json({ classes: availableClasses });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des classes disponibles :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des classes disponibles." });
  }
};

// Assigner une classe à un enseignant
export const assignClass = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { classe_id } = req.body;

    if (!classe_id) {
      return res.status(400).json({ message: "L'ID de la classe est requis." });
    }

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role, departement FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    const teacherDepartment = users[0].departement;

    // Vérifier que la classe existe et appartient au département de l'enseignant
    const [classes] = await db.query(
      "SELECT id, departement FROM classes WHERE id = ?",
      [classe_id]
    );

    if (classes.length === 0) {
      return res.status(404).json({ message: "Classe introuvable." });
    }

    if (classes[0].departement !== teacherDepartment) {
      return res.status(403).json({ message: "Cette classe n'appartient pas à votre département." });
    }

    // Vérifier que la classe n'est pas déjà assignée
    const [existing] = await db.query(
      "SELECT id FROM classe_enseignant WHERE enseignant_id = ? AND classe_id = ?",
      [teacherId, classe_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Cette classe est déjà assignée à vous." });
    }

    // Assigner la classe
    await db.query(
      "INSERT INTO classe_enseignant (enseignant_id, classe_id) VALUES (?, ?)",
      [teacherId, classe_id]
    );

    res.status(201).json({ message: "Classe assignée avec succès ✅" });
  } catch (error) {
    console.error("❌ Erreur lors de l'assignation de la classe :", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Cette classe est déjà assignée." });
    }
    res.status(500).json({ message: "Erreur serveur lors de l'assignation de la classe." });
  }
};

// Retirer une classe d'un enseignant
export const unassignClass = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { affectation_id } = req.params;

    if (!affectation_id) {
      return res.status(400).json({ message: "L'ID de l'affectation est requis." });
    }

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Vérifier que l'affectation appartient à cet enseignant
    const [affectations] = await db.query(
      "SELECT id FROM classe_enseignant WHERE id = ? AND enseignant_id = ?",
      [affectation_id, teacherId]
    );

    if (affectations.length === 0) {
      return res.status(404).json({ message: "Affectation introuvable ou vous n'avez pas la permission." });
    }

    // Retirer l'affectation
    await db.query(
      "DELETE FROM classe_enseignant WHERE id = ? AND enseignant_id = ?",
      [affectation_id, teacherId]
    );

    res.status(200).json({ message: "Classe retirée avec succès ✅" });
  } catch (error) {
    console.error("❌ Erreur lors du retrait de la classe :", error);
    res.status(500).json({ message: "Erreur serveur lors du retrait de la classe." });
  }
};

// Récupérer tous les étudiants d'un enseignant groupés par classe
export const getTeacherStudents = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Récupérer les classes assignées à l'enseignant
    const [teacherClasses] = await db.query(
      "SELECT classe_id FROM classe_enseignant WHERE enseignant_id = ?",
      [teacherId]
    );

    if (teacherClasses.length === 0) {
      return res.status(200).json({ studentsByClass: [] });
    }

    const classIds = teacherClasses.map((tc) => tc.classe_id);

    // Récupérer les étudiants groupés par classe
    const [students] = await db.query(
      `SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.cin,
        u.date_naissance,
        u.departement,
        u.status,
        u.profilePic_url,
        u.classe_id,
        c.id as classe_id,
        c.classe as classe_nom,
        c.departement as classe_departement
      FROM users u
      INNER JOIN classes c ON u.classe_id = c.id
      WHERE u.role = 'etudiant'
        AND u.classe_id IN (${classIds.map(() => "?").join(",")})
      ORDER BY c.classe, u.nom, u.prenom`,
      classIds
    );

    // Grouper les étudiants par classe
    const studentsByClass = {};
    students.forEach((student) => {
      const classeKey = student.classe_id;
      if (!studentsByClass[classeKey]) {
        studentsByClass[classeKey] = {
          classe: {
            id: student.classe_id,
            nom: student.classe_nom,
            departement: student.classe_departement,
          },
          students: [],
        };
      }
      studentsByClass[classeKey].students.push({
        id: student.id,
        nom: student.nom,
        prenom: student.prenom,
        email: student.email,
        cin: student.cin,
        date_naissance: student.date_naissance,
        departement: student.departement,
        status: student.status,
        profilePic_url: student.profilePic_url,
      });
    });

    // Convertir l'objet en tableau
    const result = Object.values(studentsByClass);

    res.status(200).json({ studentsByClass: result });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des étudiants :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des étudiants." });
  }
};

// Récupérer le nombre total d'étudiants d'un enseignant
export const getTeacherStudentsCount = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Vérifier que l'utilisateur est un enseignant
    const [users] = await db.query("SELECT role FROM users WHERE id = ?", [teacherId]);
    if (users.length === 0 || users[0].role !== "enseignant") {
      return res.status(403).json({ message: "Accès refusé. Réservé aux enseignants." });
    }

    // Récupérer les classes assignées à l'enseignant
    const [teacherClasses] = await db.query(
      "SELECT classe_id FROM classe_enseignant WHERE enseignant_id = ?",
      [teacherId]
    );

    if (teacherClasses.length === 0) {
      return res.status(200).json({ count: 0 });
    }

    const classIds = teacherClasses.map((tc) => tc.classe_id);

    // Compter les étudiants dans ces classes
    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM users u
       WHERE u.role = 'etudiant'
         AND u.classe_id IN (${classIds.map(() => "?").join(",")})`,
      classIds
    );

    const count = result[0]?.count || 0;

    res.status(200).json({ count });
  } catch (error) {
    console.error("❌ Erreur lors du comptage des étudiants :", error);
    res.status(500).json({ message: "Erreur serveur lors du comptage des étudiants." });
  }
};

