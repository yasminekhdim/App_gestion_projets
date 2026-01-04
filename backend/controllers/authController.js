import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import db from "../config/db.js";
import { uploadFile, FOLDER_TYPES } from "../utils/cloudinaryUpload.js";

dotenv.config(); // don't forget this to load JWT_SECRET

export const register = async (req, res) => {
  try {
    // 1️⃣ Récupérer les données envoyées (FormData)
    const {
      nom,
      prenom,
      email,
      password,
      role,
      cin,
      dateNaissance,
      departement,
      classe,
    } = req.body;

    const proofOfIdFile = req.file;

    // 2️⃣ Vérifier que tous les champs obligatoires sont présents
    if (!nom || !prenom || !email || !password || !cin || !dateNaissance || !departement) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires." });
    }

    if (!proofOfIdFile) {
      return res.status(400).json({ message: "Veuillez téléverser la preuve d'identité." });
    }

    if (role === "etudiant" && !classe) {
      return res.status(400).json({ message: "Veuillez saisir votre classe." });
    }

    // 3️⃣ Vérifier si l'email existe déjà
    const [existingUserByEmail] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUserByEmail.length > 0) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    // 4️⃣ Vérifier si le CIN existe déjà
    if (cin) {
      const existingUserByCin = await User.findByCin(cin);
      if (existingUserByCin) {
        return res.status(400).json({ message: "Ce CIN est déjà utilisé." });
      }
    }

    // 5️⃣ Gérer classe_id pour les étudiants
    let classe_id = null;
    if (role === "etudiant" && classe) {
      // classe est maintenant l'ID de la classe sélectionnée
      classe_id = parseInt(classe);
      if (isNaN(classe_id)) {
        return res.status(400).json({ message: "ID de classe invalide." });
      }
      // Vérifier que la classe existe
      const [existingClass] = await db.query("SELECT id FROM classes WHERE id = ?", [classe_id]);
      if (existingClass.length === 0) {
        return res.status(400).json({ message: "Classe introuvable." });
      }
    }

    // 6️⃣ Upload du fichier proof_of_id vers Cloudinary dans projectHub/identite
    let proof_of_id_url = null;
    let proof_of_id_name = null;
    let proof_of_id_public_id = null;

    try {
      const uploadResult = await uploadFile(proofOfIdFile, FOLDER_TYPES.IDENTITE);
      proof_of_id_url = uploadResult.secure_url;
      proof_of_id_name = proofOfIdFile.originalname;
      proof_of_id_public_id = uploadResult.public_id;
    } catch (uploadError) {
      console.error("❌ Erreur lors de l'upload Cloudinary :", uploadError);
      return res.status(500).json({ message: "Erreur lors du téléversement du fichier." });
    }

    // 7️⃣ Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 9️⃣ Création du nouvel utilisateur
    const newUserId = await User.create({
      nom,
      prenom,
      email,
      mot_de_passe: hashedPassword,
      role: role || "etudiant",
      cin,
      date_naissance: dateNaissance,
      departement,
      classe_id,
      proof_of_id_url,
      proof_of_id_name,
      proof_of_id_public_id,
    });

    // 🔟 Création d'un token JWT
    const token = jwt.sign(
      { id: newUserId, email, role: role || "etudiant" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 1️⃣1️⃣ Réponse au client
    res.status(201).json({
      message: "Utilisateur enregistré avec succès ✅. Votre compte est en attente de validation.",
      user: {
        id: newUserId,
        nom,
        prenom,
        email,
        role: role || "etudiant",
        status: "incomplete",
      },
      token,
    });
  } catch (error) {
    console.error("❌ Erreur dans register :", error);
    res.status(500).json({ 
      message: "Erreur serveur lors de l'inscription.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

export const login = async (req, res) => {   // ✅ async added here
  try {
    // 1️⃣ Récupérer les infos envoyées dans la requête
    const { email, password } = req.body;
    console.log("📩 Corps reçu :", req.body);

    console.log("🔍 Email reçu :", email);

    if (!email || !password) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs" });
    }

    // 2️⃣ Chercher l’utilisateur dans la base de données
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    const user= rows[0];
    if (!user) {
      return res.status(400).json({ message: "Utilisateur introuvable" });
    }
    console.log("Mot de passe reçu :", password);
    console.log("Mot de passe hashé en BD :", user.mot_de_passe);
    // 3️⃣ Comparer le mot de passe avec le hash enregistré
    const isMatch = await bcrypt.compare(password, user.mot_de_passe);
    console.log("✅ Correspondance mot de passe :", isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    // 4️⃣ Créer un token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 5️⃣ Réponse finale envoyée au client
    res.status(200).json({
      message: "Connexion réussie ✅",
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        status: user.status,
        profilePic_url: user.profilePic_url || null,
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
