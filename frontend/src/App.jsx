import { BrowserRouter, Routes, Route , Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/administrateur/Home'
import Homensg from './pages/enseignant/Homensg'
import Students from './pages/enseignant/Students'
import CreateProject from './pages/enseignant/CreateProject'
import ProjectsList from './pages/enseignant/ProjectsList'
import ProjectDetails from './pages/enseignant/ProjectDetails'
import Hometud from './pages/etudiant/Hometud'
import Profile from './pages/Profile'
import ProtectedRoute from "./composants/ProtectedRoute";
import './App.css'


function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/home"
          element={
            <ProtectedRoute allowedRoles={["administrateur"]}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enseignant/home"
          element={
            <ProtectedRoute allowedRoles={["enseignant"]}>
              <Homensg />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enseignant/students"
          element={
            <ProtectedRoute allowedRoles={["enseignant"]}>
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enseignant/projects/create"
          element={
            <ProtectedRoute allowedRoles={["enseignant"]}>
              <CreateProject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enseignant/projects"
          element={
            <ProtectedRoute allowedRoles={["enseignant"]}>
              <ProjectsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enseignant/projects/:projectId"
          element={
            <ProtectedRoute allowedRoles={["enseignant"]}>
              <ProjectDetails />
            </ProtectedRoute>
          }
        />
        
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
