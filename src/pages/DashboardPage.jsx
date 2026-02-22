import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * DashboardPage — GeoGan (Placeholder)
 *
 * Página protegida de dashboard. Muestra datos del usuario
 * autenticado y permite cerrar sesión. Se expandirá con los
 * módulos de animales, pesajes y GMD.
 */
export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            🐄 GeoGan Dashboard
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Bienvenido, <span className="text-emerald-400">{user?.nombre}</span>
                            {' '}— Rol: <span className="text-amber-400">{user?.rol}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                        Cerrar Sesión
                    </button>
                </div>

                {/* Placeholder de módulos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-lg font-semibold text-white mb-2">
                            📋 Registro de Animales
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Módulo próximo: formulario con React Hook Form + Zod
                        </p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-lg font-semibold text-white mb-2">
                            ⚖️ Pesajes y GMD
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Pesos como float, fechas ISO. Impacto directo en GMD.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
