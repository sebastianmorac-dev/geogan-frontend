import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * ProtectedRoute — GeoGan
 *
 * Componente de guarda que protege rutas privadas.
 * Si el usuario NO está autenticado, redirige a /login.
 * Usa <Outlet /> para renderizar las rutas hijas.
 *
 * Opcionalmente acepta `requiredRole` para restringir
 * el acceso por rol (e.g. 'propietario', 'superadmin').
 */
export default function ProtectedRoute({ requiredRole }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

    // 1. No autenticado → login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 2. Rol requerido pero insuficiente → dashboard (sin privilegios)
    if (requiredRole && user?.rol !== requiredRole) {
        return <Navigate to="/dashboard" replace />;
    }

    // 3. Autorizado → renderizar ruta hija
    return <Outlet />;
}
