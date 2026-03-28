import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterAnimalPage from './pages/RegisterAnimalPage';
import HojaDeVidaAnimal from './pages/HojaDeVidaAnimal';
import EditAnimalPage from './pages/EditAnimalPage';

/**
 * App — GeoGan
 *
 * Enrutamiento principal de la aplicación.
 * - /login                    → Página de login (pública)
 * - /dashboard                → Dashboard (protegido)
 * - /registrar-animal         → Registro de animales (protegido)
 * - /animales/detalle/:id     → Hoja de Vida del animal (lectura, protegido)
 * - /animales/editar/:id      → Editor de perfil base (admin, protegido)
 * - /editar-animal/:id_animal → Redirect temporal a la nueva ruta
 * - /                         → Redirige a /dashboard
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

        {/* NUEVAS RUTAS: Separación de lectura y edición */}
        <Route path="/animales/detalle/:id" element={<HojaDeVidaAnimal />} />
        <Route path="/animales/editar/:id" element={<EditAnimalPage />} />

        {/* REDIRECT TEMPORAL: Ruta vieja → nueva Hoja de Vida */}
        <Route path="/editar-animal/:id_animal" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback → dashboard (si autenticado) o login (si no) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
