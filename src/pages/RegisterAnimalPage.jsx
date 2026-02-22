import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useAuthStore from '../store/authStore';
import { animalSchema, SEXO_OPTIONS, ESTADO_OPTIONS } from '../schemas/animalSchema';
import { useCreateAnimal } from '../hooks/useAnimales';

/**
 * RegisterAnimalPage — GeoGan
 *
 * Formulario de registro de ganado con:
 * - Validación Zod (espejo de Pydantic)
 * - id_finca e id_propietario inyectados desde authStore
 * - Restricción de rol: solo propietario o encargado
 * - Toast de éxito + redirección al dashboard
 */
export default function RegisterAnimalPage() {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const createAnimalMutation = useCreateAnimal();

    const [successMsg, setSuccessMsg] = useState('');
    const [serverError, setServerError] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(animalSchema),
        defaultValues: {
            codigo_identificacion: '',
            especie: '',
            raza: '',
            sexo: '',
            peso: '',
            fecha_ingreso: new Date().toISOString().split('T')[0],
            estado: 'activo',
        },
    });

    // --- Guardas de seguridad ---
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const canRegister = user?.rol === 'propietario' || user?.rol === 'encargado' || user?.rol === 'superadmin';
    if (!canRegister) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
                <div className="bg-gray-900 rounded-2xl p-10 border border-red-800 max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-red-400 mb-3">⛔ Acceso Denegado</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Solo usuarios con rol <span className="text-amber-400">propietario</span> o{' '}
                        <span className="text-amber-400">encargado</span> pueden registrar animales.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        Volver al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const onSubmit = async (data) => {
        setServerError('');
        setSuccessMsg('');

        try {
            await createAnimalMutation.mutateAsync({
                ...data,
                peso: parseFloat(data.peso), // Siempre float para GMD
                id_finca: user.id_finca,
                id_propietario: user.usuario_id,
            });

            setSuccessMsg(`✅ Animal "${data.codigo_identificacion}" registrado exitosamente`);
            reset();

            // Redirigir al dashboard después de 2s
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (error) {
            const detail = error.response?.data?.detail;
            setServerError(
                typeof detail === 'string'
                    ? detail
                    : 'Error al registrar el animal. Intenta de nuevo.'
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">📋 Registrar Animal</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Finca ID: <span className="text-emerald-400">{user?.id_finca ?? 'N/A'}</span>
                            {' '}— Propietario: <span className="text-emerald-400">{user?.nombre}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors"
                    >
                        ← Dashboard
                    </button>
                </div>

                {/* Toast de éxito */}
                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg text-emerald-400 text-sm text-center animate-pulse">
                        {successMsg}
                    </div>
                )}

                {/* Error del servidor */}
                {serverError && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm text-center">
                        {serverError}
                    </div>
                )}

                {/* Formulario */}
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl space-y-6"
                >
                    {/* Código de Identificación */}
                    <div>
                        <label htmlFor="codigo_identificacion" className="block text-sm font-medium text-gray-300 mb-1.5">
                            Código de Identificación *
                        </label>
                        <input
                            id="codigo_identificacion"
                            type="text"
                            placeholder="Ej: BOV-001"
                            {...register('codigo_identificacion')}
                            className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white placeholder-gray-500 outline-none transition-colors focus:ring-2 focus:ring-emerald-500/40 ${errors.codigo_identificacion
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-gray-700 focus:border-emerald-500'
                                }`}
                        />
                        {errors.codigo_identificacion && (
                            <p className="mt-1 text-xs text-red-400">{errors.codigo_identificacion.message}</p>
                        )}
                    </div>

                    {/* Especie + Raza (2 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="especie" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Especie *
                            </label>
                            <input
                                id="especie"
                                type="text"
                                placeholder="Ej: Bovino"
                                {...register('especie')}
                                className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white placeholder-gray-500 outline-none transition-colors focus:ring-2 focus:ring-emerald-500/40 ${errors.especie
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-gray-700 focus:border-emerald-500'
                                    }`}
                            />
                            {errors.especie && (
                                <p className="mt-1 text-xs text-red-400">{errors.especie.message}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="raza" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Raza *
                            </label>
                            <input
                                id="raza"
                                type="text"
                                placeholder="Ej: Brahman"
                                {...register('raza')}
                                className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white placeholder-gray-500 outline-none transition-colors focus:ring-2 focus:ring-emerald-500/40 ${errors.raza
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-gray-700 focus:border-emerald-500'
                                    }`}
                            />
                            {errors.raza && (
                                <p className="mt-1 text-xs text-red-400">{errors.raza.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Sexo + Peso (2 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="sexo" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Sexo *
                            </label>
                            <select
                                id="sexo"
                                {...register('sexo')}
                                className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white outline-none transition-colors focus:ring-2 focus:ring-emerald-500/40 ${errors.sexo
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-gray-700 focus:border-emerald-500'
                                    }`}
                            >
                                <option value="">Seleccionar...</option>
                                {SEXO_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {errors.sexo && (
                                <p className="mt-1 text-xs text-red-400">{errors.sexo.message}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="peso" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Peso (kg) *
                            </label>
                            <input
                                id="peso"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Ej: 350.50"
                                {...register('peso', { valueAsNumber: true })}
                                className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white placeholder-gray-500 outline-none transition-colors focus:ring-2 focus:ring-emerald-500/40 ${errors.peso
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-gray-700 focus:border-emerald-500'
                                    }`}
                            />
                            {errors.peso && (
                                <p className="mt-1 text-xs text-red-400">{errors.peso.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Fecha Ingreso + Estado (2 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="fecha_ingreso" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Fecha de Ingreso
                            </label>
                            <input
                                id="fecha_ingreso"
                                type="date"
                                {...register('fecha_ingreso')}
                                className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white outline-none transition-colors focus:ring-2 focus:ring-emerald-500/40 ${errors.fecha_ingreso
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-gray-700 focus:border-emerald-500'
                                    }`}
                            />
                            {errors.fecha_ingreso && (
                                <p className="mt-1 text-xs text-red-400">{errors.fecha_ingreso.message}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="estado" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Estado
                            </label>
                            <select
                                id="estado"
                                {...register('estado')}
                                className={`w-full px-4 py-2.5 bg-gray-800 border rounded-lg text-white outline-none transition-colors focus:ring-2 focus:ring-emerald-500/40 ${errors.estado
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-gray-700 focus:border-emerald-500'
                                    }`}
                            >
                                {ESTADO_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {errors.estado && (
                                <p className="mt-1 text-xs text-red-400">{errors.estado.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Info inyectada automáticamente */}
                    <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <p className="text-xs text-gray-500">
                            📌 <span className="text-gray-400">id_finca</span> y{' '}
                            <span className="text-gray-400">id_propietario</span> se inyectan automáticamente desde tu sesión.
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || createAnimalMutation.isPending}
                        className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${isSubmitting || createAnimalMutation.isPending
                                ? 'bg-emerald-800 text-emerald-300 cursor-wait'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-600/20'
                            }`}
                    >
                        {isSubmitting || createAnimalMutation.isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Registrando...
                            </span>
                        ) : (
                            '🐄 Registrar Animal'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
