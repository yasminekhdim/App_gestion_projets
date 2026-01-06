import React, { useEffect, useState, useMemo } from "react";
import { getToken } from "../auth";
import "./AdminValidation.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

export default function AdminValidation() {
  const token = getToken();

  // ================= STATE =================
  const [pendingUsers, setPendingUsers] = useState([]);
  const [detailUser, setDetailUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  // ================= FETCH =================
  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/pending", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      // Normalize fields to avoid null values which would break string methods
      const normalized = (data || []).map((u) => ({
        ...u,
        nom: u.nom || "",
        prenom: u.prenom || "",
        email: u.email || "",
        departement: u.departement || "",
        classe: u.classe || "",
      }));
      setPendingUsers(normalized);
    } catch (err) {
      console.error("❌ fetchPendingUsers:", err);
    }
  };

  // ================= ACTIONS =================

  const approveUser = async (id) => {
    if (!window.confirm("Voulez-vous vraiment valider ce compte ?")) return;

    try {
      await fetch(`http://localhost:5000/api/admin/approve/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("❌ approveUser:", err);
    }
  };

  const rejectUser = async () => {
    if (!selectedUser || !reason.trim()) return;

    try {
      await fetch(`http://localhost:5000/api/admin/reject/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      setPendingUsers((prev) =>
        prev.filter((u) => u.id !== selectedUser.id)
      );

      setReason("");
      setSelectedUser(null);
      setShowRejectModal(false);
    } catch (err) {
      console.error("❌ rejectUser:", err);
    }
  };

  // ================= FILTER =================
  const filteredUsers = useMemo(() => {
    const s = (search || "").toLowerCase();
    return pendingUsers.filter((u) => {
      if (!u) return false;
      const nom = (u.nom || "").toLowerCase();
      const prenom = (u.prenom || "").toLowerCase();
      const email = (u.email || "").toLowerCase();

      const textMatch = nom.includes(s) || prenom.includes(s) || email.includes(s);
      const roleMatch = role === "" || u.role === role;
      return textMatch && roleMatch;
    });
  }, [pendingUsers, search, role]);

  // ================= UI =================
  return (
    <div className="validation-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold">Validation des comptes</h3>
        <span className="badge bg-warning text-dark">
          {filteredUsers.length} en attente
        </span>
      </div>

      {/* FILTERS */}
      <div className="row mb-3">
        <div className="col-md-6">
          <input
            className="form-control"
            placeholder="Nom, prénom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Tous les rôles</option>
            <option value="etudiant">Étudiant</option>
            <option value="enseignant">Enseignant</option>
            <option value="administrateur">Administrateur</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              Aucun compte en attente
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.nom}</td>
                      <td>{user.prenom}</td>
                      <td className="text-muted">{user.email}</td>
                      <td>
                        <span className="badge bg-secondary text-capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="text-end">
                        {/* VOIR DETAILS */}
                        <button
                          className="btn btn-outline-info btn-sm me-2"
                          title="Voir détails"
                          onClick={() => {
                            setDetailUser(user);
                            setShowDetailModal(true);
                          }}
                        >
                          👁
                        </button>

                        {/* APPROUVER */}
                        <button
                          className="btn btn-outline-success btn-sm me-2"
                          title="Approuver"
                          onClick={() => approveUser(user.id)}
                        >
                          ✔
                        </button>

                        {/* REJETER */}
                        <button
                          className="btn btn-outline-danger btn-sm"
                          title="Rejeter"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRejectModal(true);
                          }}
                        >
                          ✖
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL DETAILS ================= */}
      {showDetailModal && detailUser && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Détails de l'utilisateur</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                />
              </div>

              <div className="modal-body">
                <p><b>Nom :</b> {detailUser.nom}</p>
                <p><b>Prénom :</b> {detailUser.prenom}</p>
                <p><b>Email :</b> {detailUser.email}</p>
                <p><b>Rôle :</b> {detailUser.role}</p>
                <p><b>CIN :</b> {detailUser.cin || "—"}</p>
                <p><b>Date de naissance :</b> {detailUser.date_naissance || "—"}</p>
                <p><b>Département :</b> {detailUser.departement || "—"}</p>
                <p><b>Classe :</b> {detailUser.classe || "—"}</p>

                {detailUser.proof_of_id_url && (
                  <a
                    href={detailUser.proof_of_id_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm mt-2"
                  >
                    Télécharger le document
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL REJET ================= */}
      {showRejectModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Raison du rejet</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowRejectModal(false)}
                />
              </div>

              <div className="modal-body">
                <textarea
                  className="form-control"
                  rows="4"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-light"
                  onClick={() => setShowRejectModal(false)}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-danger"
                  onClick={rejectUser}
                >
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}