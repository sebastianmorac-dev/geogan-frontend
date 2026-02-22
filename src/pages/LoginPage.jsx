import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import useAuthStore from '../store/authStore';
import { loginUser } from '../api/authService';

// ─── Schema de Validación (espejo de Pydantic) ───────────────
const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'El email es obligatorio')
        .email('Ingresa un email válido'),
    password: z
        .string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

/**
 * LoginPage — GeoGan
 *
 * Formulario de autenticación real conectado al backend.
 * Usa react-hook-form + zod para validación client-side
 * y loginUser() para POST a /usuarios/login.
 */
export default function LoginPage() {
    const login = useAuthStore((state) => state.login);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();

    const [serverError, setServerError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    // Si ya está autenticado, redirigir al dashboard
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    /**
     * Envía las credenciales al backend.
     * On success: guarda usuario en authStore y redirige a /dashboard.
     * On error: muestra mensaje contextual.
     */
    const onSubmit = async (data) => {
        setServerError('');

        try {
            const usuario = await loginUser(data);

            // Guardar en store — snake_case para simetría con Pydantic
            login({
                usuario_id: usuario.usuario_id,
                nombre: usuario.nombre,
                rol: usuario.rol,
                email: usuario.email,
            });

            navigate('/dashboard');
        } catch (error) {
            const status = error.response?.status;

            if (status === 401) {
                setServerError('Credenciales inválidas. Verifica tu email y contraseña.');
            } else if (status === 404) {
                setServerError('Usuario no encontrado. Verifica tu email.');
            } else {
                setServerError('Error de conexión con el servidor. Intenta de nuevo.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
            <div className="bg-gray-900 rounded-2xl p-10 shadow-2xl border border-gray-800 max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-emerald-400 mb-1">
                        🐄 GeoGan
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Sistema de Gestión Ganadera
                    </p>
                </div>

                {/* Error del servidor */}
                {serverError && (
                    <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm text-center">
                        {serverError}
                    </div>
                )}

                {/* Formulario */}
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                            Correo electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="usuario@finca.com"
                            {...register('email')}
                            className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white placeholder-gray-500 outline-none transition-colors duration-200 focus:ring-2 focus:ring-emerald-500/40 ${errors.email
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-gray-700 focus:border-emerald-500'
                                }`}
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            {...register('password')}
                            className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white placeholder-gray-500 outline-none transition-colors duration-200 focus:ring-2 focus:ring-emerald-500/40 ${errors.password
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-gray-700 focus:border-emerald-500'
                                }`}
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                        )}
                    </div>

                    {/* Botón de submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${isSubmitting
                            ? 'bg-emerald-800 text-emerald-300 cursor-wait'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-600/20'
                            }`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Autenticando...
                            </span>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-gray-600 text-xs text-center mt-8">
                    Acceso exclusivo para personal ganadero autorizado
                </p>
            </div>
        </div>
    );
}
