import { useMemo, useState, useEffect } from "react";
import "./Register.css";
import backgroundImage from "../assets/image.png";

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
    classe: "",
    proofOfId: null
  });
  const [proofOfId, setProofOfId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Charger les classes quand le département change (pour les étudiants)
  useEffect(() => {
    const fetchClasses = async () => {
      if (formData.role === "etudiant" && formData.departement) {
        setLoadingClasses(true);
        setFormData((prev) => ({ ...prev, classe: "" })); // Réinitialiser la classe
        try {
          const encodedDepartement = encodeURIComponent(formData.departement);
          const response = await fetch(
            `http://localhost:5000/api/classes/${encodedDepartement}`
          );
          const data = await response.json();
          if (response.ok) {
            setClasses(data.classes || []);
          } else {
            setClasses([]);
            console.error("Erreur lors du chargement des classes:", data.message);
          }
        } catch (error) {
          console.error("Erreur lors du chargement des classes:", error);
          setClasses([]);
        } finally {
          setLoadingClasses(false);
        }
      } else {
        setClasses([]);
        setFormData((prev) => ({ ...prev, classe: "" })); // Réinitialiser la classe si ce n'est pas un étudiant
      }
    };

    fetchClasses();
  }, [formData.departement, formData.role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === "proofOfId") setProofOfId(files && files[0] ? files[0] : null);
  };

  const maxBirthDate = useMemo(() => {
    // Today minus 17 years
    const d = new Date();
    d.setFullYear(d.getFullYear() - 17);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const isAtLeast17 = (isoDate) => {
    if (!isoDate) return false;
    const birth = new Date(isoDate);
    const now = new Date();
    const seventeenth = new Date(birth);
    seventeenth.setFullYear(birth.getFullYear() + 17);
    return seventeenth <= now;
  };

  // Validation basique côté client
  const validate = () => {
    const {
      nom,
      prenom,
      cin,
      email,
      date_naiss,
      password,
      confirmPassword,
      role,
      departement,
      classe,
      proofOfId
    } = formData;

    if (
      !nom ||
      !prenom ||
      !cin ||
      !email ||
      !date_naiss ||
      !password ||
      !confirmPassword ||
      !role ||
      !departement
    ) {
      setMessage("Veuillez remplir tous les champs obligatoires.");
      return false;
    }

    // Vérifier format email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Email invalide.");
      return false;
    }

    // Mot de passe et confirmation
    if (password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas.");
      return false;
    }

    // Rôle spécifique validations
    if (role === "etudiant") {
      if (!proofOfId || !classe) {
        setMessage("Veuillez remplir tous les champs obligatoires pour l'étudiant.");
        return false;
      }
    } else if (role === "enseignant") {
      if (!proofOfId) {
        setMessage("Veuillez remplir tous les champs obligatoires pour l'enseignant.");
        return false;
      }
    }

    return true;
  };


  
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validations
    if (!isAtLeast17(formData.dateNaissance)) {
      setMessage("❌ Vous devez avoir au moins 17 ans.");
      return;
    }
    if (!proofOfId) {
      setMessage("❌ Veuillez téléverser la preuve d'identité universitaire.");
      return;
    }

    if (!formData.departement) {
      setMessage("❌ Veuillez sélectionner un département.");
      return;
    }

    if (formData.role === "etudiant" && !formData.classe) {
      setMessage("❌ Veuillez saisir votre classe.");
      return;
    }

    try {
      const body = new FormData();
      body.append("nom", formData.nom);
      body.append("prenom", formData.prenom);
      body.append("email", formData.email);
      body.append("password", formData.password);
      body.append("dateNaissance", formData.dateNaissance);
      body.append("cin", formData.cin);
      body.append("role", formData.role);
      body.append("departement", formData.departement);
      if (formData.role === "etudiant") {
        body.append("classe", formData.classe);
      }
      body.append("proofOfId", proofOfId);

      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        body,
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ Inscription réussie !");
      } else {
        setMessage("❌ " + data.message);
      }
    } catch (error) {
      console.error("Erreur :", error);
      setMessage("❌ Erreur serveur");
    }
  };

  return (
    <div className="register-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="register-card">
        <h2>Inscription</h2>
        <p className="register-question">Créez votre compte ?</p>
        <form onSubmit={handleSubmit} className="register-form">
          <div className="row-2">
            <input
              type="text"
              name="nom"
              placeholder="Nom"
              value={formData.nom}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="prenom"
              placeholder="Prénom"
              value={formData.prenom}
              onChange={handleChange}
              required
            />
          </div>

          <select
            name="role"
            className="role-select"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="etudiant">Étudiant</option>
            <option value="enseignant">Enseignant</option>
          </select>

          <div className="row-2">
            <input
              type="text"
              name="cin"
              placeholder="CIN"
              value={formData.cin}
              onChange={handleChange}
              required
            />
            <input
              type="date"
              name="dateNaissance"
              placeholder="Date de naissance"
              value={formData.dateNaissance}
              onChange={handleChange}
              max={maxBirthDate}
              required
            />
          </div>

          <select
            name="departement"
            className="role-select"
            value={formData.departement}
            onChange={handleChange}
            required
          >
            <option value="">Département</option>
            <option value="Technologies de l'Informatique">Technologies de l'Informatique</option>
            <option value="Génie Electrique">Génie Electrique</option>
            <option value="Génie Mécanique">Génie Mécanique</option>
            <option value="Génie Civil">Génie Civil</option>
            <option value="Science Economique et de Gestion">Science Economique et de Gestion</option>
          </select>

          {formData.role === "etudiant" && (
            <select
              name="classe"
              className="role-select"
              value={formData.classe}
              onChange={handleChange}
              required
              disabled={!formData.departement || loadingClasses}
            >
              <option value="">
                {loadingClasses
                  ? "Chargement des classes..."
                  : !formData.departement
                  ? "Sélectionnez d'abord un département"
                  : "Sélectionnez votre classe"}
              </option>
              {classes.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.classe}
                </option>
              ))}
            </select>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>
           <div className="field-group">
              <label htmlFor="confirmPassword">Confirmer mot de passe</label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirmer mot de passe"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

          <div className="file-field">
            <label className="file-label">
              {formData.role === "enseignant"
                ? "Attestation de travail (preuve d'identité universitaire)"
                : "Attestation d'inscription (preuve d'identité universitaire)"}
            </label>
            <input
              type="file"
              name="proofOfId"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              required
            />
            <small className="file-hint">Formats acceptés: PDF, JPG, PNG</small>
          </div>

          <button type="submit" className="sign-up-button">S'INSCRIRE</button>

          {message && <p className="message">{message}</p>}

          <div className="login-link">
            <a href="/login">Vous avez déjà un compte ? Connectez-vous</a>
          </div>
        </form>
      </div>
    </div>
  );
}
