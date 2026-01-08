import { useParams } from "react-router-dom";
import { useState } from "react";
import backgroundImage from "../assets/image.png";
import "./ResetPassword.css";

export default function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`http://localhost:5000/api/auth/resetPassword/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    if (!res.ok) {
      const text = await res.text(); // récupère le HTML
      throw new Error(text);
    }

    const data = await res.json();
    setMessage(data.message);
  } catch (err) {
    console.error(err);
    setMessage("Erreur serveur ❌");
  }
};

  return (
    <div className="reset-password-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="reset-password-card">
        <div className="reset-password-icon">🔒</div>
        <h2>Réinitialiser votre mot de passe</h2>
        <form className="reset-password-form" onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button type="submit" className="reset-password-submit-btn">Mettre à jour</button>
          <a href="/login" className="reset-password-back-link">← Retour à la connexion</a>
        </form>
        {message && (
          <p className={`reset-password-message ${message.includes('succès') || message.includes('réinitialisé') ? 'success' : 'error'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
