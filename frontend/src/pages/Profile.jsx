import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser, saveAuth } from "./auth";
import "./Profile.css";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classMessage, setClassMessage] = useState("");
  const [classError, setClassError] = useState("");

  // Édition du profil
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    date_naissance: "",
  });
  const [saving, setSaving] = useState(false);

  // Changer mot de passe
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdMessage, setPwdMessage] = useState("");

  const navigate = useNavigate();

  // Récupérer le profil au chargement
  useEffect(() => {
    fetchProfile();
  }, []);

  // Charger les classes si l'utilisateur est enseignant
  useEffect(() => {
    if (profile && profile.role === "enseignant") {
      fetchTeacherClasses();
      fetchAvailableClasses();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expiré ou invalide
        navigate("/login");
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setProfile(data);
        if (data.profilePic_url) {
          setPreview(data.profilePic_url);
        }
        // Initialiser le formulaire d'édition
        setFormData({
          nom: data.nom || "",
          prenom: data.prenom || "",
          date_naissance: data.date_naissance ? new Date(data.date_naissance).toISOString().slice(0,10) : "",
        });
      } else {
        setError(data.message || "Erreur lors du chargement du profil");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier la taille (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("Le fichier est trop volumineux (max 5MB)");
        return;
      }

      // Vérifier le type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Type de fichier non autorisé. Formats acceptés: JPG, PNG, GIF, WEBP");
        return;
      }

      setSelectedFile(file);
      setError("");

      // Créer un aperçu
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Veuillez sélectionner une image");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("profilePic", selectedFile);

      const response = await fetch("http://localhost:5000/api/users/profile/picture", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Photo de profil mise à jour avec succès !");
        setSelectedFile(null);
        // Mettre à jour le profil
        await fetchProfile();
        // Mettre à jour les données utilisateur dans localStorage
        const user = getUser();
        if (user) {
          saveAuth(token, { ...user, profilePic_url: data.profilePic.url });
        }
      } else {
        setError(data.message || "Erreur lors de la mise à jour de la photo");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors de la mise à jour de la photo");
    } finally {
      setUploading(false);
    }
  };

  // --- Édition du profil utilisateur ---
  const handleEdit = () => {
    setIsEditing(true);
    setMessage("");
    setError("");
  };

  const handleCancelEdit = () => {
    // Réinitialiser le formulaire à partir du profil chargé
    if (profile) {
      setFormData({
        nom: profile.nom || "",
        prenom: profile.prenom || "",
        date_naissance: profile.date_naissance ? new Date(profile.date_naissance).toISOString().slice(0,10) : "",
      });
    }
    setIsEditing(false);
    setMessage("");
    setError("");
  };

  const handleInputChange = (key, value) => {
    setFormData((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = getToken();
      const payload = {
        // n'envoyer que les champs modifiables
        nom: formData.nom,
        prenom: formData.prenom,
        date_naissance: formData.date_naissance || null,
      };

      const response = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setProfile(data);
        setIsEditing(false);
        setMessage("✅ Profil mis à jour avec succès !");

        // Mettre à jour l'utilisateur stocké localement
        const localUser = getUser();
        if (localUser) {
          saveAuth(token, { ...localUser, nom: data.nom, prenom: data.prenom, profilePic_url: data.profilePic_url || localUser.profilePic_url });
        }
      } else {
        setError(data.message || "Erreur lors de la mise à jour du profil");
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du profil :", err);
      setError("Erreur réseau lors de la mise à jour du profil");
    } finally {
      setSaving(false);
    }
  };


  const getRoleLabel = (role) => {
    const roles = {
      administrateur: "Administrateur",
      enseignant: "Enseignant",
      etudiant: "Étudiant",
    };
    return roles[role] || role;
  };

  const getStatusLabel = (status) => {
    const statuses = {
      incomplete: "Incomplet",
      pending: "En attente",
      approved: "Approuvé",
      rejected: "Rejeté",
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      incomplete: "#f59e0b",
      pending: "#3b82f6",
      approved: "#10b981",
      rejected: "#ef4444",
    };
    return colors[status] || "#6b7280";
  };

  const fetchTeacherClasses = async () => {
    try {
      const token = getToken();
      const response = await fetch("http://localhost:5000/api/teachers/classes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeacherClasses(data.classes || []);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des classes :", err);
    }
  };

  const fetchAvailableClasses = async () => {
    setLoadingClasses(true);
    try {
      const token = getToken();
      const response = await fetch("http://localhost:5000/api/teachers/classes/available", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableClasses(data.classes || []);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des classes disponibles :", err);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleAssignClass = async () => {
    if (!selectedClassId) {
      setClassError("Veuillez sélectionner une classe");
      return;
    }

    setClassError("");
    setClassMessage("");

    try {
      const token = getToken();
      const response = await fetch("http://localhost:5000/api/teachers/classes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ classe_id: parseInt(selectedClassId) }),
      });

      const data = await response.json();

      if (response.ok) {
        setClassMessage("✅ Classe assignée avec succès !");
        setSelectedClassId("");
        // Recharger les listes
        await fetchTeacherClasses();
        await fetchAvailableClasses();
      } else {
        setClassError(data.message || "Erreur lors de l'assignation de la classe");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setClassError("Erreur réseau lors de l'assignation de la classe");
    }
  };

  const handleUnassignClass = async (affectationId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir retirer cette classe ?")) {
      return;
    }

    setClassError("");
    setClassMessage("");

    try {
      const token = getToken();
      const response = await fetch(
        `http://localhost:5000/api/teachers/classes/${affectationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setClassMessage("✅ Classe retirée avec succès !");
        // Recharger les listes
        await fetchTeacherClasses();
        await fetchAvailableClasses();
      } else {
        setClassError(data.message || "Erreur lors du retrait de la classe");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setClassError("Erreur réseau lors du retrait de la classe");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Non renseigné";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Non renseigné";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleBack = () => {
    const user = getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role === "administrateur") navigate("/admin/home");
    else if (user.role === "enseignant") navigate("/enseignant/home");
    else navigate("/etudiant/home");
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">Chargement du profil...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <p>{error || "Profil introuvable"}</p>
          <button onClick={handleBack} className="back-btn">
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <button onClick={handleBack} className="back-btn">
            ← Retour
          </button>
          <h1>Mon Profil</h1>
          <div className="profile-actions">
            {!isEditing ? (
              <button onClick={handleEdit} className="edit-btn">Modifier</button>
            ) : (
              <>
                <button onClick={handleSave} className="save-btn" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button onClick={handleCancelEdit} className="cancel-btn">Annuler</button>
              </>
            )}
          </div>
        </div>

        <div className="profile-content">
          {/* Photo de profil */}
          <div className="profile-picture-section">
            <div className="profile-picture-wrapper">
              {preview ? (
                <img src={preview} alt="Photo de profil" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>

            <div className="profile-picture-actions">
              <label htmlFor="profilePicInput" className="file-input-label">
                {selectedFile ? "Changer l'image" : "Modifier la photo"}
              </label>
              <input
                type="file"
                id="profilePicInput"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              {selectedFile && (
                <div className="upload-actions">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="upload-btn"
                  >
                    {uploading ? "Upload en cours..." : "Enregistrer"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview(profile.profilePic_url || null);
                    }}
                    className="cancel-btn"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
          </div>

          {/* Informations personnelles */}
          <div className="profile-info-section">
            <h2>Informations personnelles</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Nom</label>
                {isEditing ? (
                  <input type="text" value={formData.nom} onChange={(e) => handleInputChange('nom', e.target.value)} />
                ) : (
                  <p>{profile.nom || "Non renseigné"}</p>
                )}
              </div>
              <div className="info-item">
                <label>Prénom</label>
                {isEditing ? (
                  <input type="text" value={formData.prenom} onChange={(e) => handleInputChange('prenom', e.target.value)} />
                ) : (
                  <p>{profile.prenom || "Non renseigné"}</p>
                )}
              </div>
              <div className="info-item">
                <label>Email</label>
                <p>{profile.email}</p>
              </div>
              <div className="info-item">
                <label>CIN</label>
                <p>{profile.cin || "Non renseigné"}</p>
              </div>
              <div className="info-item">
                <label>Date de naissance</label>
                {isEditing ? (
                  <input type="date" value={formData.date_naissance} onChange={(e) => handleInputChange('date_naissance', e.target.value)} />
                ) : (
                  <p>{formatDate(profile.date_naissance)}</p>
                )}
              </div>
              <div className="info-item">
                <label>Rôle</label>
                <p className="role-badge">{getRoleLabel(profile.role)}</p>
              </div>
              <div className="info-item">
                <label>Département</label>
                <p>{profile.departement || "Non renseigné"}</p>
              </div>
              {profile.classe && (
                <div className="info-item">
                  <label>Classe</label>
                  <p>{profile.classe.classe}</p>
                </div>
              )}
              <div className="info-item">
                <label>Statut du compte</label>
                <p
                  className="status-badge"
                  style={{ color: getStatusColor(profile.status) }}
                >
                  {getStatusLabel(profile.status)} {profile.verified ? " (Vérifié)" : ""}
                </p>
              </div>

              {/* Changer mot de passe */}
              <div className="info-item full-width">
                <label>Sécurité</label>
                {!showChangePwd ? (
                  <div>
                    <button className="change-pwd-btn" onClick={() => { setShowChangePwd(true); setPwdError(""); setPwdMessage(""); }}>
                      Changer le mot de passe
                    </button>
                  </div>
                ) : (
                  <div className="change-pwd-form">
                    <input type="password" placeholder="Mot de passe actuel" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    <input type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    <div className="change-pwd-actions">
                      <button className="save-btn" disabled={pwdSaving} onClick={async () => {
                        setPwdError("");
                        setPwdMessage("");
                        if (!currentPassword || !newPassword || !confirmPassword) {
                          setPwdError("Tous les champs sont requis");
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          setPwdError("Les nouveaux mots de passe ne correspondent pas");
                          return;
                        }
                        if (newPassword.length < 8) {
                          setPwdError("Le mot de passe doit contenir au moins 8 caractères");
                          return;
                        }
                        setPwdSaving(true);
                        try {
                          const token = getToken();
                          const res = await fetch("http://localhost:5000/api/users/change-password", {
                            method: "PUT",
                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ currentPassword, newPassword })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setPwdMessage("✅ Mot de passe changé avec succès");
                            setShowChangePwd(false);
                            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
                          } else {
                            setPwdError(data.message || "Erreur lors du changement de mot de passe");
                          }
                        } catch (err) {
                          console.error(err);
                          setPwdError("Erreur réseau lors du changement de mot de passe");
                        } finally {
                          setPwdSaving(false);
                        }
                      }}>Enregistrer</button>
                      <button className="cancel-btn" onClick={() => { setShowChangePwd(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPwdError(""); setPwdMessage(""); }}>Annuler</button>
                    </div>
                    {pwdMessage && <p className="success-message">{pwdMessage}</p>}
                    {pwdError && <p className="error-message">{pwdError}</p>}
                  </div>
                )}
              </div>

              {profile.status_reason && (
                <div className="info-item full-width">
                  <label>Raison du statut</label>
                  <p>{profile.status_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section Classes pour les enseignants */}
          {profile.role === "enseignant" && (
            <div className="profile-classes-section">
              <h2>Mes Classes</h2>
              
              {classMessage && <p className="success-message">{classMessage}</p>}
              {classError && <p className="error-message">{classError}</p>}

              {/* Liste des classes assignées */}
              <div className="classes-list">
                <h3>Classes assignées</h3>
                {teacherClasses.length === 0 ? (
                  <p className="no-classes">Aucune classe assignée pour le moment.</p>
                ) : (
                  <div className="classes-grid">
                    {teacherClasses.map((classe) => (
                      <div key={classe.affectation_id} className="class-card">
                        <div className="class-info">
                          <h4>{classe.classe}</h4>
                          <p className="class-department">{classe.departement}</p>
                          <p className="class-date">
                            Assignée le {formatDateTime(classe.date_affectation)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnassignClass(classe.affectation_id)}
                          className="remove-class-btn"
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ajouter une nouvelle classe */}
              <div className="add-class-section">
                <h3>Ajouter une classe</h3>
                <div className="add-class-form">
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="class-select"
                    disabled={loadingClasses || availableClasses.length === 0}
                  >
                    <option value="">
                      {loadingClasses
                        ? "Chargement..."
                        : availableClasses.length === 0
                        ? "Aucune classe disponible"
                        : "Sélectionnez une classe"}
                    </option>
                    {availableClasses.map((classe) => (
                      <option key={classe.id} value={classe.id}>
                        {classe.classe} - {classe.departement}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignClass}
                    disabled={!selectedClassId || loadingClasses}
                    className="add-class-btn"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

