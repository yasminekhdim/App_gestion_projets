import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CompleteProfile from './pages/complete-profile'
import ProfilePending from './pages/profilePending'
import EnseignantLayout from './pages/enseignant/EnseignantLayout'
import Homensg from './pages/enseignant/Homensg'
import Students from './pages/enseignant/Students'
import CreateProject from './pages/enseignant/CreateProject'
import ProjectsList from './pages/enseignant/ProjectsList'
import ProjectDetails from './pages/enseignant/ProjectDetails'
import Hometud from './pages/etudiant/Hometud'
import Profile from './pages/Profile'
import AdminLayout from './pages/administrateur/AdminLayout'
import Dashboard from './pages/administrateur/Dashboard'
import AdminValidation from './pages/administrateur/AdminValidation'
import AdminUsers from './pages/administrateur/AdminUsers'
import AdminProfile from './pages/administrateur/AdminProfile'
import ProtectedRoute from "./composants/ProtectedRoute";
import './styles/design-system.css';
import './App.css'


function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/resetPassword/:token" element={<ResetPassword />} />
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute allowedRoles={["administrateur", "enseignant", "etudiant"]}>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profilePending"
          element={
            <ProtectedRoute allowedRoles={["administrateur", "enseignant", "etudiant"]}>
              <ProfilePending />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={["administrateur"]}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />           {/* /admin */}
          <Route path="validation" element={<AdminValidation />} /> {/* /admin/validation */}
          <Route path="users" element={<AdminUsers />} />
          <Route path="profile" element={<AdminProfile />} />
          {/* Add other admin subpages here */}
        </Route>
        <Route
          path="/enseignant"
          element={
            <ProtectedRoute allowedRoles={["enseignant"]}>
              <EnseignantLayout />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<Homensg />} />
          <Route path="students" element={<Students />} />
          <Route path="projects/create" element={<CreateProject />} />
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/:projectId" element={<ProjectDetails />} />
        </Route>

        <Route
          path="/etudiant/home"
          element={
            <ProtectedRoute allowedRoles={["etudiant"]}>
              <Hometud />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["administrateur", "enseignant", "etudiant"]}>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>

  )
}

export default App
