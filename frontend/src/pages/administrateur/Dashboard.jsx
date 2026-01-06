import React, { useEffect, useState } from "react";
import { getToken } from "../auth";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import "./Dashboard.css";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError("Utilisateur non authentifié");
        return;
      }

      const res = await fetch("http://localhost:5000/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setStats(data);
    } catch {
      setError("Impossible de charger le dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Chargement...</div>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;

  // Pie Chart
  const pieData = [
    { name: "Actifs", value: stats.activeUsers },
    { name: "Désactivés", value: stats.disabledUsers },
  ];
  const COLORS = ["#4CAF50", "#F44336"];

  // Bar Chart
  const recentUsersData = stats.recentUsers || [];

  return (
    <div className="dashboard">
      {/* HEADER */}
      <div className="mb-4 text-center">
        <h3 className="fw-bold">Dashboard Administrateur</h3>
        <p className="text-muted">
          Vue d’ensemble de l’activité et des utilisateurs
        </p>
      </div>

      {/* STATS */}
      <div className="row g-4">
        <StatCard title="Utilisateurs" value={stats.totalUsers} icon="👥" />
        <StatCard title="En attente" value={stats.pendingUsers} icon="⏳" accent="warning" />
        <StatCard title="Actifs" value={stats.activeUsers} icon="✅" accent="success" />
        <StatCard title="Désactivés" value={stats.disabledUsers} icon="🚫" accent="danger" />
      </div>

      {/* ROLES */}
      <div className="row mt-5">
        {Object.entries(stats.roles).map(([role, count]) => (
          <div key={role} className="col-md-4 mb-3">
            <div className="card role-card shadow-sm border-0 text-center p-3">
              <h5 className="fw-bold text-capitalize">{role}</h5>
              <p className="display-6 fw-bold">{count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* GRAPHIQUES */}
      <div className="row mt-5">
        {/* Pie */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm border-0 p-3">
            <h5 className="fw-bold text-center mb-3">Actifs vs Désactivés</h5>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart Derniers inscrits */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm border-0 p-3">
            <h5 className="fw-bold text-center mb-3">
              Derniers utilisateurs inscrits
            </h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recentUsersData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4CAF50" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */
function StatCard({ title, value, icon, accent }) {
  return (
    <div className="col-md-3">
      <div className={`card stat-card shadow-sm border-0 ${accent || ""}`}>
        <div className="card-body text-center">
          <div className="d-flex justify-content-center align-items-center mb-2">
            <span className="stat-icon me-2">{icon}</span>
            <h2 className="fw-bold mb-0">{value}</h2>
          </div>
          <p className="text-muted mt-2 mb-0">{title}</p>
        </div>
      </div>
    </div>
  );
}
