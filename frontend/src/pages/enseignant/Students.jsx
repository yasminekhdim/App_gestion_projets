import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../auth";
import "./Students.css";

export default function Students() {
  const [studentsByClass, setStudentsByClass] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Modal state for student details
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const openStudentModal = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  const closeStudentModal = () => {
    setShowStudentModal(false);
    setSelectedStudent(null);
  };

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    if (teacherClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(teacherClasses[0].classe_id.toString());
    }
  }, [teacherClasses]);

  useEffect(() => {
    if (selectedClassId) fetchStudents();
  }, [selectedClassId]);

  const fetchTeacherClasses = async () => {
    try {
      const token = getToken();
      if (!token) { navigate("/login"); return; }
      const response = await fetch("http://localhost:5000/api/teachers/classes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setTeacherClasses(data.classes || []);
      else setError(data.message || "Erreur lors du chargement des classes");
    } catch (err) { setError("Erreur réseau lors du chargement des classes"); }
    finally { setLoading(false); }
  };

  const fetchStudents = async () => {
    if (!selectedClassId) return;
    setLoading(true); setError("");
    try {
      const token = getToken();
      if (!token) { navigate("/login"); return; }
      const response = await fetch("http://localhost:5000/api/teachers/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const filtered = data.studentsByClass.filter(
          (group) => group.classe.id.toString() === selectedClassId
        );
        setStudentsByClass(filtered);
      } else setError(data.message || "Erreur lors du chargement des étudiants");
    } catch (err) { setError("Erreur réseau lors du chargement des étudiants"); }
    finally { setLoading(false); }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Non renseigné";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  };

  const getStatusLabel = (status) => {
    const statuses = { incomplete: "Incomplet", pending: "En attente", approved: "Approuvé", rejected: "Rejeté" };
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = { incomplete: "#f59e0b", pending: "#3b82f6", approved: "#10b981", rejected: "#ef4444" };
    return colors[status] || "#6b7280";
  };

  const handleBack = () => navigate("/enseignant/home");

  const selectedClass = teacherClasses.find((c) => c.classe_id.toString() === selectedClassId);
  const currentStudents = studentsByClass[0]?.students || [];
  const studentsCount = currentStudents.length;

  if (loading && !selectedClassId) {
    return <div className="students-container"><div className="students-loading">Chargement...</div></div>;
  }

  return (
    <div className="students-container">
      <div className="students-content">
        <div className="students-header">
          <button onClick={handleBack} className="back-btn">← Retour</button>
          <div>
            <h1>Mes Étudiants</h1>
            {teacherClasses.length === 0 ? (
              <p className="students-subtitle">Aucune classe assignée</p>
            ) : (
              <div className="class-selector-wrapper">
                <label htmlFor="class-select" className="class-select-label">Sélectionner une classe :</label>
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

        {!selectedClassId || currentStudents.length === 0 ? (
          <div className="no-students">
            <p>{currentStudents.length === 0 ? `Aucun étudiant dans la classe "${selectedClass?.classe}".` : "Sélectionnez une classe pour voir les étudiants."}</p>
          </div>
        ) : (
          <div className="class-section">
            <div className="class-header">
              <h2>{selectedClass?.classe}</h2>
              <span className="class-department">{selectedClass?.departement}</span>
              <span className="students-count">{studentsCount} étudiant{studentsCount > 1 ? "s" : ""}</span>
            </div>

            <div className="students-grid">
              {currentStudents.map((student) => (
                <div key={student.id} className="student-card" onClick={() => openStudentModal(student)}>
                  <div className="student-avatar">
                    {student.profilePic_url ? (
                      <img src={student.profilePic_url} alt={`${student.prenom} ${student.nom}`} />
                    ) : (
                      <div className="avatar-placeholder">
                        {student.prenom?.[0]?.toUpperCase()}{student.nom?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="student-info">
                    <h3>{student.prenom} {student.nom}</h3>
                    <p className="student-email">{student.email}</p>
                    {student.cin && <p className="student-cin">CIN: {student.cin}</p>}
                    {student.date_naissance && <p className="student-birthdate">{formatDate(student.date_naissance)}</p>}
                    <span className="status-badge" style={{ color: getStatusColor(student.status) }}>
                      {getStatusLabel(student.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student modal (only improved) */}
        {showStudentModal && selectedStudent && (
          <div className="modal-overlay" onClick={closeStudentModal}>
            <div className="student-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Profil étudiant</h2>
                <button className="modal-close-btn" onClick={closeStudentModal}>✕</button>
              </div>

              <div className="student-modal-body">
                <div className="student-profile">
                  <div className="student-profile-avatar">
                    {selectedStudent.profilePic_url ? (
                      <img src={selectedStudent.profilePic_url} alt={`${selectedStudent.prenom} ${selectedStudent.nom}`} />
                    ) : (
                      <div className="avatar-placeholder large">
                        {selectedStudent.prenom?.[0]?.toUpperCase()}{selectedStudent.nom?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="student-profile-info">
                    <div className="student-name-status">
                      <h3>{selectedStudent.prenom} {selectedStudent.nom}</h3>
                      {selectedStudent.status === "approved" ? (
                        <span className="active-badge">Actif</span>
                      ) : (
                        <span className="inactive-badge">Inactif</span>
                      )}
                    </div>

                    <p className="student-email">{selectedStudent.email}</p>
                    <p><strong>Date de naissance:</strong> {formatDate(selectedStudent.date_naissance)}</p>
                    <p><strong>CIN:</strong> {selectedStudent.cin || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
