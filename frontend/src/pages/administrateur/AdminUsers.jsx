import React, { useEffect, useState } from "react";
import { getToken } from "../auth";
import "./AdminUsers.css";

export default function AdminUsers() {
  const token = getToken();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔹 Charger les utilisateurs approved
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔹 Activer / Désactiver avec confirmation
  const toggleStatus = async (id, currentVerified, nom) => {
  const willActivate = !currentVerified;

  const confirmMsg = willActivate
    ? `Voulez-vous vraiment activer le compte de ${nom} ?`
    : `Voulez-vous vraiment désactiver le compte de ${nom} ?`;

  if (!window.confirm(confirmMsg)) return;

  try {
    await fetch(`http://localhost:5000/api/admin/users/${id}/status`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ active: willActivate }),
    });

    // 🔹 Mise à jour immédiate du front
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, verified: willActivate ? 1 : 0 } : u
      )
    );
  } catch (err) {
    console.error(err);
  }
};

  // 🔹 Supprimer avec confirmation
  const deleteUser = async (id, nom) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le compte de ${nom} ?`)) return;

    try {
      await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // 🔍 Filtrage
  const filteredUsers = users.filter((u) => {
  const matchSearch =
    u.nom.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase());

  const matchRole = roleFilter === "all" ? true : u.role === roleFilter;

  const matchStatus =
    statusFilter === "all"
      ? true
      : statusFilter === "active"
      ? u.verified === 1
      : u.verified === 0;

  return matchSearch && matchRole && matchStatus;
});

  return (
    <div className="container-fluid px-4 py-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold">Gestion des utilisateurs</h3>
        <span className="badge bg-primary">{filteredUsers.length} utilisateurs</span>
      </div>

      {/* FILTRES */}
      <div className="row mb-3">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Rechercher par nom ou email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tous les rôles</option>
            <option value="enseignant">Enseignant</option>
            <option value="etudiant">Étudiant</option>
            <option value="administrateur">Admin</option>
          </select>
        </div>
      </div>
      <div className="col-md-3">
  <select
    className="form-select"
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
  >
    <option value="all">Tous les statuts</option>
    <option value="active">Actif</option>
    <option value="disabled">Désactivé</option>
  </select>
</div>

      {/* TABLE */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.nom} {u.prenom}</td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    <span className="badge bg-secondary text-capitalize">{u.role}</span>
                  </td>
                  <td>
                    {u.verified ? (
                      <span className="badge bg-success">Actif</span>
                    ) : (
                      <span className="badge bg-danger">Désactivé</span>
                    )}
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-outline-info btn-sm me-2"
                      onClick={() => setSelectedUser(u)}
                    >
                      👁
                    </button>

                    <button
                      className="btn btn-outline-warning btn-sm me-2"
                      onClick={() => toggleStatus(u.id, u.verified, u.nom)}
                    >
                      🔒
                    </button>

                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => deleteUser(u.id, u.nom)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PROFIL */}
      {selectedUser && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Profil utilisateur</h5>
                <button className="btn-close" onClick={() => setSelectedUser(null)} />
              </div>
              <div className="modal-body">
                <p><strong>Nom :</strong> {selectedUser.nom}</p>
                <p><strong>Email :</strong> {selectedUser.email}</p>
                <p><strong>Rôle :</strong> {selectedUser.role}</p>
                <p><strong>Département :</strong> {selectedUser.departement || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
