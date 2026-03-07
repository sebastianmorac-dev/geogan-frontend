import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterAnimalPage from './pages/RegisterAnimalPage';
import EditAnimalPage from './pages/EditAnimalPage';

/**
 * App — GeoGan
 *
 * Enrutamiento principal de la aplicación.
 * - /login              → Página de login (pública)
 * - /dashboard          → Dashboard (protegido)
 * - /registrar-animal   → Registro de animales (protegido)
 * - /                   → Redirige a /dashboard
 */
export default function App() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/registrar-animal" element={<RegisterAnimalPage />} />
        <Route path="/editar-animal/:id_animal" element={<EditAnimalPage />} />
      </Route>

      {/* Fallback → dashboard (si autenticado) o login (si no) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
