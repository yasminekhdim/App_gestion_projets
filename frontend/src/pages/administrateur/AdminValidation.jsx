import React, { useEffect, useState, useMemo } from "react";
import "./AdminValidation.css";
import { getToken } from "../auth";

export default function AdminValidation() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reason, setReason] = useState("");
  const [detailUser, setDetailUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 🔍 FILTRES
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const token = getToken();

  useEffect(() => {
    fetchPendingUsers();
    initTooltips();
  }, []);

  // 🔧 Tooltips Bootstrap
  const initTooltips = () => {
    setTimeout(() => {
      const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
      );
      tooltipTriggerList.forEach((el) => {
        new window.bootstrap.Tooltip(el);
      });
    }, 300);
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPendingUsers(data || []);
      initTooltips();
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ APPROUVER
  const approveUser = async (id) => {
    if (!window.confirm("Voulez-vous vraiment valider ce compte ?")) return;

    await fetch(`http://localhost:5000/api/admin/approve/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchPendingUsers();
  };

  // ❌ REJETER
  const rejectUser = async (id) => {
    await fetch(`http://localhost:5000/api/admin/reject/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    setReason("");
    fetchPendingUsers();
  };

  // 🔍 FILTRAGE + RECHERCHE
  const filteredUsers = useMemo(() => {
    return pendingUsers.filter((u) => {
      const textMatch =
        u.nom.toLowerCase().includes(search.toLowerCase()) ||
        u.prenom.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());

      const roleMatch = role === "" || u.role === role;

      return textMatch && roleMatch;
    });
  }, [pendingUsers, search, role]);

  return (
    <div className="container-fluid px-4 py-4">
      {/* TITRE */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Validation des comptes</h3>
        <span className="badge bg-warning text-dark">
          {filteredUsers.length} en attente
        </span>
      </div>

      {/* 🔍 FILTRES */}
      <div className="row mb-3">
        <div className="col-md-6">
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher par nom, prénom ou email..."
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
                        {/* 👁️ DETAILS */}
                        <button
                          className="btn btn-outline-info btn-sm me-2"
                          data-bs-toggle="tooltip"
                          title="Voir détails"
                          onClick={() => {
                            setDetailUser(user);
                            setShowDetailModal(true);
                          }}
                        >
                          <i className="fas fa-eye"></i>
                        </button>

                        {/* ✅ VALIDER */}
                        <button
                          className="btn btn-outline-success btn-sm me-2"
                          data-bs-toggle="tooltip"
                          title="Valider le compte"
                          onClick={() => approveUser(user.id)}
                        >
                          <i className="fas fa-check"></i>
                        </button>

                        {/* ❌ REJETER */}
                        <button
                          className="btn btn-outline-danger btn-sm"
                          data-bs-toggle="modal"
                          data-bs-target="#rejectModal"
                          title="Rejeter le compte"
                          onClick={() => setSelectedUser(user)}
                        >
                          <i className="fas fa-times"></i>
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

      {/* MODAL DETAILS */}
      {showDetailModal && detailUser && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Détails utilisateur</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                />
              </div>

              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p><strong>Nom :</strong> {detailUser.nom}</p>
                    <p><strong>Prénom :</strong> {detailUser.prenom}</p>
                    <p><strong>Email :</strong> {detailUser.email}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Rôle :</strong> {detailUser.role}</p>
                    <p><strong>Statut :</strong> {detailUser.status}</p>
                  </div>
                </div>

                <hr />

                {/* ÉTUDIANT */}
                {detailUser.role === "etudiant" && (
                  <>
                    <h6 className="fw-bold mb-3">Informations Étudiant</h6>
                    <p><strong>Département :</strong> {detailUser.departement || "N/A"}</p>
                    <p><strong>Classe :</strong> {detailUser.classe || "N/A"}</p>

                    {detailUser.attestation && (
                      <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <span><i className="fas fa-file-pdf me-2"></i> Attestation étudiant</span>
                        <a
                          href={`http://localhost:5000/uploads/${detailUser.attestation}`}
                          className="btn btn-sm btn-primary"
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <i className="fas fa-download me-1"></i> Télécharger
                        </a>
                      </div>
                    )}
                  </>
                )}

                {/* ENSEIGNANT */}
                {detailUser.role === "enseignant" && (
                  <>
                    <h6 className="fw-bold mb-3">Informations Enseignant</h6>
                    <p><strong>Département :</strong> {detailUser.departement || "N/A"}</p>
                    <p><strong>Classes enseignées :</strong> {detailUser.classes_enseignees || "N/A"}</p>

                    {detailUser.verification_document && (
                      <div className="alert alert-warning d-flex justify-content-between align-items-center">
                        <span><i className="fas fa-file-alt me-2"></i> Document de vérification</span>
                        <a
                          href={`http://localhost:5000/uploads/${detailUser.verification_document}`}
                          className="btn btn-sm btn-warning"
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <i className="fas fa-download me-1"></i> Télécharger
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REJET */}
      <div className="modal fade" id="rejectModal">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Raison du rejet</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
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
              <button className="btn btn-light" data-bs-dismiss="modal">
                Annuler
              </button>
              <button
                className="btn btn-danger"
                data-bs-dismiss="modal"
                onClick={() => rejectUser(selectedUser?.id)}
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
