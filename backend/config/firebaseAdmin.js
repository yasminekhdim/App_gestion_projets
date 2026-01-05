import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let basePath = decodeURIComponent(new URL('.', import.meta.url).pathname);

// Sous Windows, enlever le premier slash si présent (ex: /C:/...)
if (process.platform === "win32" && basePath.startsWith('/')) {
  basePath = basePath.slice(1);
}
const serviceAccountPath = path.resolve(basePath, "serviceAccountKey.json");
console.log("Chemin serviceAccountKey.json corrigé :", serviceAccountPath);

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ ERREUR: Le fichier serviceAccountKey.json est introuvable !");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;