import { useEffect, useState } from "react";
import { getUser, clearAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import "./Hometud.css";

export default function Hometud() {
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
            <h1 className="welcome-title">Tableau de bord Étudiant</h1>
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
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3 className="stat-value">0</h3>
              <p className="stat-label">Mes Projets</p>
            </div>
          </div>

          <div className="stat-card stat-card-success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3 className="stat-value">0</h3>
              <p className="stat-label">Tâches terminées</p>
            </div>
          </div>

          <div className="stat-card stat-card-warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3 className="stat-value">0</h3>
              <p className="stat-label">En cours</p>
            </div>
          </div>

          <div className="stat-card stat-card-info">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3 className="stat-value">0%</h3>
              <p className="stat-label">Progression</p>
            </div>
          </div>
        </div>

        <div className="actions-grid">
          <div className="action-card">
            <div className="action-icon">🔍</div>
            <h3 className="action-title">Voir mes projets</h3>
            <p className="action-description">Consulter tous vos projets et leur progression</p>
            <button className="action-btn">Voir</button>
          </div>

          <div className="action-card">
            <div className="action-icon">📝</div>
            <h3 className="action-title">Mes tâches</h3>
            <p className="action-description">Gérer vos tâches et suivre votre avancement</p>
            <button className="action-btn">Voir</button>
          </div>

          <div className="action-card">
            <div className="action-icon">📅</div>
            <h3 className="action-title">Calendrier</h3>
            <p className="action-description">Consulter les échéances et dates importantes</p>
            <button className="action-btn">Voir</button>
          </div>

          <div className="action-card">
            <div className="action-icon">💬</div>
            <h3 className="action-title">Messages</h3>
            <p className="action-description">Communiquer avec vos enseignants et équipe</p>
            <button className="action-btn">Voir</button>
          </div>
        </div>

        <div className="my-projects">
          <h2 className="section-title">Mes projets</h2>
          <div className="projects-list">
            <div className="project-item">
              <div className="project-icon">📁</div>
              <div className="project-content">
                <div className="project-info">
                  <p className="project-name">Aucun projet pour le moment</p>
                  <span className="project-progress">--</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
