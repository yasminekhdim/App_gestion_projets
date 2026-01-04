import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../auth";
import "./CreateProject.css";

export default function CreateProject() {
  const [formData, setFormData] = useState({
    libelle: "",
    matiere: "",
    description: "",
    classe_id: "",
    deadline: "",
  });
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1); // 1: Create project, 2: Assign students
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    if (formData.classe_id) {
      fetchClassStudents(formData.classe_id);
    } else {
      setClassStudents([]);
      setSelectedStudents([]);
    }
  }, [formData.classe_id]);

  const fetchTeacherClasses = async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/teachers/classes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeacherClasses(data.classes || []);
      }
    } catch (err) {
      console.error("Erreur :", err);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchClassStudents = async (classeId) => {
    setLoadingStudents(true);
    try {
      const token = getToken();
      const response = await fetch(
        `http://localhost:5000/api/projects/classes/${classeId}/students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClassStudents(data.students || []);
      }
    } catch (err) {
      console.error("Erreur :", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name} est trop volumineux (max 10MB)`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(", "));
    }

    if (validFiles.length > 0) {
      setAttachmentFiles((prev) => [...prev, ...validFiles]);
      setError("");
    }

    // Reset input
    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStudentToggle = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === classStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(classStudents.map((s) => s.id));
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formData.libelle || !formData.matiere || !formData.classe_id || !formData.deadline) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);

    try {
      const token = getToken();

      // Always send project data as JSON. Attachments are uploaded separately to /api/attachments after creation.
      const response = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          libelle: formData.libelle,
          matiere: formData.matiere,
          description: formData.description,
          classe_id: formData.classe_id,
          deadline: formData.deadline,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const projectId = data.project.id;
        setCreatedProjectId(projectId);
        
        // Upload des pièces jointes si présentes
        if (attachmentFiles.length > 0) {
          try {
            const attachmentFormData = new FormData();
            attachmentFiles.forEach((file) => {
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

        setMessage("✅ Projet créé avec succès !");
        setStep(2);
      } else {
        setError(data.message || "Erreur lors de la création du projet");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors de la création du projet");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0) {
      setError("Veuillez sélectionner au moins un étudiant.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      const response = await fetch(
        `http://localhost:5000/api/projects/${createdProjectId}/students`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_id: createdProjectId,
            student_ids: selectedStudents,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Étudiants assignés avec succès !");
        setTimeout(() => {
          navigate("/enseignant/home");
        }, 2000);
      } else {
        setError(data.message || "Erreur lors de l'assignation des étudiants");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors de l'assignation des étudiants");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/enseignant/home");
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate("/enseignant/home");
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  if (loadingClasses) {
    return (
      <div className="create-project-container">
        <div className="create-project-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="create-project-container">
      <div className="create-project-card">
        <div className="create-project-header">
          <button onClick={handleBack} className="back-btn">
            ← Retour
          </button>
          <h1>{step === 1 ? "Créer un Projet" : "Assigner des Étudiants"}</h1>
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleCreateProject} className="create-project-form">
            <div className="form-group">
              <label htmlFor="libelle">Libellé *</label>
              <input
                type="text"
                id="libelle"
                name="libelle"
                value={formData.libelle}
                onChange={handleChange}
                placeholder="Ex: Projet de fin d'études"
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
                value={formData.matiere}
                onChange={handleChange}
                placeholder="Ex: Développement Web"
                required
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description détaillée du projet..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="classe_id">Classe *</label>
              <select
                id="classe_id"
                name="classe_id"
                value={formData.classe_id}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionnez une classe</option>
                {teacherClasses.map((classe) => (
                  <option key={classe.classe_id} value={classe.classe_id}>
                    {classe.classe} - {classe.departement}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="deadline">Date limite *</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                min={getMinDate()}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="attachments" className="file-upload-label">
                <span className="upload-icon">📎</span>
                <span>Pièces jointes (optionnel)</span>
                <span className="upload-hint">Cliquez pour ajouter des fichiers</span>
              </label>
              <input
                type="file"
                id="attachments"
                name="attachments"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.zip"
                multiple
                className="file-input-hidden"
              />
              <small className="file-hint">
                Formats acceptés: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, XLS, XLSX, ZIP (max 10MB par fichier, jusqu'à 10 fichiers)
              </small>
              
              {attachmentFiles.length > 0 && (
                <div className="attachments-preview">
                  <div className="attachments-header">
                    <span className="attachments-count">{attachmentFiles.length} fichier(s) sélectionné(s)</span>
                  </div>
                  <div className="attachments-list">
                    {attachmentFiles.map((file, index) => (
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
                          onClick={() => handleRemoveFile(index)}
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
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleBack} className="cancel-btn">
                Annuler
              </button>
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? "Création..." : "Créer le projet"}
              </button>
            </div>
          </form>
        ) : (
          <div className="assign-students-section">
            <p className="section-description">
              Sélectionnez les étudiants à assigner au projet. Vous pouvez les assigner plus tard depuis la liste des projets.
            </p>

            {loadingStudents ? (
              <div className="loading-students">Chargement des étudiants...</div>
            ) : classStudents.length === 0 ? (
              <div className="no-students">Aucun étudiant dans cette classe.</div>
            ) : (
              <>
                <div className="select-all-section">
                  <button onClick={handleSelectAll} className="select-all-btn">
                    {selectedStudents.length === classStudents.length
                      ? "Tout désélectionner"
                      : "Tout sélectionner"}
                  </button>
                  <span className="selected-count">
                    {selectedStudents.length} / {classStudents.length} sélectionné(s)
                  </span>
                </div>

                <div className="students-selection-grid">
                  {classStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`student-selection-card ${
                        selectedStudents.includes(student.id) ? "selected" : ""
                      }`}
                      onClick={() => handleStudentToggle(student.id)}
                    >
                      <div className="student-avatar-small">
                        {student.profilePic_url ? (
                          <img src={student.profilePic_url} alt={`${student.prenom} ${student.nom}`} />
                        ) : (
                          <div className="avatar-placeholder-small">
                            {student.prenom?.[0]?.toUpperCase() || ""}
                            {student.nom?.[0]?.toUpperCase() || ""}
                          </div>
                        )}
                      </div>
                      <div className="student-info-small">
                        <h4>
                          {student.prenom} {student.nom}
                        </h4>
                        <p>{student.email}</p>
                      </div>
                      <div className="checkbox-indicator">
                        {selectedStudents.includes(student.id) && "✓"}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-actions">
                  <button onClick={handleSkip} className="skip-btn">
                    Passer cette étape
                  </button>
                  <button
                    onClick={handleAssignStudents}
                    disabled={loading || selectedStudents.length === 0}
                    className="submit-btn"
                  >
                    {loading ? "Assignation..." : "Assigner les étudiants"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

