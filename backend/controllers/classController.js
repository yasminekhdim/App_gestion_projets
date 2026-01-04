import db from "../config/db.js";

// Récupérer les classes par département
export const getClassesByDepartment = async (req, res) => {
  try {
    const { departement } = req.params;

    if (!departement) {
      return res.status(400).json({ message: "Le département est requis." });
    }

    const [classes] = await db.query(
      "SELECT id, classe FROM classes WHERE departement = ? ORDER BY classe",
      [departement]
    );

    res.status(200).json({ classes });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des classes :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des classes." });
  }
};

