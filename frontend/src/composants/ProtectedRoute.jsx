import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../pages/auth";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
