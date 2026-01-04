import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// ✅ Création de la connexion en mode promesse
const db = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  .promise(); // <-- rend db.query compatible avec await

// ✅ Vérification de la connexion
try {
  const [rows] = await db.query("SELECT 1");
  console.log("✅ Connexion réussie à MySQL (mode promesse)");
} catch (err) {
  console.error("❌ Erreur de connexion à MySQL :", err);
}

export default db;
