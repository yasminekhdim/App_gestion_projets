import { Outlet } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";

export default function AdminLayout() {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <AdminNavbar />

      {/* CONTENU */}
      <main className="container-fluid py-4 flex-grow-1">
        <Outlet />
      </main>
    </div>
  );
}
