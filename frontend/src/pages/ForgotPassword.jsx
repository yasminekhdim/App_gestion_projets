import { useState } from "react";
import './authForms.css'
import backgroundImage from "../assets/image.png";
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
    <div className="auth-container"  style={{ backgroundImage: `url(${backgroundImage})` }}>
  <div className="auth-card">
    <h2>🔑 Mot de passe oublié</h2>
    <form className="auth-form" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit">Envoyer le lien</button>
      <a href="/login">Se connecter</a>
    </form>
    {message && <p className="message">{message}</p>}
  </div>
</div>
  );
}