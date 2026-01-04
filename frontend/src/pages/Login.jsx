import React, { useEffect, useState, useRef } from "react";
import { saveAuth } from "./auth";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import backgroundImage from "../assets/image.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Load cooldown from storage on mount
  useEffect(() => {
    const storedUntil = localStorage.getItem("login_cooldown_until");
    const storedAttempts = localStorage.getItem("login_failed_attempts");
    if (storedAttempts) setFailedAttempts(parseInt(storedAttempts, 10) || 0);
    if (storedUntil) {
      const untilNum = parseInt(storedUntil, 10);
      if (!Number.isNaN(untilNum) && untilNum > Date.now()) {
        setCooldownUntil(untilNum);
      } else {
        localStorage.removeItem("login_cooldown_until");
      }
    }
  }, []);

  // Tick countdown if cooldown active
  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const ms = cooldownUntil - Date.now();
      if (ms <= 0) {
        setCooldownUntil(null);
        setRemaining(0);
        localStorage.removeItem("login_cooldown_until");
        localStorage.setItem("login_failed_attempts", "0");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      setRemaining(Math.ceil(ms / 1000));
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cooldownUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent submit during cooldown
    if (cooldownUntil && cooldownUntil > Date.now()) {
      setMessage("⏳ Veuillez patienter avant de réessayer.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "❌ Erreur lors de la connexion");
        // increment attempts and possibly start cooldown
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        localStorage.setItem("login_failed_attempts", String(nextAttempts));
        if (nextAttempts >= 3) {
          const until = Date.now() + 30_000; // 30 seconds
          setCooldownUntil(until);
          localStorage.setItem("login_cooldown_until", String(until));
          // reset attempts after setting cooldown
          setFailedAttempts(0);
          localStorage.setItem("login_failed_attempts", "0");
        }
        return;
      }

      const { token, user } = data;

      if (!token || !user) {
        setMessage("❌ Réponse invalide du serveur");
        return;
      }

      // reset attempts on success
      setFailedAttempts(0);
      localStorage.setItem("login_failed_attempts", "0");

      saveAuth(token, user);

      // Redirection selon le rôle
      if (user.role === "administrateur") navigate("/admin/home");
      else if (user.role === "enseignant") navigate("/enseignant/home");
      else navigate("/etudiant/home");

    } catch (err) {
      console.error(err);
      setMessage("❌ Erreur réseau ou serveur");
    }
  };

  return (
    <div className="login-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="login-card">
        <h2>Connexion</h2>
        <p className="login-question">Vous avez un compte ?</p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>

          <button type="submit" className="sign-in-button" disabled={!!cooldownUntil && cooldownUntil > Date.now()}>
            {cooldownUntil && cooldownUntil > Date.now()
              ? `Réessayer dans ${remaining}s`
              : "SE CONNECTER"}
          </button>

          {message && <p className="message">{message}</p>}

          <div className="options-row">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Se souvenir de moi</span>
            </label>
            <a href="/resetPass" className="forgot-password">Mot de passe oublié ?</a>
          </div>

          <div className="register-link">
            <a href="/register">Vous n'avez pas de compte ? Créez-en un</a>
          </div>
        </form>
      </div>
    </div>
  );
}
