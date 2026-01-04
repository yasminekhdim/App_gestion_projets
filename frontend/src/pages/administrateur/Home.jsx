import { useEffect, useState } from "react";
import { getUser, clearAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
  }, [navigate]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  if (!user) return null;

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="welcome-title">Tableau de bord Admin</h1>
            <p className="welcome-subtitle">Bienvenue, {user.nom || user.email}</p>
          </div>
          <div className="header-actions">
            <button className="profile-btn" onClick={handleProfile}>
              Profil
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="stats-grid">
          <div className="stat-card stat-card-primary">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3 className="stat-value">7</h3>
              <p className="stat-label">Utilisateurs</p>
            </div>
          </div>

          <div className="stat-card stat-card-success">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3 className="stat-value">0</h3>
              <p className="stat-label">Projets</p>
            </div>
          </div>

          <div className="stat-card stat-card-warning">
            <div className="stat-icon">👨‍🏫</div>
            <div className="stat-content">
              <h3 className="stat-value">1</h3>
              <p className="stat-label">Enseignants</p>
            </div>
          </div>

          <div className="stat-card stat-card-info">
            <div className="stat-icon">🎓</div>
            <div className="stat-content">
              <h3 className="stat-value">0</h3>
              <p className="stat-label">Étudiants</p>
            </div>
          </div>
        </div>

        <div className="actions-grid">
          <div className="action-card">
            <div className="action-icon">⚙️</div>
            <h3 className="action-title">Gestion des utilisateurs</h3>
            <p className="action-description">Gérer les comptes utilisateurs, enseignants et étudiants</p>
            <button className="action-btn">Accéder</button>
          </div>

          <div className="action-card">
            <div className="action-icon">📊</div>
            <h3 className="action-title">Statistiques</h3>
            <p className="action-description">Consulter les statistiques et rapports du système</p>
            <button className="action-btn">Accéder</button>
          </div>

          <div className="action-card">
            <div className="action-icon">🔒</div>
            <h3 className="action-title">Paramètres système</h3>
            <p className="action-description">Configurer les paramètres de l'application</p>
            <button className="action-btn">Accéder</button>
          </div>

          <div className="action-card">
            <div className="action-icon">📝</div>
            <h3 className="action-title">Gestion des projets</h3>
            <p className="action-description">Superviser et gérer tous les projets</p>
            <button className="action-btn">Accéder</button>
          </div>
        </div>

        <div className="recent-activity">
          <h2 className="section-title">Activité récente</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">📌</div>
              <div className="activity-content">
                <p className="activity-text">Aucune activité récente</p>
                <span className="activity-time">--</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
