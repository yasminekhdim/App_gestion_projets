import db from "../config/db.js";
import transporter from "../config/Mail.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

/**
 * 🔹 Récupérer tous les utilisateurs en attente d'approbation
 */
export const getPendingUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT 
        id, nom, prenom, email, role, status, date_creation, 
        departement, classe_id, cin, date_naissance,
        proof_of_id_url, proof_of_id_name, proof_of_id_public_id, proof_of_id_added_at,
        status_reason, status_updated_at, verified
      FROM users 
      WHERE status = 'pending'
      ORDER BY date_creation DESC`
    );
    console.log(users);
    res.json(users);
  } catch (error) {
    console.error("❌ Erreur getPendingUsers :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * 🔹 Approuver un utilisateur
 */
export const approveUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Vérifier si l'utilisateur existe
    const [userRows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Mettre à jour le statut et verified
    await User.updateStatus(userId, "approved");

    // Envoyer email d’approbation
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Votre compte a été approuvé ✔",
      html: `
        <h2>Bonjour ${user.prenom} ${user.nom},</h2>
        <p>Votre compte a été vérifié et approuvé par l'administrateur.</p>
        <p>Vous pouvez maintenant accéder à toutes les fonctionnalités de la plateforme.</p>
        <br/>
        <p>Cordialement,</p>
        <p><b>L’équipe Support</b></p>
      `,
    });

    res.json({ message: "Utilisateur approuvé et email envoyé." });

  } catch (error) {
    console.error("❌ Erreur approveUser :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * 🔹 Rejeter un utilisateur avec une raison
 */
export const rejectUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "La raison du rejet est obligatoire." });
    }

    // Vérifier si l'utilisateur existe
    const [userRows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Mettre à jour le statut et verified
    await User.updateStatus(userId, "rejected", reason);

    // Envoyer email de rejet
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Votre compte a été rejeté ❌",
      html: `
        <h2>Bonjour ${user.prenom} ${user.nom},</h2>
        <p>Votre compte a été examiné, mais n'a malheureusement pas été approuvé.</p>
        <p><b>Raison :</b> ${reason}</p>
        <br/>
        <p>Vous pouvez modifier les informations et faire une nouvelle demande d'inscription.</p>
        <br/>
        <p>Cordialement,</p>
        <p><b>L’équipe Support</b></p>
      `,
    });

    res.json({ message: "Utilisateur rejeté et email envoyé." });

  } catch (error) {
    console.error("❌ Erreur rejectUser :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
  };

  /**
 * 🔹 Liste des utilisateurs approuvés
 * GET /api/admin/users
 */
export const getApprovedUsers = async (req, res) => {
  try {
    const { search, role, verified } = req.query;

    const users = await User.getApprovedUsers({
      search,
      role,
      verified,
    }); 

    res.json(users);
  } catch (error) {
    console.error("❌ getApprovedUsers:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


/**
 * 🔹 Activer / Désactiver un compte
 * PUT /api/admin/users/:id/status
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { active } = req.body;

    await User.toggleUserStatus(req.params.id, active);
    res.json({ message: "Statut mis à jour" });

  } catch (error) {
    console.error("❌ toggleUserStatus:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * 🔹 Supprimer un utilisateur
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    await User.deleteUser(req.params.id);
    res.json({ message: "Utilisateur supprimé" });

  } catch (error) {
    console.error("❌ deleteUser:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getAdminDashboardStats = async (req, res) => {
  try {
    const stats = await User.getDashboardStats();
    console.log("📊 Dashboard stats:", stats.recentUsers);
    res.json(stats);
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    res.status(500).json({ message: "Erreur serveur dashboard" });
  }
};

//recupérer le profile admin 

export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.userId || req.user?.id;

    const admin = await User.getAdminProfile(adminId);

    if (!admin) {
      return res.status(404).json({ message: "Admin introuvable" });
    }

    res.json(admin);
  } catch (error) {
    console.error("❌ getAdminProfile:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

//modifier le profile admin

export const updateProfile = async (req, res) => {
  try {
    const adminId = req.userId || req.user?.id;
    const { nom, prenom } = req.body;

    if (!nom) {
      return res.status(400).json({ message: "Le nom est obligatoire" });
    }

    await db.query(
      "UPDATE users SET nom = ?, prenom = ? WHERE id = ?",
      [nom, prenom, adminId]
    );

    const [updatedUser] = await db.query(
      "SELECT id, email, nom, prenom, role FROM users WHERE id = ?",
      [adminId]
    );

    res.json(updatedUser[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

//changer le mots de passe 

export const changePassword = async (req, res) => {
  try {
    const adminId = req.userId || req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    const [rows] = await db.query(
      "SELECT mot_de_passe FROM users WHERE id = ?",
      [adminId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Admin introuvable" });
    }

    const userPassword = rows[0].mot_de_passe;
    const isMatch = await bcrypt.compare(currentPassword, userPassword);

    if (!isMatch) {
      return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET mot_de_passe = ? WHERE id = ?",
      [hashedPassword, adminId]
    );

    res.json({ message: "Mot de passe modifié avec succès" });
  } catch (err) {
    console.error("❌ changePassword error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};