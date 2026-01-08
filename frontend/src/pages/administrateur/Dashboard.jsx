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

  if (loading) return (
    <div className="dashboard">
      <div style={{ textAlign: 'center', padding: '4rem', color: '#6D5DF6', fontSize: '1.25rem', fontWeight: 600 }}>
        <div style={{ marginBottom: '1rem', fontSize: '3rem' }}>⏳</div>
        Chargement...
      </div>
    </div>
  );
  if (error) return (
    <div className="dashboard">
      <div style={{ 
        background: '#FEE2E2', 
        color: '#991B1B', 
        padding: '1.5rem', 
        borderRadius: '16px', 
        margin: '2rem',
        border: '2px solid #EF4444',
        textAlign: 'center',
        fontWeight: 600
      }}>
        {error}
      </div>
    </div>
  );

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
        <h3 className="fw-bold">📊 Dashboard Administrateur</h3>
        <p className="text-muted">
          Vue d'ensemble de l'activité et des utilisateurs
        </p>
      </div>

      {/* STATS */}
      <div className="row g-4">
        <StatCard title="Utilisateurs" value={stats.totalUsers} icon="👥" accent="info" />
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
          <div className="chart-container">
            <h5 className="fw-bold text-center mb-3 chart-title">Actifs vs Désactivés</h5>
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
          <div className="chart-container">
            <h5 className="fw-bold text-center mb-3 chart-title">
              Derniers utilisateurs inscrits
            </h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recentUsersData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D5DF6" />
                    <stop offset="100%" stopColor="#4CB8C4" />
                  </linearGradient>
                </defs>
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
