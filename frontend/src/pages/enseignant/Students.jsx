import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../auth";
import "./Students.css";

export default function Students() {
  const [studentsByClass, setStudentsByClass] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    if (teacherClasses.length > 0 && !selectedClassId) {
      // Sélectionner automatiquement la première classe
      setSelectedClassId(teacherClasses[0].classe_id.toString());
    }
  }, [teacherClasses]);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents();
    }
  }, [selectedClassId]);

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

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setTeacherClasses(data.classes || []);
      } else {
        setError(data.message || "Erreur lors du chargement des classes");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors du chargement des classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClassId) return;

    setLoading(true);
    setError("");

    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/teachers/students", {
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
        // Filtrer pour n'afficher que la classe sélectionnée
        const filtered = data.studentsByClass.filter(
          (group) => group.classe.id.toString() === selectedClassId
        );
        setStudentsByClass(filtered);
      } else {
        setError(data.message || "Erreur lors du chargement des étudiants");
      }
    } catch (err) {
      console.error("Erreur :", err);
      setError("Erreur réseau lors du chargement des étudiants");
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

  const getStatusLabel = (status) => {
    const statuses = {
      incomplete: "Incomplet",
      pending: "En attente",
      approved: "Approuvé",
      rejected: "Rejeté",
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      incomplete: "#f59e0b",
      pending: "#3b82f6",
      approved: "#10b981",
      rejected: "#ef4444",
    };
    return colors[status] || "#6b7280";
  };

  const handleBack = () => {
    navigate("/enseignant/home");
  };

  const selectedClass = teacherClasses.find(
    (c) => c.classe_id.toString() === selectedClassId
  );
  const currentStudents = studentsByClass[0]?.students || [];
  const studentsCount = currentStudents.length;

  if (loading && !selectedClassId) {
    return (
      <div className="students-container">
        <div className="students-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="students-container">
      <div className="students-content">
        <div className="students-header">
          <button onClick={handleBack} className="back-btn">
            ← Retour
          </button>
          <div>
            <h1>Mes Étudiants</h1>
            {teacherClasses.length === 0 ? (
              <p className="students-subtitle">Aucune classe assignée</p>
            ) : (
              <div className="class-selector-wrapper">
                <label htmlFor="class-select" className="class-select-label">
                  Sélectionner une classe :
                </label>
                <select
                  id="class-select"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="class-select"
                >
                  {teacherClasses.map((classe) => (
                    <option key={classe.classe_id} value={classe.classe_id}>
                      {classe.classe} - {classe.departement}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {teacherClasses.length === 0 ? (
          <div className="no-students">
            <p>Vous n'avez pas encore de classes assignées.</p>
            <p className="hint">Assignez-vous des classes depuis votre profil pour voir vos étudiants.</p>
          </div>
        ) : !selectedClassId ? (
          <div className="no-students">
            <p>Sélectionnez une classe pour voir les étudiants.</p>
          </div>
        ) : loading ? (
          <div className="students-loading">Chargement des étudiants...</div>
        ) : studentsByClass.length === 0 || currentStudents.length === 0 ? (
          <div className="no-students">
            <p>Aucun étudiant dans la classe "{selectedClass?.classe}".</p>
          </div>
        ) : (
          <div className="class-section">
            <div className="class-header">
              <h2>{selectedClass?.classe}</h2>
              <span className="class-department">{selectedClass?.departement}</span>
              <span className="students-count">
                {studentsCount} étudiant{studentsCount > 1 ? "s" : ""}
              </span>
            </div>

            <div className="students-grid">
              {currentStudents.map((student) => (
                <div key={student.id} className="student-card">
                  <div className="student-avatar">
                    {student.profilePic_url ? (
                      <img src={student.profilePic_url} alt={`${student.prenom} ${student.nom}`} />
                    ) : (
                      <div className="avatar-placeholder">
                        {student.prenom?.[0]?.toUpperCase() || ""}
                        {student.nom?.[0]?.toUpperCase() || ""}
                      </div>
                    )}
                  </div>
                  <div className="student-info">
                    <h3>
                      {student.prenom} {student.nom}
                    </h3>
                    <p className="student-email">{student.email}</p>
                    {student.cin && <p className="student-cin">CIN: {student.cin}</p>}
                    {student.date_naissance && (
                      <p className="student-birthdate">{formatDate(student.date_naissance)}</p>
                    )}
                    <div className="student-status">
                      <span
                        className="status-badge"
                        style={{ color: getStatusColor(student.status) }}
                      >
                        {getStatusLabel(student.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

