import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";
import backgroundImage from "../assets/image.png";
import logo from "../assets/logo.png";

export default function Register() {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateNaissance: "",
    cin: "",
    role: "etudiant",
    departement: "",
    classe: ""
  });

  const [proofOfId, setProofOfId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchClasses = async () => {
      if (formData.role === "etudiant" && formData.departement) {
        setLoadingClasses(true);
        setFormData(prev => ({ ...prev, classe: "" }));
        try {
          const encodedDepartement = encodeURIComponent(formData.departement);
          const response = await fetch(
            `http://localhost:5000/api/classes/${encodedDepartement}`
          );
          const data = await response.json();
          if (response.ok) setClasses(data.classes || []);
          else setClasses([]);
        } catch (error) {
          console.error("Erreur classes:", error);
          setClasses([]);
        } finally {
          setLoadingClasses(false);
        }
      } else {
        setClasses([]);
        setFormData(prev => ({ ...prev, classe: "" }));
      }
    };
    fetchClasses();
  }, [formData.departement, formData.role]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setProofOfId(e.target.files?.[0] || null);

  const maxBirthDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 17);
    return d.toISOString().split("T")[0];
  }, []);

  const isAtLeast17 = (date) => {
    if (!date) return false;
    const birth = new Date(date);
    const now = new Date();
    birth.setFullYear(birth.getFullYear() + 17);
    return birth <= now;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!isAtLeast17(formData.dateNaissance)) return setMessage("❌ Vous devez avoir au moins 17 ans.");
    if (!proofOfId) return setMessage("❌ Veuillez téléverser la preuve d'identité universitaire.");
    if (!formData.departement) return setMessage("❌ Veuillez sélectionner un département.");
    if (formData.role === "etudiant" && !formData.classe) return setMessage("❌ Veuillez sélectionner votre classe.");
    if (formData.password !== formData.confirmPassword) return setMessage("❌ Les mots de passe ne correspondent pas.");

    try {
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== "confirmPassword") body.append(key, value);
      });
      body.append("proofOfId", proofOfId);

      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        body
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ Inscription réussie !");
        // clear form and file input
        setFormData({
          nom: "",
          prenom: "",
          email: "",
          password: "",
          confirmPassword: "",
          dateNaissance: "",
          cin: "",
          role: "etudiant",
          departement: "",
          classe: ""
        });
        setProofOfId(null);
        setClasses([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // redirect to login after a short delay so user sees the success message
        setTimeout(() => navigate("/login"), 1800);
      } else {
        setMessage("❌ " + data.message);
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Erreur serveur");
    }
  };

  return (
    <div className="register-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="register-card">
        <div className="register-inner">
          <div className="register-hero">
            <img src={logo} alt="Logo" className="register-logo" />
            <h2>Bienvenue</h2>
            <p className="register-question">Créez un compte étudiant ou enseignant — prenez votre temps.</p>
            <p className="hero-note">Choisissez votre département et votre classe (si étudiant). Votre preuve d'identité est requise.</p>
          </div>

          <div className="register-form-section">
            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-grid">
                <div className="field">
                  <label className="sr-only">Nom</label>
                  <input name="nom" placeholder="Nom" value={formData.nom} onChange={handleChange} required />
                </div>

                <div className="field">
                  <label className="sr-only">Prénom</label>
                  <input name="prenom" placeholder="Prénom" value={formData.prenom} onChange={handleChange} required />
                </div>

                <div className="field">
                  <label className="sr-only">Email</label>
                  <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                </div>

                <div className="field">
                  <label className="sr-only">CIN</label>
                  <input name="cin" placeholder="CIN" value={formData.cin} onChange={handleChange} required />
                </div>

                <div className="field">
                  <label className="sr-only">Date de naissance</label>
                  <input type="date" name="dateNaissance" value={formData.dateNaissance} onChange={handleChange} max={maxBirthDate} required />
                </div>

                <div className="field">
                  <label className="sr-only">Rôle</label>
                  <select name="role" value={formData.role} onChange={handleChange} required>
                    <option value="etudiant">Étudiant</option>
                    <option value="enseignant">Enseignant</option>
                  </select>
                </div>

                <div className="field full">
                  <label className="sr-only">Département</label>
                  <select name="departement" value={formData.departement} onChange={handleChange} required>
                    <option value="">Département</option>
                    <option value="Technologies de l'Informatique">Technologies de l'Informatique</option>
                    <option value="Génie Electrique">Génie Electrique</option>
                    <option value="Génie Mécanique">Génie Mécanique</option>
                    <option value="Génie Civil">Génie Civil</option>
                    <option value="Science Economique et de Gestion">Science Economique et de Gestion</option>
                  </select>
                </div>

                {formData.role === "etudiant" && (
                  <div className="field">
                    <label className="sr-only">Classe</label>
                    <select name="classe" value={formData.classe} onChange={handleChange} disabled={!formData.departement || loadingClasses} required>
                      <option value="">{loadingClasses ? "Chargement..." : "Sélectionnez votre classe"}</option>
                      {classes.map(c => (<option key={c.id} value={c.id}>{c.classe}</option>))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label className="sr-only">Mot de passe</label>
                  <div className="password-input-wrapper">
                    <input type={showPassword ? "text" : "password"} name="password" placeholder="Mot de passe" value={formData.password} onChange={handleChange} required />
                    <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </span>
                  </div>
                </div>

                <div className="field">
                  <label className="sr-only">Confirmer mot de passe</label>
                  <input type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirmer mot de passe" value={formData.confirmPassword} onChange={handleChange} required />
                </div>

                <div className="field full file-field">
                  <label className="sr-only">Preuve d'identité (PDF ou image)</label>
                  <input ref={fileInputRef} type="file" accept=".pdf,image/*" onChange={handleFileChange} required />
                </div>

                <div className="field actions full">
                  <div className="actions-row">
                    <button type="button" className="cancel-btn" onClick={() => setFormData({ nom: "", prenom: "", email: "", password: "", confirmPassword: "", dateNaissance: "", cin: "", role: "etudiant", departement: "", classe: "" })}>Annuler</button>
                    <button type="submit" className="sign-up-button" aria-live="polite">S'INSCRIRE</button>
                  </div>
                  {message && (
                    <p className={`message ${message.startsWith('❌') ? 'error' : message.startsWith('✅') ? 'success' : ''}`} role="alert" aria-live="polite">
                      {message}
                    </p>
                  )}
                </div>

              </div>
            </form>

            <p className="login-link">
              Déjà un compte ? <Link to="/login">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
