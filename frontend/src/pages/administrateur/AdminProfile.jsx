import { useState } from "react";
import { getUser, saveAuth, getToken } from "../auth";
import "./AdminProfile.css";

export default function AdminProfile() {
  const user = getUser();

  const [editProfile, setEditProfile] = useState(false);
  const [editPassword, setEditPassword] = useState(false);

  const [nom, setNom] = useState(user?.nom || "");
  const [prenom, setPrenom] = useState(user?.prenom || "");
  const email = user?.email || "";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [serverMessage, setServerMessage] = useState("");

  /* ================= UPDATE PROFILE ================= */
  const handleUpdateProfile = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ nom, prenom }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      saveAuth(getToken(), data, true);
      setEditProfile(false);
      alert("Profil mis à jour ✅");
    } catch (err) {
      alert(err.message || "Erreur lors de la mise à jour");
    }
  };

  /* ================= CHANGE PASSWORD ================= */
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Tous les champs sont obligatoires");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    setPasswordError("");
    setServerMessage("");

    try {
      const res = await fetch(
        "http://localhost:5000/api/admin/change-password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setServerMessage("Mot de passe modifié avec succès ✅");
      setEditPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Erreur serveur");
    }
  };

  return (
    <div className="admin-profile container py-4">
      <h3 className="fw-bold mb-4 text-primary">
        <i className="fas fa-user-shield me-2"></i>
        Profil Administrateur
      </h3>

      {/* ================= PROFIL ================= */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header fw-semibold bg-light">
          Informations personnelles
        </div>

        <div className="card-body">
          {!editProfile ? (
            <div className="row g-3">
              <div className="col-md-4">
                <label className="text-muted small">Nom</label>
                <div className="fw-semibold">{nom}</div>
              </div>

              <div className="col-md-4">
                <label className="text-muted small">Prénom</label>
                <div className="fw-semibold">{prenom || "-"}</div>
              </div>

              <div className="col-md-4">
                <label className="text-muted small">Email</label>
                <div className="fw-semibold">{email}</div>
              </div>

              <div className="col-12 mt-3">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => setEditProfile(true)}
                >
                  <i className="fas fa-edit me-1"></i>
                  Modifier le profil
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Nom</label>
                  <input
                    className="form-control"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Prénom</label>
                  <input
                    className="form-control"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                  />
                </div>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-primary" onClick={handleUpdateProfile}>
                  Enregistrer
                </button>
                <button
                  className="btn btn-light"
                  onClick={() => setEditProfile(false)}
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= SÉCURITÉ ================= */}
      <div className="card shadow-sm">
        <div className="card-header fw-semibold bg-light text-danger">
          Sécurité
        </div>

        <div className="card-body">
          {!editPassword ? (
            <button
              className="btn btn-outline-danger"
              onClick={() => setEditPassword(true)}
            >
              <i className="fas fa-lock me-1"></i>
              Changer le mot de passe
            </button>
          ) : (
            <>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  className={`form-control ${
                    passwordError ? "is-invalid" : ""
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {passwordError && (
                  <div className="invalid-feedback">{passwordError}</div>
                )}
              </div>

              {serverMessage && (
                <div className="alert alert-success py-2">
                  {serverMessage}
                </div>
              )}

              <div className="d-flex gap-2">
                <button
                  className="btn btn-danger"
                  onClick={handleChangePassword}
                >
                  Changer
                </button>
                <button
                  className="btn btn-light"
                  onClick={() => setEditPassword(false)}
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
