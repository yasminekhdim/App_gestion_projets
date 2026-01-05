import db from "../config/db.js";

// 🧠 Fonctions liées au modèle User
const User = {
  // 🔹 Trouver un utilisateur par email
  findByEmail: async (email) => {
    console.log("🔍 Requête SQL pour l'email :", email);
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    console.log("📊 Résultat SQL :", rows);
    return rows[0]; // retourne l'utilisateur trouvé ou undefined
  },

  // 🔹 Trouver un utilisateur par CIN
  findByCin: async (cin) => {
    const [rows] = await db.query("SELECT * FROM users WHERE cin = ?", [cin]);
    return rows[0];
  },

  // 🔹 Créer un nouvel utilisateur
  create: async (userData) => {
    const {
      nom,
      prenom,
      email,
      mot_de_passe,
      role = "etudiant",
      cin,
      date_naissance,
      departement,
      classe_id,
      proof_of_id_url,
      proof_of_id_name,
      proof_of_id_public_id,
    } = userData;

    const [result] = await db.query(
      `INSERT INTO users (
        nom, prenom, email, mot_de_passe, role, cin, date_naissance,
        departement, classe_id, proof_of_id_url, proof_of_id_name, proof_of_id_public_id,
        proof_of_id_added_at, status, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'incomplete', 0)`,
      [
        nom,
        prenom,
        email,
        mot_de_passe,
        role,
        cin || null,
        date_naissance || null,
        departement || null,
        classe_id || null,
        proof_of_id_url || null,
        proof_of_id_name || null,
        proof_of_id_public_id || null,
      ]
    );
    return result.insertId; // retourne l'ID du nouvel utilisateur
  },

  // 🔹 Trouver un utilisateur par ID
  findById: async (id) => {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  },

  // 🔹 Mettre à jour le document de vérification (using Cloudinary URLs)
  updateProfileAfterUpload: async (id, document_url, document_name, document_public_id, departement = null, classe_id = null) => {
    await db.query(
      `UPDATE users
       SET proof_of_id_url = ?, 
           proof_of_id_name = ?,
           proof_of_id_public_id = ?,
           proof_of_id_added_at = NOW(), 
           departement = COALESCE(?, departement),
           classe_id = COALESCE(?, classe_id),
           status = 'pending', 
           status_updated_at = NOW()
       WHERE id = ?`,
      [document_url, document_name, document_public_id, departement, classe_id, id]
    );
  },

// 🔹 Mettre à jour le statut (admin valide / rejette)
  updateStatus: async (id, status, reason = null) => {
    await db.query(
      `UPDATE users 
       SET status = ?, 
           verified = ?, 
           status_reason = ?, 
           status_updated_at = NOW() 
       WHERE id = ?`,
      [status, status === "approved" ? 1 : 0, reason, id]
    );
  },


// réinitialiser le mots de passe 
  updatePasswordByEmail: async (email, hashedPassword) => {
  const [result] = await db.query(
    "UPDATE users SET mot_de_passe = ? WHERE email = ?",
    [hashedPassword, email]
  );
  console.log(result);
  return result;
},


  // 🔹 Récupérer tous les utilisateurs approuvés
getApprovedUsers: async (filters = {}) => {
  let query = `
    SELECT id, nom, prenom, email, role, status, verified
    FROM users
    WHERE status = 'approved'
  `;

  const params = [];

  // 🔍 Recherche par nom / prénom / email
  if (filters.search) {
    query += `
      AND (
        nom LIKE ?
        OR prenom LIKE ?
        OR email LIKE ?
      )
    `;
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  // 🎓 Filtrage par rôle
  if (filters.role) {
    query += " AND role = ?";
    params.push(filters.role);
  }

  // 🔹 Filtrage par statut activé/désactivé
if (filters.verified === "1" || filters.verified === "0") {
  query += " AND verified = ?";
  params.push(filters.verified);
}
  query += " ORDER BY nom ASC";

  const [rows] = await db.query(query, params);
  return rows;
},
// 🔹 Activer / Désactiver un utilisateur
toggleUserStatus: async (id, active) => {
  await db.query(
    "UPDATE users SET verified = ? WHERE id = ?",
    [active ? 1 : 0, id]
  );
},

// 🔹 Supprimer un utilisateur
deleteUser: async (id) => {
  await db.query("DELETE FROM users WHERE id = ?", [id]);
},

};

// 📊 Dashboard admin stats
User.getDashboardStats = async () => {
  // Totaux
  const [[{ totalUsers }]] = await db.query(
    "SELECT COUNT(*) AS totalUsers FROM users"
  );

  const [[{ pendingUsers }]] = await db.query(
    "SELECT COUNT(*) AS pendingUsers FROM users WHERE status = 'pending'"
  );

  const [[{ activeUsers }]] = await db.query(
    "SELECT COUNT(*) AS activeUsers FROM users WHERE verified = 1"
  );

  const [[{ disabledUsers }]] = await db.query(
    "SELECT COUNT(*) AS disabledUsers FROM users WHERE verified = 0"
  );

  const [[{ students }]] = await db.query(
    "SELECT COUNT(*) AS students FROM users WHERE role = 'etudiant'"
  );

  const [[{ teachers }]] = await db.query(
    "SELECT COUNT(*) AS teachers FROM users WHERE role = 'enseignant'"
  );

  const [[{ admins }]] = await db.query(
    "SELECT COUNT(*) AS admins FROM users WHERE role = 'administrateur'"
  );

  // 🔥 Derniers utilisateurs inscrits (SAFE)
  const [recentUsersRaw] = await db.query(
    `SELECT nom, prenom
     FROM users
     ORDER BY date_creation DESC
     LIMIT 7`
  );

  // ✅ Mapping PROPRE (aucun undefined possible)
  const recentUsers = recentUsersRaw.map((u) => ({
    name: `${u.nom} ${u.prenom || ""}`.trim(),
    count: 1,
  }));

  return {
    totalUsers,
    pendingUsers,
    activeUsers,
    disabledUsers,
    roles: {
      students,
      teachers,
      admins,
    },
    recentUsers, // ✅ format parfait pour Recharts
  };
};

// ================= ADMIN PROFILE =================

// 🔹 Récupérer le profil admin
User.getAdminProfile = async (id) => {
  const [rows] = await db.query(
    "SELECT id, nom, prenom, email, role FROM users WHERE id = ? AND role = 'administrateur'",
    [id]
  );
  return rows[0];
};



export default User;
