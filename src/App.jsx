import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

/**
 * App — GeoGan
 *
 * Enrutamiento principal de la aplicación.
 * - /login          → Página de login (pública)
 * - /dashboard      → Dashboard (protegido por ProtectedRoute)
 * - /               → Redirige a /dashboard
 */
export default function App() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* Fallback → dashboard (si autenticado) o login (si no) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
