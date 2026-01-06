import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { getUser, clearAuth } from "../auth";
import "./AdminNavbar.css";
import logo from "../../assets/logo.png";

export default function AdminNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const [imgError, setImgError] = useState(false);

  const navItems = [
    { name: "Validation", path: "/admin/validation" },
    { name: "Utilisateurs", path: "/admin/users" },
    { name: "Statistiques", path: "/admin/statistics" },
  ];

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white shadow-sm border-bottom border-primary border-2">
      <div className="container-fluid px-4">

        {/* Brand */}
        <Link
          to="/admin"
          className="navbar-brand d-flex align-items-center gap-2"
        >
          {logo && (
            <img
              src={logo}
              alt="ProjectHub logo"
              height="38"
              className="rounded p-1 bg-white border border-primary"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span className="fw-bold fs-5 text-primary">
            ProjectHub
          </span>
        </Link>

        {/* Navigation */}
        <ul className="navbar-nav me-auto ms-4 gap-1">
          {navItems.map(item => (
            <li className="nav-item" key={item.path}>
              <Link
                to={item.path}
                className={`nav-link px-3 rounded fw-medium ${
                  location.pathname === item.path
                    ? "active bg-primary text-white"
                    : "text-dark"
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Profil */}
        <div className="d-flex align-items-center gap-3">

          <div className="text-end">
            <div className="fw-semibold text-dark">
              {user?.nom || "Admin"}
            </div>
            <small className="text-muted">Administrateur</small>
          </div>
          <Link to="/admin/profile">
          {!imgError ? (
            <img
              src={user?.profilePic_url || "/profile.png"}
              alt="profile"
              width="40"
              height="40"
              className="rounded-circle border border-primary"
              onError={() => setImgError(true)}
            />
          ) : (
            <i className="fas fa-user-circle fs-3 text-primary"></i>
          )}
          </Link>
          <button
            className="btn btn-outline-primary btn-sm px-3"
            onClick={logout}
          >
            <i className="fas fa-sign-out-alt me-1"></i>
            Déconnexion
          </button>

        </div>
      </div>
    </nav>
  );
}
