import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Middleware pour vérifier le token JWT
export const verifyToken = (req, res, next) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant ou invalide" });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ajouter les infos utilisateur à la requête
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expiré" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalide" });
    }
    return res.status(500).json({ message: "Erreur lors de la vérification du token" });
  }
};

export const requireAdmin = (req, res, next) => {
  // verifyToken must be called before this middleware
  if (!req.userId || !req.userRole) {
    return res.status(401).json({ message: "Token manquant ou invalide" });
  }

  if (req.userRole !== "administrateur") {
    return res.status(403).json({ message: "Accès refusé : admin uniquement" });
  }

  // Also set req.user for compatibility with adminController
  req.user = {
    id: req.userId,
    email: req.userEmail,
    role: req.userRole
  };

  next();
};
