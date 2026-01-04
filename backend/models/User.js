import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// 🧩 Création d'une connexion à la base de données MySQL
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ✅ Vérification de la connexion
try {
  await db.connect();
  console.log("✅ Connexion MySQL réussie (users model)");
} catch (error) {
  console.error("❌ Erreur de connexion MySQL :", error);
}

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
        proof_of_id_added_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'incomplete')`,
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
    const [rows] = await db.query("SELECT * FROM gestionprojets.users WHERE id = ?", [id]);
    return rows[0];
  },
};

export default User;
