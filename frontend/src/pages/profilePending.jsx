import React from "react";
import LogoutButton from "../composants/LogoutButton";

export default function ProfilePending() {
  return (
    <div className="container d-flex flex-column justify-content-center align-items-center vh-100">
      <div className="card text-center p-4 shadow" style={{ maxWidth: "600px", width: "100%" }}>
        <h4 className="mb-4 text-danger">
          Votre compte est en attente de validation par l’administrateur <br />
          <small className="text-muted">(délai max : 24h)</small>
        </h4>
        <LogoutButton />
      </div>
    </div>
  );
}
