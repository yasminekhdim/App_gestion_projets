import { useEffect, useState } from "react";
import { getUser, clearAuth, getToken } from "../auth";
import { useNavigate } from "react-router-dom";
import "./Homensg.css";

export default function Homensg() {
  const [user, setUser] = useState(null);
  const [studentsCount, setStudentsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
    fetchStudentsCount();
    fetchProjectsCount();
  }, [navigate]);

  const fetchStudentsCount = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch("http://localhost:5000/api/teachers/students/count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudentsCount(data.count || 0);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du nombre d'étudiants :", err);
    }
  };

  const fetchProjectsCount = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch("http://localhost:5000/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjectsCount(data.projects?.length || 0);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du nombre de projets :", err);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  const handleStudents = () => {
    navigate("/enseignant/students");
  };

  const handleCreateProject = () => {
    navigate("/enseignant/projects/create");
  };

  const handleMyProjects = () => {
    navigate("/enseignant/projects");
  };

  if (!user) return null;

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="welcome-title">Tableau de bord Enseignant</h1>
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
              <h3 className="stat-value">{projectsCount}</h3>
              <p className="stat-label">Mes Projets</p>
            </div>
          </div>

          <div className="stat-card stat-card-success">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3 className="stat-value">{studentsCount}</h3>
              <p className="stat-label">Étudiants</p>
            </div>
          </div>

          <div className="stat-card stat-card-warning">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3 className="stat-value">0</h3>
              <p className="stat-label">Tâches en cours</p>
            </div>
          </div>

          <div className="stat-card stat-card-info">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3 className="stat-value">0</h3>
              <p className="stat-label">Tâches terminées</p>
            </div>
          </div>
        </div>

        <div className="actions-grid">
          <div className="action-card">
            <div className="action-icon">➕</div>
            <h3 className="action-title">Créer un projet</h3>
            <p className="action-description">Créer un nouveau projet et inviter des étudiants</p>
            <button className="action-btn" onClick={handleCreateProject}>Créer</button>
          </div>

          <div className="action-card">
            <div className="action-icon">📋</div>
            <h3 className="action-title">Mes projets</h3>
            <p className="action-description">Gérer et suivre vos projets existants</p>
            <button className="action-btn" onClick={handleMyProjects}>Voir</button>
          </div>

          <div className="action-card">
            <div className="action-icon">👨‍🎓</div>
            <h3 className="action-title">Mes étudiants</h3>
            <p className="action-description">Voir tous vos étudiants par classe</p>
            <button className="action-btn" onClick={handleStudents}>Voir</button>
          </div>

          <div className="action-card">
            <div className="action-icon">📊</div>
            <h3 className="action-title">Statistiques</h3>
            <p className="action-description">Consulter les statistiques de vos projets</p>
            <button className="action-btn">Voir</button>
          </div>
        </div>

        <div className="recent-projects">
          <h2 className="section-title">Projets récents</h2>
          <div className="projects-list">
            <div className="project-item">
              <div className="project-icon">📁</div>
              <div className="project-content">
                <p className="project-name">Aucun projet récent</p>
                <span className="project-status">--</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
