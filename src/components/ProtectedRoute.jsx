import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';

/**
 * ProtectedRoute — GeoGan
 *
 * Componente de guarda que protege rutas privadas.
 * Espera a que Zustand termine de rehidratar desde localStorage
 * antes de decidir si redirigir a /login.
 */
export default function ProtectedRoute({ requiredRole }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const isHydrated = useAuthStore((state) => state.isHydrated);

    // 0. Zustand todavía leyendo localStorage → ESPERA (no redirijas a nadie)
    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-[#F4F6F4] flex flex-col items-center justify-center gap-6">
                <img src={logo} alt="GeoGan" style={{ height: '120px' }} />
                <p className="text-sm font-black uppercase tracking-widest text-[#8CB33E] animate-pulse">
                    Restaurando sesión...
                </p>
            </div>
        );
    }

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
