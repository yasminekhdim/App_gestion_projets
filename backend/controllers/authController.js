import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import db from "../config/db.js";
import { uploadFile, FOLDER_TYPES } from "../utils/cloudinaryUpload.js";
import transporter from "../config/Mail.js";
import admin from "../config/firebaseAdmin.js";

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
        status: "pending",
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
    const { email, password, rememberMe } = req.body;
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
    const expiresIn = rememberMe ? "7d" : "1h";


    // 4️⃣ Créer un token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn }
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
/* --------------------------------------------------------- */
/*                  FORGOT PASSWORD                          */
/* --------------------------------------------------------- */

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable ❌" });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `http://localhost:5173/resetPassword/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Réinitialisation du mot de passe",
      html: `
        <h2>Réinitialisation</h2>
        <p>Bonjour ${user.nom},</p>
        <p>Cliquez ici pour réinitialiser votre mot de passe :</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Le lien expire dans 15 minutes.</p>
      `,
    });

    res.json({ message: "📧 Email envoyé !" });
  } catch (error) {
    console.error("Erreur forgotPassword :", error);
    res.status(500).json({ message: "Erreur serveur ⚠️" });
  }
};

/* --------------------------------------------------------- */
/*                    RESET PASSWORD                         */
/* --------------------------------------------------------- */

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updatePasswordByEmail(email, hashedPassword);

    res.json({ message: "Mot de passe mis à jour avec succès !" });
  } catch (error) {
    console.error("Erreur resetPassword :", error);
    res.status(400).json({ message: "Token invalide ou expiré ❌" });
  }
};

/* --------------------------------------------------------- */
/*                GOOGLE AUTH (Firebase Admin)               */
/* --------------------------------------------------------- */

export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    const decodedToken = await admin.auth().verifyIdToken(token);

    const { email, name } = decodedToken;

    const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    let user;

    if (existingUser.length > 0) {
      user = existingUser[0];
      console.log("Utilisateur existant trouvé:", user);
    } else {
      const hashedPassword = await bcrypt.hash("google_user", 10);

      const [result] = await db.query(
        "INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)",
        [name, email, hashedPassword, "etudiant"]
      );

      user = {
        id: result.insertId,
        nom: name,
        email,
        role: "etudiant",
      };

      console.log("Nouvel utilisateur créé:", user);
    }

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Connexion Google réussie ✔",
      token: jwtToken,
      user: {
    id: user.id,
    nom: user.nom,
    email: user.email,
    role: user.role,
    status: user.status,      // <-- Ajouter ce champ
  },
    });
  } catch (error) {
    console.error("❌ Erreur Google Auth :", error);
    res.status(500).json({ message: "Erreur serveur Google OAuth" });
  }

};

export const completeProfile = async (req, res) => {
  try {
    const userId = req.userId; // Use req.userId from verifyToken middleware

    const {
      role,
      departement,
      classe_id,
      cin,
      date_naissance,
    } = req.body;

    // Files uploaded via multer (memory storage)
    const attestationFile = req.files?.attestation ? req.files.attestation[0] : null;
    const verificationFile = req.files?.verification_document ? req.files.verification_document[0] : null;

    // Validation
    if (!role) {
      return res.status(400).json({ message: "Le rôle est requis" });
    }

    if (role === "etudiant" && !attestationFile) {
      return res.status(400).json({ message: "Attestation requise pour étudiant" });
    }

    if (role === "enseignant" && !verificationFile) {
      return res.status(400).json({ message: "Document de vérification requis pour enseignant" });
    }

    // Upload files to Cloudinary
    let proof_of_id_url = null;
    let proof_of_id_name = null;
    let proof_of_id_public_id = null;

    const fileToUpload = role === "etudiant" ? attestationFile : verificationFile;
    
    if (fileToUpload) {
      try {
        const uploadResult = await uploadFile(fileToUpload, FOLDER_TYPES.IDENTITE);
        proof_of_id_url = uploadResult.secure_url;
        proof_of_id_name = fileToUpload.originalname;
        proof_of_id_public_id = uploadResult.public_id;
      } catch (uploadError) {
        console.error("❌ Erreur lors de l'upload Cloudinary :", uploadError);
        return res.status(500).json({ message: "Erreur lors du téléversement du fichier." });
      }
    }

    // Update user profile
    await db.query(
      `UPDATE users SET
        role = ?,
        departement = ?,
        classe_id = ?,
        cin = ?,
        date_naissance = ?,
        proof_of_id_url = ?,
        proof_of_id_name = ?,
        proof_of_id_public_id = ?,
        proof_of_id_added_at = NOW(),
        status = 'pending',
        status_updated_at = NOW()
      WHERE id = ?`,
      [
        role,
        departement || null,
        classe_id || null,
        cin || null,
        date_naissance || null,
        proof_of_id_url,
        proof_of_id_name,
        proof_of_id_public_id,
        userId,
      ]
    );
    
    res.json({ message: "Profil complété, en attente de validation." });
  } catch (error) {
    console.error("Erreur completeProfile :", error);
    res.status(500).json({ message: "Erreur serveur lors de la complétion du profil." });
  }
};
