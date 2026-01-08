import { Outlet } from "react-router-dom";
import EnseignantNavbar from "./EnseignantNavbar";
import "./EnseignantLayout.css";

export default function EnseignantLayout() {
  return (
    <div className="enseignant-layout">
      <EnseignantNavbar />
      <div className="enseignant-layout-content">
        <Outlet />
      </div>
    </div>
  );
}

