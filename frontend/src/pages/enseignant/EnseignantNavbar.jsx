import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { getUser, clearAuth } from "../auth";
import "./EnseignantNavbar.css";
import logo from "../../assets/logo.png";

export default function EnseignantNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const [imgError, setImgError] = useState(false);

  const navItems = [
    { name: "Accueil", path: "/enseignant/home" },
    { name: "Mes Projets", path: "/enseignant/projects" },
    { name: "Mes Étudiants", path: "/enseignant/students" },
  ];

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <nav className="enseignant-navbar">
      <div className="enseignant-navbar-container">
        {/* Brand */}
        <Link
          to="/enseignant/home"
          className="enseignant-navbar-brand"
        >
          {logo && (
            <img
              src={logo}
              alt="ProjectHub logo"
              className="enseignant-navbar-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span className="enseignant-navbar-brand-text">
            ProjectHub
          </span>
        </Link>

        {/* Navigation */}
        <ul className="enseignant-navbar-nav">
          {navItems.map(item => (
            <li className="enseignant-nav-item" key={item.path}>
              <Link
                to={item.path}
                className={`enseignant-nav-link ${location.pathname === item.path ? "active" : ""}`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Profil & Actions */}
        <div className="enseignant-navbar-actions">
          <div className="enseignant-user-info">
            <div className="enseignant-user-name">
              {user?.nom || "Enseignant"}
            </div>
            <small className="enseignant-user-role">Enseignant</small>
          </div>
          <Link to="/profile" className="enseignant-profile-link">
            {!imgError ? (
              <img
                src={user?.profilePic_url || "/profile.png"}
                alt="profile"
                className="enseignant-profile-pic"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="enseignant-profile-placeholder">👤</div>
            )}
          </Link>
          <button
            className="enseignant-logout-btn"
            onClick={logout}
          >
            🚪 Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}

