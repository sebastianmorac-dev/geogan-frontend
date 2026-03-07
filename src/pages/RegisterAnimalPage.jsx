import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useAuthStore from '../store/authStore';
import useAnimales from '../store/useAnimales';
import { animalSchema, SEXO_OPTIONS, ESTADO_OPTIONS, RAZA_OPTIONS } from '../schemas/animalSchema';
import api from '../api/client';
import logo from '../assets/logo_geogan.png';

export default function RegisterAnimalPage() {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();

    const selectedFinca = useAnimales((state) => state.selectedFinca);
    const setSelectedFinca = useAnimales((state) => state.setSelectedFinca);
    const addAnimal = useAnimales((state) => state.addAnimal);
    const storeLoading = useAnimales((state) => state.loading);
    const clearError = useAnimales((state) => state.clearError);

    const [successMsg, setSuccessMsg] = useState('');
    const [serverError, setServerError] = useState('');
    const [fincasData, setFincasData] = useState([]);
    const [loadingFincas, setLoadingFincas] = useState(true);

    useEffect(() => {
        const fetchFincas = async () => {
            try {
                const response = await api.get('/fincas/');
                setFincasData(response.data);
            } catch (err) {
                console.error("Error al cargar fincas:", err);
            } finally {
                setLoadingFincas(false);
            }
        };
        fetchFincas();
    }, []);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(animalSchema),
        defaultValues: {
            codigo_identificacion: '',
            especie: 'Bovino',
            raza: '',
            sexo: '',
            peso: '',
            fecha_ingreso: new Date().toISOString().split('T')[0],
            estado: 'activo',
        },
    });

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const onSubmit = async (data) => {
        setServerError('');
        setSuccessMsg('');
        clearError();

        if (!selectedFinca) {
            setServerError('Por favor, selecciona una finca de la lista.');
            return;
        }

        const fincaSeleccionada = fincasData.find(f => f.id_finca === selectedFinca);
        if (!fincaSeleccionada) {
            setServerError('Error al identificar la finca seleccionada.');
            return;
        }

        try {
            // CORRECCIÓN CLAVE: Mapeo exacto para evitar error 422
            await addAnimal({
                codigo_identificacion: data.codigo_identificacion,
                especie: data.especie,
                raza: data.raza, // Debe ser una de las permitidas por el backend
                sexo: data.sexo,
                peso: parseFloat(data.peso), // Backend espera "peso" como número
                fecha_ingreso: data.fecha_ingreso,
                estado: data.estado,
                id_finca: selectedFinca,
                id_propietario: fincaSeleccionada.id_propietario,
            });

            setSuccessMsg(`✅ Animal "${data.codigo_identificacion}" registrado con éxito`);
            reset();
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (error) {
            const detail = error.response?.data?.detail;
            // Manejo de errores de validación de FastAPI
            setServerError(Array.isArray(detail) ? `${detail[0].loc[1]}: ${detail[0].msg}` : detail || 'Error al registrar.');
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-black antialiased">
            {/* Header: Logo en h-30 (Tamaño 30) para máxima identidad */}
            <header className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 h-28 px-10 flex justify-between items-center shadow-sm">
                <div className="flex items-center min-w-[300px]">
                    <img src={logo} alt="GeoGan" className="h-30 w-auto object-contain filter contrast-125" />
                </div>
                <div className="flex items-center gap-10">
                    <div className="hidden sm:block text-right border-r border-gray-100 pr-8">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-black mb-1">Censo Digital</p>
                        <p className="text-base font-black text-black uppercase">{user?.nombre}</p>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="text-xs font-black text-black hover:text-[#1A3D2F] transition-colors uppercase tracking-widest border-b-2 border-black pb-1">
                        VOLVER
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto pt-40 pb-20 px-6">
                {successMsg && <div className="mb-8 p-6 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-black text-sm uppercase tracking-wider">{successMsg}</div>}
                {serverError && <div className="mb-8 p-6 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-800 font-black text-sm uppercase tracking-wider italic">{serverError}</div>}

                <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50/50 px-12 py-10 border-b border-gray-100">
                        <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Crear Hoja de Vida Animal</h2>
                        <p className="text-xs font-black text-black uppercase tracking-[0.2em] mt-2">Apertura de registro técnico y productivo</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-12 space-y-10">
                        <div className="space-y-3">
                            <label className="block text-xs font-black text-black uppercase tracking-[0.2em]">Finca de Destino *</label>
                            <select
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-lg font-black text-black outline-none focus:border-[#1A3D2F] transition-all appearance-none cursor-pointer"
                                value={selectedFinca || ''}
                                onChange={(e) => setSelectedFinca(e.target.value ? parseInt(e.target.value, 10) : null)}
                            >
                                <option value="">Seleccionar finca...</option>
                                {fincasData.map((f) => <option key={f.id_finca} value={f.id_finca}>{f.nombre.toUpperCase()}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-black uppercase tracking-[0.2em]">Código Visual (ID) *</label>
                                <input type="text" placeholder="EJ: BOV-001" {...register('codigo_identificacion')} className={`w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-lg font-black outline-none transition-all placeholder:text-black/20 ${errors.codigo_identificacion ? 'border-red-500' : 'border-gray-100 focus:border-[#1A3D2F]'}`} />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-black text-black uppercase tracking-[0.2em]">Peso Inicial (KG) *</label>
                                <input type="number" step="0.01" placeholder="0.00" {...register('peso', { valueAsNumber: true })} className={`w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-lg font-black outline-none transition-all placeholder:text-black/20 ${errors.peso ? 'border-red-500' : 'border-gray-100 focus:border-[#1A3D2F]'}`} />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-black text-black uppercase tracking-[0.2em]">Especie *</label>
                                <input type="text" {...register('especie')} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-lg font-black text-black outline-none focus:border-[#1A3D2F]" />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-black text-black uppercase tracking-[0.2em]">Raza *</label>
                                <select {...register('raza')} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-lg font-black text-black outline-none focus:border-[#1A3D2F] appearance-none cursor-pointer">
                                    <option value="">Seleccionar raza...</option>
                                    {RAZA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-black text-black uppercase tracking-[0.2em]">Sexo *</label>
                                <select {...register('sexo')} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-lg font-black text-black outline-none focus:border-[#1A3D2F] appearance-none cursor-pointer">
                                    <option value="">Seleccionar...</option>
                                    {SEXO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-black text-black uppercase tracking-[0.2em]">Estado Operativo *</label>
                                <select {...register('estado')} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-lg font-black text-black outline-none focus:border-[#1A3D2F] appearance-none cursor-pointer">
                                    {ESTADO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting || storeLoading} className="w-full py-6 rounded-2xl font-black text-sm uppercase tracking-[0.4em] bg-[#1A3D2F] text-white hover:bg-[#234d3c] shadow-xl transition-all disabled:opacity-50">
                                {isSubmitting || storeLoading ? 'PROCESANDO...' : 'CREAR HOJA DE VIDA'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}