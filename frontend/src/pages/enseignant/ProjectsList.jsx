import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../auth";
import "./ProjectsList.css";

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setProjects(data.projects || []);
      } else {
        setError(data.message || "Erreur lors du chargement des projets");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors du chargement des projets");
    } finally {
      setLoading(false);
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

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleBack = () => {
    navigate("/enseignant/home");
  };

  const handleCreateProject = () => {
    navigate("/enseignant/projects/create");
  };

  const handleViewDetails = (projectId) => {
    navigate(`/enseignant/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="projects-list-container">
        <div className="projects-loading">Chargement des projets...</div>
      </div>
    );
  }

  return (
    <div className="projects-list-container">
      <div className="projects-content">
        <div className="projects-header">
          <button onClick={handleBack} className="back-btn">
            ← Retour
          </button>
          <div className="header-title-section">
            <h1>Mes Projets</h1>
            <p className="projects-subtitle">
              {projects.length} projet{projects.length > 1 ? "s" : ""} au total
            </p>
          </div>
          <button onClick={handleCreateProject} className="create-btn">
            + Créer un projet
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {projects.length === 0 ? (
          <div className="no-projects">
            <p>Vous n'avez pas encore de projets.</p>
            <button onClick={handleCreateProject} className="create-btn-large">
              Créer votre premier projet
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => {
              const daysUntil = getDaysUntilDeadline(project.deadline);
              const isPassed = isDeadlinePassed(project.deadline);

              return (
                <div key={project.id} className="project-card">
                  <div className="project-card-header">
                    <h2>{project.libelle}</h2>
                    <span className="project-matiere">{project.matiere}</span>
                  </div>

                  {project.description && (
                    <p className="project-description">{project.description}</p>
                  )}

                  <div className="project-info">
                    <div className="info-row">
                      <span className="info-label">Classe:</span>
                      <span className="info-value">{project.classe_nom}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Département:</span>
                      <span className="info-value">{project.classe_departement}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Étudiants assignés:</span>
                      <span className="info-value">{project.students_count || 0}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Date limite:</span>
                      <span
                        className={`info-value deadline ${
                          isPassed ? "deadline-passed" : daysUntil <= 7 ? "deadline-soon" : ""
                        }`}
                      >
                        {formatDate(project.deadline)}
                        {!isPassed && daysUntil !== null && (
                          <span className="days-badge">
                            {daysUntil === 0
                              ? "Aujourd'hui"
                              : daysUntil === 1
                              ? "Demain"
                              : `${daysUntil} jours`}
                          </span>
                        )}
                        {isPassed && <span className="days-badge passed">Dépassé</span>}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Créé le:</span>
                      <span className="info-value">{formatDateTime(project.created_at)}</span>
                    </div>
                  </div>


                  <div className="project-actions">
                    <button
                      onClick={() => handleViewDetails(project.id)}
                      className="view-btn"
                    >
                      Voir les détails
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

