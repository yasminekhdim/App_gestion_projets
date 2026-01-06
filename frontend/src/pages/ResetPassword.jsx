import { useParams } from "react-router-dom";
import { useState } from "react";
import backgroundImage from "../assets/image.png";
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
    <div className="auth-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
  <div className="auth-card">
    <h2>🔒 Réinitialiser votre mot de passe</h2>
    <form className="auth-form" onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Nouveau mot de passe"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />
      <button type="submit">Mettre à jour</button>
      <a href="/login">Se connecter</a>
    </form>
    {message && <p className="message">{message}</p>}
  </div>
</div>
  );
}
