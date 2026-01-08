import React, { useEffect, useState, useRef } from "react";
import { saveAuth } from "./auth";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import backgroundImage from "../assets/image.png";
import logo from "../assets/logo.png";

// --- Firebase imports ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

// ✅ Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtkjU2ZY6zYHloGU_fWYqRbBdXJxqIAT0",
  authDomain: "gestionprojet-b48a9.firebaseapp.com",
  projectId: "gestionprojet-b48a9",
  storageBucket: "gestionprojet-b48a9.firebasestorage.app",
  messagingSenderId: "1062444978253",
  appId: "1:1062444978253:web:b882d67a1c745a0c648c04",
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Ensure backend messages are displayed as errors (prefix with ❌ if not already)
        setMessage((data.message && data.message.startsWith('❌')) ? data.message : `❌ ${data.message || 'Erreur lors de la connexion'}`);
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
        setIsLoading(false);
        return;
      }

      const { token, user } = data;

      if (!token || !user) {
        setMessage("❌ Réponse invalide du serveur");
        setIsLoading(false);
        return;
      }

      // reset attempts on success
      setFailedAttempts(0);
      localStorage.setItem("login_failed_attempts", "0");

      saveAuth(token, user, rememberMe);

      // Check status before redirecting
      if (user.status === "incomplete") {
        setIsLoading(false);
        navigate("/complete-profile");
        return;
      }

      if (user.status === "pending") {
        setIsLoading(false);
        navigate("/profilePending");
        return;
      }

      // Redirection selon le rôle (only if approved)
      if (user.status === "approved") {
        setIsLoading(false);
        if (user.role === "administrateur") navigate("/admin");
        else if (user.role === "enseignant") navigate("/enseignant/home");
        else navigate("/etudiant/home");
      } else {
        setMessage("Votre compte n'est pas encore approuvé. Veuillez patienter.");
        setIsLoading(false);
      }

    } catch (err) {
      console.error(err);
      setMessage("❌ Erreur réseau ou serveur");
      setIsLoading(false);
    }
  };

  // 🚀 GOOGLE LOGIN (version popup → fonctionne toujours)
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const idToken = await user.getIdToken();

      const response = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        return setMessage("❌ " + (data.message || "Erreur inconnue"));
      }
      console.log(data);

      // Utilise saveAuth au lieu de localStorage.setItem directement
      saveAuth(data.token, data.user, true);

      if (data.user.status === "incomplete") {
        navigate("/complete-profile");
        return;
      }

      else if (data.user.status === "pending") {
        navigate("/profilePending");
        return;
      }

      if (data.user.status === "approved") {
        if (data.user.role === "administrateur") navigate("/admin");
        else if (data.user.role === "enseignant") navigate("/enseignant/home");
        else {
          console.log("hola etudiant");
          navigate("/etudiant/home");
        }
      }


    } catch (error) {
      console.error("Erreur Google :", error);
      setMessage("❌ Authentification Google échouée");
    }
  };


  return (
    <div className="login-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="login-card">
        <img src={logo} alt="Logo" className="login-logo" />
        <h2>Connexion</h2>
        <p className="login-question">Vous avez un compte ?</p>
        {/* Message (erreur / info) */}
        {message && (
          <p className={`message ${message.startsWith('❌') || message.startsWith('⏳') ? 'error' : 'success'}`} role="alert" aria-live="polite">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            id="email"
            autoComplete="username"
            autoFocus
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>

          <button type="submit" className="sign-in-button" disabled={isLoading || (!!cooldownUntil && cooldownUntil > Date.now())} aria-busy={isLoading}>
            {isLoading ? (
              <span className="spinner" aria-hidden="true"></span>
            ) : (cooldownUntil && cooldownUntil > Date.now()
              ? `Réessayer dans ${remaining}s`
              : "SE CONNECTER")}
          </button>

          {/* GOOGLE */}
          <button type="button" className="google-button" onClick={handleGoogleLogin} disabled={isLoading} aria-disabled={isLoading}>
            <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>


          <div className="options-row">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Se souvenir de moi</span>
            </label>
            <a href="/forgot-password" className="forgot-password">
              Mot de passe oublié ?
            </a>          </div>

          <div className="register-link">
            <a href="/register">Vous n'avez pas de compte ? Créez-en un</a>
          </div>
        </form>
      </div>
    </div>
  );
}
