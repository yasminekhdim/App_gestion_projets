import { useState } from "react";
import backgroundImage from "../assets/image.png";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5000/api/auth/forgotPassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div className="forgot-password-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="forgot-password-card">
        <div className="forgot-password-icon">🔑</div>
        <h2>Mot de passe oublié</h2>
        <p className="forgot-password-subtitle">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
        <form className="forgot-password-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="forgot-password-submit-btn">Envoyer le lien</button>
          <a href="/login" className="forgot-password-back-link">← Retour à la connexion</a>
        </form>
        {message && (
          <p className={`forgot-password-message ${message.includes('succès') || message.includes('envoyé') ? 'success' : 'error'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}