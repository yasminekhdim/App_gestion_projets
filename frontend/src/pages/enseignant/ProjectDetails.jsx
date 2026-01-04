import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../auth";
import "./ProjectDetails.css";

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    libelle: "",
    description: "",
    deadline: "",
    etudiant_id: "",
  });
  const [taskAttachmentFiles, setTaskAttachmentFiles] = useState([]);
  const [projectAttachments, setProjectAttachments] = useState([]);

  // Attachment viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerBlobUrl, setViewerBlobUrl] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState("");

  const openAttachmentViewer = async (att) => {
    setViewerError("");
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerFile(att);

    try {
      // Fetch via server proxy to avoid CORS / 401 issues
      const token = getToken();
      const res = await fetch(`http://localhost:5000/api/attachments/id/${att.id}/stream`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Impossible de récupérer le fichier");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setViewerBlobUrl(url);
    } catch (err) {
      console.error("Erreur lors du fetch du fichier:", err);
      setViewerError("Impossible de charger le fichier. Vous pouvez le télécharger.");
    } finally {
      setViewerLoading(false);
    }
  };

  const closeAttachmentViewer = () => {
    setViewerOpen(false);
    setViewerFile(null);
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
      setViewerBlobUrl(null);
    }
    setViewerLoading(false);
    setViewerError("");
  };

  // Helper: get signed URL from backend (authenticated)
  const getSignedUrl = async (attId) => {
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/attachments/id/${attId}/signed`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Impossible de récupérer l URL signée');
    }
    const data = await res.json();
    return data.url;
  };

  const handleOpenInNewTab = async (att) => {
    try {
      const url = await getSignedUrl(att.id);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      console.error('Erreur ouverture nouvel onglet:', err);
      setViewerError("Impossible d'ouvrir dans un nouvel onglet.");
    }
  };

  const handleDownload = async (att) => {
    try {
      const url = await getSignedUrl(att.id);
      // Open in new tab so user can download (Cloudinary URL should allow download)
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      setViewerError('Impossible de télécharger le fichier pour le moment.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewerBlobUrl) {
        URL.revokeObjectURL(viewerBlobUrl);
      }
    };
  }, [viewerBlobUrl]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [taskMessage, setTaskMessage] = useState("");

  // État pour modification du projet
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    libelle: "",
    matiere: "",
    description: "",
    deadline: "",
  });
  const [projectAttachmentFiles, setProjectAttachmentFiles] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editMessage, setEditMessage] = useState("");

  // État pour gestion des étudiants
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState("");
  const [manageMessage, setManageMessage] = useState("");

  const navigate = useNavigate();

  const fetchProjectDetails = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
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
        setProject(data.project);
        setTasks(data.tasks || []);
        setStudents(data.students || []);
        setProjectAttachments(data.project?.attachments || []);
      } else {
        setError(data.message || "Erreur lors du chargement des détails");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors du chargement des détails");
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId, fetchProjectDetails]);

  const handleOpenTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskFormData({
        libelle: task.libelle,
        description: task.description || "",
        deadline: task.deadline ? task.deadline.split("T")[0] : "",
        etudiant_id: task.etudiant_id || "",
      });
    } else {
      setEditingTask(null);
      setTaskFormData({
        libelle: "",
        description: "",
        deadline: "",
        etudiant_id: "",
      });
    }
    setTaskAttachmentFiles([]);
    setTaskError("");
    setTaskMessage("");
    setShowTaskModal(true);
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setTaskFormData({
      libelle: "",
      description: "",
      deadline: "",
      etudiant_id: "",
    });
    setTaskAttachmentFiles([]);
    setTaskError("");
    setTaskMessage("");
  };

  const handleTaskFormChange = (e) => {
    setTaskFormData({ ...taskFormData, [e.target.name]: e.target.value });
    setTaskError("");
  };

  const handleTaskFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name} est trop volumineux (max 10MB)`);
      } else if (taskAttachmentFiles.length + validFiles.length >= 10) {
        errors.push(`Maximum 10 fichiers autorisés`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setTaskError(errors.join(", "));
    }

    if (validFiles.length > 0) {
      setTaskAttachmentFiles((prev) => [...prev, ...validFiles]);
      setTaskError("");
    }

    e.target.value = "";
  };

  const handleRemoveTaskFile = (index) => {
    setTaskAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskError("");
    setTaskMessage("");

    if (!taskFormData.libelle || !taskFormData.deadline) {
      setTaskError("Le libellé et la date limite sont obligatoires.");
      return;
    }

    setTaskLoading(true);

    try {
      const token = getToken();

      const url = editingTask
        ? `http://localhost:5000/api/tasks/${editingTask.id}`
        : `http://localhost:5000/api/projects/${projectId}/tasks`;

      const response = await fetch(url, {
        method: editingTask ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          libelle: taskFormData.libelle,
          description: taskFormData.description,
          deadline: taskFormData.deadline,
          etudiant_id: taskFormData.etudiant_id || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const taskId = editingTask ? editingTask.id : data.task?.id;
        
        // Upload des pièces jointes si présentes
        if (taskAttachmentFiles.length > 0 && taskId) {
          try {
            const attachmentFormData = new FormData();
            taskAttachmentFiles.forEach((file) => {
              attachmentFormData.append("files", file);
            });
            attachmentFormData.append("entity_type", "tache");
            attachmentFormData.append("entity_id", taskId);

            const attachResponse = await fetch("http://localhost:5000/api/attachments", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: attachmentFormData,
            });

            if (!attachResponse.ok) {
              console.warn("Certaines pièces jointes n'ont pas pu être uploadées");
            }
          } catch (attachErr) {
            console.error("Erreur lors de l'upload des pièces jointes:", attachErr);
          }
        }

        setTaskMessage(editingTask ? "✅ Tâche modifiée avec succès !" : "✅ Tâche créée avec succès !");
        setTimeout(() => {
          handleCloseTaskModal();
          fetchProjectDetails();
        }, 1500);
      } else {
        setTaskError(data.message || "Erreur lors de la création/modification de la tâche");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setTaskError("Erreur réseau lors de la création/modification de la tâche");
    } finally {
      setTaskLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTaskMessage("✅ Tâche supprimée avec succès !");
        fetchProjectDetails();
      } else {
        setError(data.message || "Erreur lors de la suppression de la tâche");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors de la suppression de la tâche");
    }
  };

  // --- Gestion modification du projet ---
  const handleOpenEditProject = () => {
    setEditFormData({
      libelle: project.libelle || "",
      matiere: project.matiere || "",
      description: project.description || "",
      deadline: project.deadline ? project.deadline.split("T")[0] : "",
    });
    setProjectAttachmentFiles([]);
    setEditError("");
    setEditMessage("");
    setShowEditProjectModal(true);
  };

  const handleCloseEditProject = () => {
    setShowEditProjectModal(false);
    setEditFormData({ libelle: "", matiere: "", description: "", deadline: "" });
    setProjectAttachmentFiles([]);
    setEditError("");
    setEditMessage("");
  };

  const handleEditFormChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    setEditError("");
  };

  const handleEditFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name} est trop volumineux (max 10MB)`);
      } else if (projectAttachmentFiles.length + validFiles.length >= 10) {
        errors.push(`Maximum 10 fichiers autorisés`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setEditError(errors.join(", "));
    }

    if (validFiles.length > 0) {
      setProjectAttachmentFiles((prev) => [...prev, ...validFiles]);
      setEditError("");
    }

    e.target.value = "";
  };

  const handleRemoveProjectFile = (index) => {
    setProjectAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Supprimer cette pièce jointe ?")) return;
    
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5000/api/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchProjectDetails();
      } else {
        setError("Erreur lors de la suppression de la pièce jointe");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau lors de la suppression");
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditMessage("");

    if (!editFormData.libelle || !editFormData.matiere || !editFormData.deadline) {
      setEditError("Libellé, matière et date limite sont obligatoires.");
      return;
    }

    setEditLoading(true);
    try {
      const token = getToken();

      // Send project update as JSON; attachments are uploaded separately below
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          libelle: editFormData.libelle,
          matiere: editFormData.matiere,
          description: editFormData.description,
          deadline: editFormData.deadline,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Upload des pièces jointes si présentes
        if (projectAttachmentFiles.length > 0) {
          try {
            const attachmentFormData = new FormData();
            projectAttachmentFiles.forEach((file) => {
              attachmentFormData.append("files", file);
            });
            attachmentFormData.append("entity_type", "projet");
            attachmentFormData.append("entity_id", projectId);

            const attachResponse = await fetch("http://localhost:5000/api/attachments", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: attachmentFormData,
            });

            if (!attachResponse.ok) {
              console.warn("Certaines pièces jointes n'ont pas pu être uploadées");
            }
          } catch (attachErr) {
            console.error("Erreur lors de l'upload des pièces jointes:", attachErr);
          }
        }

        setEditMessage("✅ Projet modifié avec succès !");
        setTimeout(() => {
          handleCloseEditProject();
          fetchProjectDetails();
        }, 1200);
      } else {
        setEditError(data.message || "Erreur lors de la modification du projet");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setEditError("Erreur réseau lors de la modification du projet");
    } finally {
      setEditLoading(false);
    }
  };

  // --- Gestion des étudiants du projet ---
  const handleOpenManageStudents = async () => {
    setManageError("");
    setManageMessage("");
    setSelectedStudents([]);
    setClassStudents([]);
    setShowManageStudentsModal(true);

    try {
      const token = getToken();
      const classeId = project.classe_id;
      const response = await fetch(`http://localhost:5000/api/projects/classes/${classeId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        // Filter out already assigned students
        const available = data.students.filter((s) => !students.some((st) => st.id === s.id));
        setClassStudents(available);
      } else {
        setManageError(data.message || "Erreur lors du chargement des étudiants de la classe");
      }
    } catch (err) {
      console.error(err);
      setManageError("Erreur réseau lors du chargement des étudiants");
    }
  };

  const handleCloseManageStudents = () => {
    setShowManageStudentsModal(false);
    setClassStudents([]);
    setSelectedStudents([]);
    setManageError("");
    setManageMessage("");
  };

  const toggleSelectStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0) {
      setManageError("Sélectionnez au moins un étudiant à ajouter.");
      return;
    }
    setManageLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/students`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project_id: projectId, student_ids: selectedStudents }),
      });
      const data = await response.json();
      if (response.ok) {
        setManageMessage(data.message || "Étudiants ajoutés avec succès");
        setTimeout(() => {
          handleCloseManageStudents();
          fetchProjectDetails();
        }, 900);
      } else {
        setManageError(data.message || "Erreur lors de l'ajout des étudiants");
      }
    } catch (err) {
      console.error(err);
      setManageError("Erreur réseau lors de l'ajout des étudiants");
    } finally {
      setManageLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm("Retirer cet étudiant du projet ?")) return;
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/students/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setManageMessage("✅ Étudiant retiré avec succès");
        fetchProjectDetails();
      } else {
        setError(data.message || "Erreur lors du retrait de l'étudiant");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau lors du retrait de l'étudiant");
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(
      "⚠️ ATTENTION : Cette action est irréversible !\n\n" +
      "La suppression du projet entraînera également la suppression de :\n" +
      "• Toutes les tâches associées\n" +
      "• Toutes les assignations d'étudiants\n" +
      "• Toutes les pièces jointes\n\n" +
      "Êtes-vous sûr de vouloir supprimer ce projet ?"
    )) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Projet supprimé avec succès !");
        navigate("/enseignant/projects");
      } else {
        setError(data.message || "Erreur lors de la suppression du projet");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors de la suppression du projet");
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

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    if (!project?.deadline) return null;
    return project.deadline.split("T")[0];
  };

  const handleBack = () => {
    navigate("/enseignant/projects");
  };

  if (loading) {
    return (
      <div className="project-details-container">
        <div className="project-details-loading">Chargement des détails du projet...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-details-container">
        <div className="project-details-error">
          <p>{error || "Projet introuvable"}</p>
          <button onClick={handleBack} className="back-btn">
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-details-container">
      <div className="project-details-content">
        <div className="project-details-header">
          <button onClick={handleBack} className="back-btn">
            ← Retour
          </button>
          <div className="header-title-section">
            <h1>{project.libelle}</h1>
            <p className="project-matiere-header">{project.matiere}</p>
          </div>

          <div className="project-header-actions">
            <button onClick={handleOpenEditProject} className="edit-project-btn">
              ✏️ Modifier le projet
            </button>

            <button onClick={handleOpenManageStudents} className="manage-students-btn">
              👥 Gérer les étudiants
            </button>

            <button onClick={() => handleOpenTaskModal()} className="add-task-btn">
              + Ajouter une tâche
            </button>

            <button onClick={handleDeleteProject} className="delete-project-btn">
              🗑️ Supprimer le projet
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {taskMessage && <div className="success-message">{taskMessage}</div>}

        {/* Détails du projet */}
        <div className="project-info-section">
          <div className="info-card">
            <h2>Informations du projet</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Classe</label>
                <p>{project.classe_nom}</p>
              </div>
              <div className="info-item">
                <label>Département</label>
                <p>{project.classe_departement}</p>
              </div>
              <div className="info-item">
                <label>Date limite du projet</label>
                <p className={isDeadlinePassed(project.deadline) ? "deadline-passed" : ""}>
                  {formatDate(project.deadline)}
                </p>
              </div>
              <div className="info-item">
                <label>Étudiants assignés</label>
                <p>{students.length} étudiant{students.length > 1 ? "s" : ""}</p>
              </div>
              {project.description && (
                <div className="info-item full-width">
                  <label>Description</label>
                  <p>{project.description}</p>
                </div>
              )}
              {projectAttachments.length > 0 && (
                <div className="info-item full-width">
                  <label>Pièces jointes ({projectAttachments.length})</label>
                  <div className="attachments-display">
                    {projectAttachments.map((att) => (
                      <div key={att.id} className="attachment-display-item">
                        <button
                          onClick={(e) => { e.preventDefault(); openAttachmentViewer(att); }}
                          className="document-link attachment-open-btn"
                        >
                          {att.file_type?.startsWith("image/") ? "🖼️" : 
                           att.file_type?.includes("pdf") ? "📄" :
                           att.file_type?.includes("word") ? "📝" :
                           att.file_type?.includes("excel") || att.file_type?.includes("spreadsheet") ? "📊" :
                           att.file_type?.includes("zip") ? "📦" : "📎"} {att.fichier_name}
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="delete-attachment-btn"
                          title="Supprimer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Liste des tâches */}
        <div className="tasks-section">
          <h2>Tâches ({tasks.length})</h2>
          {tasks.length === 0 ? (
            <div className="no-tasks">
              <p>Aucune tâche pour ce projet.</p>
              <button onClick={() => handleOpenTaskModal()} className="add-task-btn-small">
                Créer la première tâche
              </button>
            </div>
          ) : (
            <div className="tasks-list">
              {tasks.map((task) => {
                const daysUntil = getDaysUntilDeadline(task.deadline);
                const isPassed = isDeadlinePassed(task.deadline);

                return (
                  <div key={task.id} className="task-card">
                    <div className="task-header">
                      <h3>{task.libelle}</h3>
                      <div className="task-actions">
                        <button
                          onClick={() => handleOpenTaskModal(task)}
                          className="edit-btn"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="delete-btn"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}

                    <div className="task-info">
                      <div className="task-info-row">
                        <span className="task-label">Date limite:</span>
                        <span
                          className={`task-value deadline ${
                            isPassed ? "deadline-passed" : daysUntil <= 7 ? "deadline-soon" : ""
                          }`}
                        >
                          {formatDate(task.deadline)}
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

                      <div className="task-info-row">
                        <span className="task-label">Assignée à:</span>
                        <span className="task-value">
                          {task.etudiant_id
                            ? `${task.etudiant_prenom} ${task.etudiant_nom}`
                            : "Tous les membres du projet"}
                        </span>
                      </div>

                      {task.attachments && task.attachments.length > 0 && (
                        <div className="task-info-row">
                          <span className="task-label">Pièces jointes:</span>
                          <div className="task-attachments">
                            {task.attachments.map((att) => (
                              <button
                                key={att.id}
                                onClick={(e) => { e.preventDefault(); openAttachmentViewer(att); }}
                                className="document-link attachment-open-btn"
                              >
                                {att.file_type?.startsWith("image/") ? "🖼️" : 
                                 att.file_type?.includes("pdf") ? "📄" :
                                 att.file_type?.includes("word") ? "📝" :
                                 att.file_type?.includes("excel") || att.file_type?.includes("spreadsheet") ? "📊" :
                                 att.file_type?.includes("zip") ? "📦" : "📎"} {att.fichier_name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="task-info-row">
                        <span className="task-label">Créée le:</span>
                        <span className="task-value">{formatDateTime(task.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal pour créer/modifier une tâche */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={handleCloseTaskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? "Modifier la tâche" : "Créer une nouvelle tâche"}</h2>
              <button onClick={handleCloseTaskModal} className="modal-close-btn">
                ×
              </button>
            </div>

            {taskMessage && <div className="success-message">{taskMessage}</div>}
            {taskError && <div className="error-message">{taskError}</div>}

            <form onSubmit={handleCreateTask} className="task-form">
              <div className="form-group">
                <label htmlFor="libelle">Libellé *</label>
                <input
                  type="text"
                  id="libelle"
                  name="libelle"
                  value={taskFormData.libelle}
                  onChange={handleTaskFormChange}
                  placeholder="Ex: Développement de l'interface"
                  required
                  maxLength={150}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={taskFormData.description}
                  onChange={handleTaskFormChange}
                  placeholder="Description détaillée de la tâche..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Date limite *</label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  value={taskFormData.deadline}
                  onChange={handleTaskFormChange}
                  min={getMinDate()}
                  max={getMaxDate()}
                  required
                />
                <small>
                  Doit être avant le {formatDate(project.deadline)} (deadline du projet)
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="etudiant_id">Assigner à (optionnel)</label>
                <select
                  id="etudiant_id"
                  name="etudiant_id"
                  value={taskFormData.etudiant_id}
                  onChange={handleTaskFormChange}
                >
                  <option value="">Tous les membres du projet</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.prenom} {student.nom} - {student.email}
                    </option>
                  ))}
                </select>
                <small>
                  Si aucun étudiant n'est sélectionné, la tâche concerne tous les membres du projet
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="task-attachments" className="file-upload-label">
                  <span className="upload-icon">📎</span>
                  <span>Pièces jointes (optionnel)</span>
                  <span className="upload-hint">Cliquez pour ajouter des fichiers</span>
                </label>
                <input
                  type="file"
                  id="task-attachments"
                  name="attachments"
                  onChange={handleTaskFileChange}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.zip"
                  multiple
                  className="file-input-hidden"
                />
                <small className="file-hint">
                  Formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, XLS, XLSX, ZIP (max 10MB par fichier, jusqu'à 10 fichiers)
                </small>
                
                {taskAttachmentFiles.length > 0 && (
                  <div className="attachments-preview">
                    <div className="attachments-header">
                      <span className="attachments-count">{taskAttachmentFiles.length} nouveau(x) fichier(s)</span>
                    </div>
                    <div className="attachments-list">
                      {taskAttachmentFiles.map((file, index) => (
                        <div key={index} className="attachment-item">
                          <span className="attachment-icon">
                            {file.type.startsWith("image/") ? "🖼️" : 
                             file.type.includes("pdf") ? "📄" :
                             file.type.includes("word") ? "📝" :
                             file.type.includes("excel") || file.type.includes("spreadsheet") ? "📊" :
                             file.type.includes("zip") ? "📦" : "📎"}
                          </span>
                          <span className="attachment-name" title={file.name}>
                            {file.name.length > 30 ? `${file.name.substring(0, 30)}...` : file.name}
                          </span>
                          <span className="attachment-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTaskFile(index)}
                            className="remove-attachment-btn"
                            title="Retirer ce fichier"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editingTask?.attachments && editingTask.attachments.length > 0 && taskAttachmentFiles.length === 0 && (
                  <div className="existing-attachments">
                    <p className="existing-attachments-label">Pièces jointes existantes:</p>
                    <div className="attachments-list">
                      {editingTask.attachments.map((att) => (
                        <div key={att.id} className="attachment-item existing">
                          <span className="attachment-icon">
                            {att.file_type?.startsWith("image/") ? "🖼️" : 
                             att.file_type?.includes("pdf") ? "📄" :
                             att.file_type?.includes("word") ? "📝" :
                             att.file_type?.includes("excel") || att.file_type?.includes("spreadsheet") ? "📊" :
                             att.file_type?.includes("zip") ? "📦" : "📎"}
                          </span>
                          <button
                            onClick={(e) => { e.preventDefault(); openAttachmentViewer(att); }}
                            className="attachment-name attachment-open-btn"
                          >
                            {att.fichier_name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="remove-attachment-btn"
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseTaskModal} className="cancel-btn">
                  Annuler
                </button>
                <button type="submit" disabled={taskLoading} className="submit-btn">
                  {taskLoading
                    ? editingTask
                      ? "Modification..."
                      : "Création..."
                    : editingTask
                    ? "Modifier"
                    : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment viewer modal */}
      {viewerOpen && (
        <div className="attachment-viewer-overlay" onClick={closeAttachmentViewer}>
          <div className="attachment-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <h3>{viewerFile?.fichier_name}</h3>
              <div className="viewer-actions">
                {viewerBlobUrl && (
                  <button className="download-btn" onClick={() => handleDownload(viewerFile)}>⬇️ Télécharger</button>
                )}
                {viewerFile && (
                  <button className="open-new-btn" onClick={() => handleOpenInNewTab(viewerFile)}>Ouvrir dans un nouvel onglet</button>
                )}
                <button className="close-btn" onClick={closeAttachmentViewer}>✕</button>
              </div>
            </div>
            <div className="viewer-body">
              {viewerLoading && <div className="viewer-loading">Chargement...</div>}
              {viewerError && (
                <div className="viewer-error">
                  {viewerError}
                  {viewerFile && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button className="download-btn" onClick={() => handleDownload(viewerFile)}>⬇️ Télécharger</button>
                    </div>
                  )}
                </div>
              )}
              {!viewerLoading && !viewerError && viewerBlobUrl && (
                viewerFile.file_type?.startsWith("image/") ? (
                  <img src={viewerBlobUrl} alt={viewerFile?.fichier_name} className="viewer-image" />
                ) : viewerFile.file_type?.includes("pdf") ? (
                  <iframe src={viewerBlobUrl} title={viewerFile?.fichier_name} className="viewer-iframe" />
                ) : (
                  <div className="no-preview">
                    <p>Aperçu non disponible pour ce type de fichier.</p>
                    <a href={viewerBlobUrl} download={viewerFile?.fichier_name}>Télécharger le fichier</a>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal pour modifier le projet */}
      {showEditProjectModal && (
        <div className="modal-overlay" onClick={handleCloseEditProject}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modifier le projet</h2>
              <button onClick={handleCloseEditProject} className="modal-close-btn">×</button>
            </div>

            {editMessage && <div className="success-message">{editMessage}</div>}
            {editError && <div className="error-message">{editError}</div>}

            <form onSubmit={handleUpdateProject} className="project-form">
              <div className="form-group">
                <label htmlFor="libelle">Libellé *</label>
                <input
                  type="text"
                  id="libelle"
                  name="libelle"
                  value={editFormData.libelle}
                  onChange={handleEditFormChange}
                  required
                  maxLength={150}
                />
              </div>

              <div className="form-group">
                <label htmlFor="matiere">Matière *</label>
                <input
                  type="text"
                  id="matiere"
                  name="matiere"
                  value={editFormData.matiere}
                  onChange={handleEditFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Date limite *</label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  value={editFormData.deadline}
                  onChange={handleEditFormChange}
                  min={getMinDate()}
                  required
                />
                <small>Doit être dans le futur</small>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditFormChange}
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-attachments" className="file-upload-label">
                  <span className="upload-icon">📎</span>
                  <span>Pièces jointes (optionnel)</span>
                  <span className="upload-hint">Cliquez pour ajouter des fichiers</span>
                </label>
                <input
                  type="file"
                  id="project-attachments"
                  name="attachments"
                  onChange={handleEditFileChange}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.zip"
                  multiple
                  className="file-input-hidden"
                />
                <small className="file-hint">
                  Formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, XLS, XLSX, ZIP (max 10MB par fichier, jusqu'à 10 fichiers)
                </small>
                
                {projectAttachmentFiles.length > 0 && (
                  <div className="attachments-preview">
                    <div className="attachments-header">
                      <span className="attachments-count">{projectAttachmentFiles.length} nouveau(x) fichier(s)</span>
                    </div>
                    <div className="attachments-list">
                      {projectAttachmentFiles.map((file, index) => (
                        <div key={index} className="attachment-item">
                          <span className="attachment-icon">
                            {file.type.startsWith("image/") ? "🖼️" : 
                             file.type.includes("pdf") ? "📄" :
                             file.type.includes("word") ? "📝" :
                             file.type.includes("excel") || file.type.includes("spreadsheet") ? "📊" :
                             file.type.includes("zip") ? "📦" : "📎"}
                          </span>
                          <span className="attachment-name" title={file.name}>
                            {file.name.length > 30 ? `${file.name.substring(0, 30)}...` : file.name}
                          </span>
                          <span className="attachment-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProjectFile(index)}
                            className="remove-attachment-btn"
                            title="Retirer ce fichier"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projectAttachments.length > 0 && projectAttachmentFiles.length === 0 && (
                  <div className="existing-attachments">
                    <p className="existing-attachments-label">Pièces jointes existantes:</p>
                    <div className="attachments-list">
                      {projectAttachments.map((att) => (
                        <div key={att.id} className="attachment-item existing">
                          <span className="attachment-icon">
                            {att.file_type?.startsWith("image/") ? "🖼️" : 
                             att.file_type?.includes("pdf") ? "📄" :
                             att.file_type?.includes("word") ? "📝" :
                             att.file_type?.includes("excel") || att.file_type?.includes("spreadsheet") ? "📊" :
                             att.file_type?.includes("zip") ? "📦" : "📎"}
                          </span>
                          <button
                            onClick={(e) => { e.preventDefault(); openAttachmentViewer(att); }}
                            className="attachment-name attachment-open-btn"
                          >
                            {att.fichier_name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="remove-attachment-btn"
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseEditProject} className="cancel-btn">Annuler</button>
                <button type="submit" disabled={editLoading} className="submit-btn">{editLoading ? 'Modification...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pour gérer les étudiants */}
      {showManageStudentsModal && (
        <div className="modal-overlay" onClick={handleCloseManageStudents}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Gérer les étudiants</h2>
              <button onClick={handleCloseManageStudents} className="modal-close-btn">×</button>
            </div>

            {manageMessage && <div className="success-message">{manageMessage}</div>}
            {manageError && <div className="error-message">{manageError}</div>}

            <div className="manage-students-grid">
              <div className="assigned-students">
                <h3>Étudiants assignés ({students.length})</h3>
                {students.length === 0 ? <p>Aucun étudiant assigné.</p> : (
                  <ul>
                    {students.map((s) => (
                      <li key={s.id} className="assigned-student-item">
                        <span>{s.prenom} {s.nom} - {s.email}</span>
                        <button className="remove-btn" onClick={() => handleRemoveStudent(s.id)}>Retirer</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="available-students">
                <h3>Ajouter des étudiants ({classStudents.length})</h3>
                {classStudents.length === 0 ? <p>Tous les étudiants de la classe sont déjà assignés.</p> : (
                  <form onSubmit={(e) => { e.preventDefault(); handleAssignStudents(); }}>
                    <div className="students-list">
                      {classStudents.map((cs) => (
                        <label key={cs.id} className="student-checkbox">
                          <input type="checkbox" value={cs.id} checked={selectedStudents.includes(cs.id)} onChange={() => toggleSelectStudent(cs.id)} />
                          {cs.prenom} {cs.nom} - {cs.email}
                        </label>
                      ))}
                    </div>

                    <div className="modal-actions">
                      <button type="button" onClick={handleCloseManageStudents} className="cancel-btn">Annuler</button>
                      <button type="submit" disabled={manageLoading} className="submit-btn">{manageLoading ? 'Ajout...' : 'Ajouter sélection'}</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

