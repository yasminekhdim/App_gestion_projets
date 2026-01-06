import React from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth } from "../pages/auth";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <button 
      onClick={handleLogout}
      className="btn btn-primary"
      style={{
        padding: "0.5rem 1.5rem",
        fontSize: "1rem",
        borderRadius: "0.25rem",
        border: "none",
        cursor: "pointer",
        backgroundColor: "#007bff",
        color: "white"
      }}
    >
      Se déconnecter
    </button>
  );
}

