import React, { useState } from "react";
import backgroundImage from "../assets/image.png";
import { useNavigate } from "react-router-dom";
import "./CompleteProfile.css";
import { getToken } from "./auth";

export default function CompleteProfile() {
  const [role, setRole] = useState("");
  const [formData, setFormData] = useState({
    attestation: null,
    verification_document: null,
    departement: "",
    classe: "",
    classes_enseignees: "",
    cin: "",
    date_naiss: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRoleSelect = (e) => setRole(e.target.value);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation simple
    if (
      (role === "etudiant" &&
        (!formData.attestation ||
          !formData.departement ||
          !formData.classe ||
          !formData.cin ||
          !formData.date_naiss)) ||
      (role === "enseignant" &&
        (!formData.verification_document ||
          !formData.departement ||
          !formData.classes_enseignees ||
          !formData.cin ||
          !formData.date_naiss))
    ) {
      setMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const data = new FormData();
    for (const key in formData) {
      if (formData[key]) data.append(key, formData[key]);
    }
    data.append("role", role);

    const token = getToken();
    if (!token) {
      setMessage("Vous devez être connecté pour compléter votre profil.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/complete-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Response is not JSON, raw text:", text);
        setMessage("Erreur serveur : " + text);
        return;
      }

      setMessage("Profil complété, en attente de validation.");
      setTimeout(() => {
        navigate("/profilePending"); // Redirection après succès
      }, 2000);
    } catch (error) {
      setMessage("Erreur réseau ou serveur");
      console.error(error);
    }
  };

  return (
<div className="complete-bg" style={{ backgroundImage: `url(${backgroundImage})` }}>
    <div className="complete-profile-container">

      {!role ? (
        <div className="form-card role-selection animated-card">
          <h2 className="title">Choisissez votre rôle</h2>

          <div className="role-options">
            <label className="role-option">
              <input type="radio" name="role" value="etudiant" onChange={handleRoleSelect} />
              <span>🎓 Étudiant</span>
            </label>

            <label className="role-option">
              <input type="radio" name="role" value="enseignant" onChange={handleRoleSelect} />
              <span>📚 Enseignant</span>
            </label>
          </div>
        </div>
      ) : (
        <form className="form-card animated-card" onSubmit={handleSubmit}>
          <h2 className="title">
            {role === "etudiant" ? "Profil Étudiant" : "Profil Enseignant"}
          </h2>

          {role === "etudiant" && (
            <>
              <label>Attestation d'inscription</label>
              <input type="file" name="attestation" accept=".pdf,.jpg,.jpeg,.png" required onChange={handleChange} />
            </>
          )}

          {role === "enseignant" && (
            <>
              <label>Document de vérification</label>
              <input type="file" name="verification_document" accept=".pdf,.jpg,.jpeg,.png" required onChange={handleChange} />
            </>
          )}

          <input type="text" name="departement" placeholder="Département" value={formData.departement} onChange={handleChange} required />

          {role === "etudiant" && (
            <input type="text" name="classe" placeholder="Classe" value={formData.classe} onChange={handleChange} required />
          )}

          {role === "enseignant" && (
            <input type="text" name="classes_enseignees" placeholder="Classes enseignées" value={formData.classes_enseignees} onChange={handleChange} required />
          )}

          <input type="text" name="cin" placeholder="CIN" value={formData.cin} onChange={handleChange} required />
          <input type="date" name="date_naiss" value={formData.date_naiss} onChange={handleChange} required />

          {message && (
            <p className={`message ${message.toLowerCase().includes("erreur") ? "error" : "success"}`}>
              {message}
            </p>
          )}

          <button type="submit" className="submit-btn">Envoyer</button>
        </form>
      )}

    </div>
  </div>
  );
}
