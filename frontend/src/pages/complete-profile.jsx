import React, { useState, useEffect } from "react";
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
    classe_id: "",
    cin: "",
    date_naissance: "",
  });
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Load classes when department changes (for students)
  useEffect(() => {
    const fetchClasses = async () => {
      if (role === "etudiant" && formData.departement) {
        setLoadingClasses(true);
        setFormData((prev) => ({ ...prev, classe_id: "" })); // Reset class
        try {
          const encodedDepartement = encodeURIComponent(formData.departement);
          const response = await fetch(
            `http://localhost:5000/api/classes/${encodedDepartement}`
          );
          const data = await response.json();
          if (response.ok) {
            setClasses(data.classes || []);
          } else {
            setClasses([]);
            console.error("Erreur lors du chargement des classes:", data.message);
          }
        } catch (error) {
          console.error("Erreur lors du chargement des classes:", error);
          setClasses([]);
        } finally {
          setLoadingClasses(false);
        }
      } else {
        setClasses([]);
      }
    };
    fetchClasses();
  }, [formData.departement, role]);

  const handleRoleSelect = (e) => {
    setRole(e.target.value);
    // Reset form when role changes
    setFormData({
      attestation: null,
      verification_document: null,
      departement: "",
      classe_id: "",
      cin: "",
      date_naissance: "",
    });
    setClasses([]);
  };

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
          !formData.classe_id ||
          !formData.cin ||
          !formData.date_naissance)) ||
      (role === "enseignant" &&
        (!formData.verification_document ||
          !formData.departement ||
          !formData.cin ||
          !formData.date_naissance))
    ) {
      setMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const data = new FormData();
    
    // Append files
    if (formData.attestation) {
      data.append("attestation", formData.attestation);
    }
    if (formData.verification_document) {
      data.append("verification_document", formData.verification_document);
    }
    
    // Append other fields
    data.append("role", role);
    data.append("departement", formData.departement);
    if (formData.classe_id) {
      data.append("classe_id", formData.classe_id);
    }
    data.append("cin", formData.cin);
    data.append("date_naissance", formData.date_naissance);

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

          <label>Département</label>
          <select 
            name="departement" 
            value={formData.departement} 
            onChange={handleChange} 
            required
          >
            <option value="">Sélectionnez un département</option>
            <option value="Génie Civil">Génie Civil</option>
            <option value="Génie Electrique">Génie Electrique</option>
            <option value="Génie Mécanique">Génie Mécanique</option>
            <option value="Science Economique et de Gestion">Science Economique et de Gestion</option>
            <option value="Technologies de l'Informatique">Technologies de l'Informatique</option>
          </select>

          {role === "etudiant" && (
            <>
              <label>Classe</label>
              {loadingClasses ? (
                <p>Chargement des classes...</p>
              ) : (
                <select 
                  name="classe_id" 
                  value={formData.classe_id} 
                  onChange={handleChange} 
                  required
                  disabled={!formData.departement}
                >
                  <option value="">Sélectionnez une classe</option>
                  {classes.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.classe}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          <input type="text" name="cin" placeholder="CIN" value={formData.cin} onChange={handleChange} required />
          <input type="date" name="date_naissance" value={formData.date_naissance} onChange={handleChange} required />

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
