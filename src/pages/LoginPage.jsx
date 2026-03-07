import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import useAuthStore from '../store/authStore';
import { loginUser } from '../api/authService';
import logo from '../assets/logo_geogan.png';

const loginSchema = z.object({
    email: z.string().min(1, 'El email es obligatorio').email('Email inválido'),
    password: z.string().min(4, 'Mínimo 4 caracteres'),
});

export default function LoginPage() {
    const login = useAuthStore((state) => state.login);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const [serverError, setServerError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    if (isAuthenticated) return <Navigate to="/dashboard" replace />;

    const onSubmit = async (data) => {
        setServerError('');
        try {
            const usuario = await loginUser(data);
            login({
                usuario_id: usuario.usuario_id,
                nombre: usuario.nombre,
                rol: usuario.rol,
                token: usuario.token,
            });
            navigate('/dashboard');
        } catch (error) {
            setServerError(error.response?.status === 401 ? 'Credenciales inválidas' : 'Error de conexión');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
            <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">

                {/* Logo */}
                <div className="text-center mb-1">
                    <img
                        src={logo}
                        alt="GeoGan Logo"
                        className="h-48 mx-auto object-contain"
                    />
                </div>

                {serverError && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
                        {serverError}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            {...register('email')}
                            placeholder="admin@geogan.com"
                            className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#8CB33E]/20 ${errors.email ? 'border-red-300' : 'border-gray-200 focus:border-[#8CB33E]'
                                }`}
                        />
                        {errors.email && <p className="mt-2 text-xs text-red-500 font-medium">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            {...register('password')}
                            placeholder="••••••••"
                            className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#8CB33E]/20 ${errors.password ? 'border-red-300' : 'border-gray-200 focus:border-[#8CB33E]'
                                }`}
                        />
                        {errors.password && <p className="mt-2 text-xs text-red-500 font-medium">{errors.password.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1A3D2F] hover:bg-[#153327] shadow-[#1A3D2F]/20'
                            }`}
                    >
                        {isSubmitting ? 'Verificando...' : 'Entrar'}
                    </button>
                </form>

                <div className="mt-10 pt-6 border-t border-gray-100 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[2px]">
                    © 2026 GeoGan • Precision Farming
                </div>
            </div>
        </div>
    );
}