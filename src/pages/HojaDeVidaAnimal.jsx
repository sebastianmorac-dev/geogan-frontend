import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';
import RoleGuard from '../components/auth/RoleGuard';
import ModalOverlay from '../components/modals/ModalOverlay';

export default function HojaDeVidaAnimal() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    const [loading, setLoading] = useState(true);
    const [historial, setHistorial] = useState([]);
    const [historialSanitario, setHistorialSanitario] = useState([]);
    const [animalData, setAnimalData] = useState(null);
    const [lotes, setLotes] = useState([]);
    const [activeTab, setActiveTab] = useState('pesajes');
    const [showSanitaryModal, setShowSanitaryModal] = useState(false);
    const [showPesoModal, setShowPesoModal] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm();
    const sanitaryForm = useForm();

    const fromFinca = location.state?.fromFinca;
    const fromTab = location.state?.fromTab || 'lotes';
    const fromLote = location.state?.fromLote;
    const nombreFinca = location.state?.nombreFinca || 'Finca Activa';

    const handleVolver = () => {
        navigate('/dashboard', { state: { fromFinca, fromTab, fromLote } });
    };

    // =========================================================================
    // CARGA PARALELA (Promise.all — Mata el "Efecto Eco")
    // =========================================================================
    const fetchDatos = async () => {
        setLoading(true);
        try {
            const [resAnimal, resPesos, resSalud] = await Promise.all([
                api.get(`/animales/${id}`),
                api.get(`/animales/${id}/historial-pesos`),
                api.get(`/animales/${id}/salud`).catch(() => ({ data: [] }))
            ]);

            setAnimalData(resAnimal.data);
            const dataOrdenada = resPesos.data ? [...resPesos.data].sort((a, b) => new Date(a.fecha_pesaje) - new Date(b.fecha_pesaje)) : [];
            setHistorial(dataOrdenada);
            setHistorialSanitario(resSalud.data || []);

            reset({ peso: resAnimal.data.peso, observaciones: '' });

            // Traer los lotes disponibles de la finca del animal
            if (resAnimal.data.id_finca) {
                try {
                    const resLotes = await api.get(`/lotes/finca/${resAnimal.data.id_finca}`);
                    setLotes(resLotes.data || []);
                } catch (e) { console.warn("Módulo de lotes no responde", e); }
            }

        } catch (error) {
            console.error("Error en carga:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (id) fetchDatos(); }, [id]);

    // =========================================================================
    // 🧮 CEREBRO FINANCIERO: Ganancia Media Diaria (GMD)
    // =========================================================================
    const calcularMetricas = (historialPesos, pesoMaestro) => {
        // Si no hay historial suficiente para trazar una curva (menos de 2 pesos)
        if (!historialPesos || historialPesos.length < 2) {
            // Tomamos el único peso del historial, o si está vacío, el peso maestro de la base
            const pesoActual = historialPesos?.length === 1 
                ? historialPesos[0].peso_kg 
                : (pesoMaestro || 0);
                
            return { 
                gmd: "0.000", 
                proyeccion30: Math.round(pesoActual), 
                pesoActual: pesoActual 
            };
        }

        // Ordenados del más reciente al más antiguo (Cero Suposiciones)
        const pesosOrdenados = [...historialPesos].sort((a, b) =>
            new Date(b.fecha_pesaje) - new Date(a.fecha_pesaje)
        );

        const pesoNuevo = pesosOrdenados[0];
        const pesoAnterior = pesosOrdenados[1];
        const kilosGanados = pesoNuevo.peso_kg - pesoAnterior.peso_kg;
        const diasTranscurridos = Math.max(1, (new Date(pesoNuevo.fecha_pesaje) - new Date(pesoAnterior.fecha_pesaje)) / (1000 * 60 * 60 * 24));

        const gmdCalc = kilosGanados / diasTranscurridos;
        const proyeccion = pesoNuevo.peso_kg + (gmdCalc * 30);

        return {
            gmd: gmdCalc.toFixed(3),
            proyeccion30: Math.round(proyeccion),
            pesoActual: pesoNuevo.peso_kg
        };
    };

    // Llamamos a la función inyectándole el historial Y el peso base del animal
    const metricas = calcularMetricas(historial, animalData?.peso);
    const gmdNum = parseFloat(metricas.gmd);
    const sugerenciaVenta = metricas.proyeccion30 >= 450;

    const chartData = historial.map(h => ({
        fecha: new Date(h.fecha_pesaje).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        peso_real: h.peso_kg,
        peso_proyectado: null
    }));

    if (historial.length > 0) {
        chartData[chartData.length - 1].peso_proyectado = chartData[chartData.length - 1].peso_real;
        chartData.push({
            fecha: '+ 30 Días',
            peso_real: null,
            peso_proyectado: metricas.proyeccion30
        });
    }

    // =========================================================================
    // CONTROLADORES DE CAMPO (Lectura + Pesaje + Sanidad)
    // =========================================================================
    const onPesoSubmit = async (data) => {
        try {
            await api.post(`/animales/${id}/pesaje`, {
                id_animal: parseInt(id),
                peso_kg: parseFloat(data.peso),
                fecha_pesaje: new Date().toISOString().split('T')[0],
                observaciones: data.observaciones,
                creado_por: user?.id_usuario
            });
            setShowPesoModal(false);
            fetchDatos();
        } catch (err) { alert("Error al guardar novedad"); }
    };

    const onSanitarySubmit = async (data) => {
        try {
            await api.post(`/animales/${id}/salud`, {
                ...data,
                id_animal: parseInt(id),
                fecha_aplicacion: new Date().toISOString().split('T')[0]
            });
            setShowSanitaryModal(false);
            fetchDatos();
        } catch (err) { alert("Error al registrar sanidad"); }
    };

    const eliminarPeso = async (id_peso) => {
        if (!window.confirm("Alerta de Auditoría: ¿Estás seguro de eliminar este registro de campo?")) return;
        try {
            await api.delete(`/animales/pesaje/${id_peso}`);
            fetchDatos();
        } catch (error) { alert("El backend requiere habilitar la ruta DELETE para pesajes."); }
    };

    const editarPeso = (registro) => {
        setValue('peso', registro.peso_kg);
        setValue('observaciones', registro.observaciones || '');
        setShowPesoModal(true);
    };

    const registroActivo = historialSanitario?.length > 0 ? historialSanitario.find(s => {
        const fechaFin = new Date(s.fecha_aplicacion);
        fechaFin.setDate(fechaFin.getDate() + (s.dias_retiro || 0));
        return new Date() < fechaFin;
    }) : null;

    if (loading) return (
        <div className="min-h-screen bg-[#F4F6F4] font-sans antialiased">
            <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-[#E6F4D7] h-24 px-12 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <img src={logo} alt="GeoGan" style={{ height: '140px', margin: '-30px 0' }} />
                    <div className="h-8 w-px bg-[#E6F4D7]"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
            </header>
            <main className="mt-32 px-12 pb-20 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-10 animate-pulse">
                {/* Esqueleto Sidebar */}
                <aside className="w-full lg:w-[450px] bg-white rounded-[40px] p-12 shadow-sm border border-[#E6F4D7] space-y-6">
                    <div className="h-6 bg-[#E6F4D7] rounded-lg w-1/3"></div>
                    <div className="h-12 bg-gray-200 rounded-xl w-2/3"></div>
                    <div className="space-y-3">
                        <div className="h-16 bg-[#F4F6F4] rounded-2xl"></div>
                        <div className="h-16 bg-[#F4F6F4] rounded-2xl"></div>
                        <div className="h-16 bg-[#F4F6F4] rounded-2xl"></div>
                    </div>
                    <div className="h-14 bg-[#8CB33E]/30 rounded-2xl mt-6"></div>
                </aside>
                {/* Esqueleto Contenido Principal */}
                <div className="flex-1 flex flex-col gap-10">
                    <div className="bg-white rounded-[40px] p-12 border border-[#E6F4D7] shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-5 bg-gray-200 rounded-lg w-1/3"></div>
                            <div className="flex gap-4">
                                <div className="h-20 w-40 bg-red-50 rounded-3xl"></div>
                                <div className="h-20 w-40 bg-[#11261F]/20 rounded-3xl"></div>
                                <div className="h-20 w-40 bg-[#E6F4D7] rounded-3xl"></div>
                            </div>
                        </div>
                        <div className="h-[300px] bg-[#F4F6F4] rounded-3xl"></div>
                    </div>
                    <div className="bg-white rounded-[40px] p-12 border border-[#E6F4D7] shadow-sm">
                        <div className="h-14 bg-[#F9FBFA] rounded-[20px] mb-8"></div>
                        <div className="space-y-4">
                            <div className="h-12 bg-[#F4F6F4] rounded-xl"></div>
                            <div className="h-12 bg-[#F4F6F4] rounded-xl"></div>
                            <div className="h-12 bg-[#F4F6F4] rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F4F6F4] font-sans text-[#11261F] antialiased">

            <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-[#E6F4D7] h-24 px-12 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <img src={logo} alt="GeoGan" style={{ height: '140px', margin: '-30px 0' }} />
                    <div className="h-8 w-px bg-[#E6F4D7]"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#8CB33E]">{nombreFinca}</p>
                </div>
                <button onClick={handleVolver} className="w-12 h-12 rounded-2xl bg-[#F9FBFA] border-2 border-[#E6F4D7] flex items-center justify-center hover:bg-red-50 transition-all text-xl">✕</button>
            </header>

            <main className="mt-32 px-12 pb-20 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-10">

                <aside className="w-full lg:w-[450px] bg-white rounded-[40px] p-12 shadow-sm border border-[#E6F4D7] lg:sticky lg:top-32 h-fit">
                    {/* 1. ENCABEZADO: ID y Sexo */}
                    <div className="mb-10 flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8CB33E] mb-2">Hoja de Vida</p>
                            <h2 className="text-5xl font-black tracking-tighter uppercase">{animalData?.codigo_identificacion || '---'}</h2>
                        </div>
                        <div className="bg-[#F9FBFA] border border-[#E6F4D7] px-4 py-2 rounded-2xl">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Sexo</p>
                            <p className="font-black text-[#11261F] text-sm text-center">{animalData?.sexo === 'M' ? '♂ MACHO' : '♀ HEMBRA'}</p>
                        </div>
                    </div>

                    {/* 2. DATOS BÁSICOS (Solo Lectura) */}
                    <div className="space-y-3 mb-10">
                        <div className="bg-[#F9FBFA] border border-[#E6F4D7] p-5 rounded-2xl flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lote Actual</span>
                            <span className="font-black text-[#11261F] text-sm uppercase">{lotes.find(l => l.id_lote === animalData?.id_lote)?.nombre || 'GENERAL'}</span>
                        </div>
                        <div className="bg-white border border-[#E6F4D7] p-5 rounded-2xl flex justify-between items-center shadow-sm">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Raza</span>
                            <span className="font-black text-[#11261F] text-sm uppercase">{animalData?.raza || 'Brahman'}</span>
                        </div>
                        <div className="bg-white border border-[#E6F4D7] p-5 rounded-2xl flex justify-between items-center shadow-sm">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</span>
                            <span className="font-black text-[#11261F] text-sm uppercase">{animalData?.estado || 'activo'}</span>
                        </div>
                    </div>

                    {/* 3. BOTONES DE ACCIÓN */}
                    <div className="space-y-4 mt-8 pt-8 border-t border-dashed border-[#E6F4D7]">
                        {/* Cualquier operario puede pesar al animal */}
                        <button
                            onClick={() => setShowPesoModal(true)}
                            className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#11261F] transition-all shadow-lg">
                            + Registrar Peso / Novedad
                        </button>

                        {/* RBAC: Solo Admins y Propietarios pueden acceder al formulario de edición */}
                        <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                            <button
                                onClick={() => navigate(`/animales/editar/${id}`, { state: { fromFinca, fromTab, fromLote, nombreFinca } })}
                                className="w-full bg-white border-2 border-[#E6F4D7] text-gray-500 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:border-[#8CB33E] hover:text-[#11261F] transition-all">
                                ⚙️ Editar Perfil Base
                            </button>
                        </RoleGuard>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col gap-10">

                    <section className="bg-white rounded-[40px] p-12 border border-[#E6F4D7] shadow-sm overflow-hidden">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-[#11261F] mb-4">Curva de Crecimiento & Proyección</h3>
                                {sugerenciaVenta && (
                                    <span className="bg-green-50 text-[#8CB33E] border border-[#8CB33E] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        ✓ Punto Óptimo de Venta Alcanzado
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <div className={`px-6 py-4 rounded-3xl text-right shadow-sm border ${gmdNum > 0.6 ? 'bg-[#F4F6F4] border-[#E6F4D7]' : 'bg-red-50 border-red-100'}`}>
                                    <p className={`text-[9px] font-black uppercase mb-1 tracking-widest ${gmdNum > 0.6 ? 'text-[#8CB33E]' : 'text-red-500'}`}>
                                        GMD (Ganancia Diaria)
                                    </p>
                                    <p className={`text-2xl font-black tabular-nums ${gmdNum > 0.6 ? 'text-[#11261F]' : 'text-red-700'}`}>
                                        {metricas.gmd} KG/Día
                                    </p>
                                </div>
                                <div className="bg-[#11261F] px-6 py-4 rounded-3xl text-right shadow-lg">
                                    <p className="text-[9px] font-black text-[#8CB33E] uppercase mb-1 tracking-widest">Proyección 30D</p>
                                    <p className="text-2xl font-black text-white tabular-nums">{metricas.proyeccion30} KG</p>
                                </div>
                                <div className="bg-[#E6F4D7] px-6 py-4 rounded-3xl text-right border border-[#8CB33E]/30">
                                    <p className="text-[9px] font-black text-[#11261F] uppercase mb-1 tracking-widest">Actual</p>
                                    <p className="text-2xl font-black text-[#11261F] tabular-nums">{metricas.pesoActual} KG</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorGeo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8CB33E" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8CB33E" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F6F4" />
                                    <XAxis dataKey="fecha" tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis orientation="right" tick={{ fill: '#11261F', fontSize: 13, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: '900' }} />

                                    <Area type="monotone" dataKey="peso_real" stroke="#11261F" strokeWidth={6} fill="url(#colorGeo)" />
                                    <Area type="monotone" dataKey="peso_proyectado" stroke="#8CB33E" strokeWidth={4} strokeDasharray="8 8" fill="none" />

                                    {chartData.length > 0 && <ReferenceDot x={chartData[chartData.length - 1].fecha} y={chartData[chartData.length - 1].peso_proyectado} r={6} fill="#8CB33E" stroke="white" strokeWidth={3} />}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="bg-white rounded-[40px] border border-[#E6F4D7] shadow-sm overflow-hidden">
                        <div className="flex bg-[#F9FBFA] border-b border-[#E6F4D7] p-3">
                            <button onClick={() => setActiveTab('pesajes')} className={`flex-1 py-5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'pesajes' ? 'bg-[#11261F] text-white shadow-lg' : 'text-gray-400'}`}>Control de Pesos</button>
                            <button onClick={() => setActiveTab('salud')} className={`flex-1 py-5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'salud' ? 'bg-[#11261F] text-white shadow-lg' : 'text-gray-400'}`}>Sanidad y Retiro</button>
                        </div>

                        <div className="p-12">
                            {activeTab === 'pesajes' && (
                                <table className="w-full text-left">
                                    <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b-2 border-[#F4F6F4]">
                                        <tr>
                                            <th className="pb-6">Fecha</th>
                                            <th className="pb-6 text-center">Peso (KG)</th>
                                            <th className="pb-6">Novedades</th>
                                            <th className="pb-6 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F4F6F4]">
                                        {[...historial].reverse().map((h, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-all">
                                                <td className="py-5 font-black text-sm text-gray-600 uppercase">{new Date(h.fecha_pesaje).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
                                                <td className="py-5 font-black text-xl text-center tabular-nums">{h.peso_kg} KG</td>
                                                <td className="py-5 font-bold text-sm text-gray-400 italic">{h.observaciones || '---'}</td>
                                                <td className="py-5 text-right flex justify-end">
                                                    <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin', 'encargado']}>
                                                        <button onClick={() => editarPeso(h)} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all mr-2">Editar</button>
                                                    </RoleGuard>
                                                    <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                                                        <button onClick={() => eliminarPeso(h.id_peso)} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-all">Eliminar</button>
                                                    </RoleGuard>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'salud' && (
                                <div className="space-y-8">
                                    {registroActivo && (
                                        <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[36px] flex items-center gap-8 animate-pulse">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-red-200">🛡️</div>
                                            <div>
                                                <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Alerta: Retiro Activo</p>
                                                <p className="text-lg font-bold text-[#11261F] leading-tight italic">Animal en tratamiento con {registroActivo.medicamento}. NO APTO PARA VENTA.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {historialSanitario.map((s, i) => (
                                            <div key={i} className="p-8 bg-[#F4F6F4] rounded-[32px] border border-[#E6F4D7] relative group">
                                                <p className="text-[10px] font-black text-[#8CB33E] uppercase mb-2">{s.fecha_aplicacion}</p>
                                                <p className="text-xl font-black">{s.medicamento}</p>
                                                <div className="flex justify-between mt-4">
                                                    <span className="text-[9px] font-black bg-white px-3 py-1 rounded-full uppercase text-gray-500">Retiro: {s.dias_retiro}d</span>
                                                    <span className="text-[9px] font-black bg-[#11261F] text-white px-3 py-1 rounded-full uppercase">Vía: {s.via_aplicacion}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setShowSanitaryModal(true)} className="w-full border-2 border-dashed border-[#E6F4D7] py-10 rounded-[36px] text-gray-400 font-black uppercase text-xs tracking-widest hover:border-[#8CB33E] transition-all">+ Registrar Aplicación Sanitaria</button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {/* ========================================================================= */}
            {/* 🩺 MODAL: APLICACIÓN SANITARIA                                             */}
            {/* ========================================================================= */}
            {showSanitaryModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#11261F]/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-[650px] rounded-[48px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-[#11261F]">Certificar Aplicación</h3>
                            <button onClick={() => setShowSanitaryModal(false)} className="text-gray-400 hover:text-red-500 text-2xl">✕</button>
                        </div>
                        <form onSubmit={sanitaryForm.handleSubmit(onSanitarySubmit)} className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Medicamento</label>
                                    <input {...sanitaryForm.register('medicamento')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: Ivermectina" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Días de Retiro</label>
                                    <input type="number" {...sanitaryForm.register('dias_retiro')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: 28" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Vía de Aplicación</label>
                                    <select {...sanitaryForm.register('via_aplicacion')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                                        <option value="Subcutánea">Subcutánea</option>
                                        <option value="Intramuscular">Intramuscular</option>
                                        <option value="Oral">Oral</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Motivo</label>
                                    <input {...sanitaryForm.register('motivo')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: Control de parásitos" required />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-[#11261F] text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-widest hover:bg-[#8CB33E] transition-all shadow-xl">Guardar Certificación</button>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ⚖️ MODAL: REGISTRAR PESO / NOVEDAD                                        */}
            {/* ========================================================================= */}
            <ModalOverlay isOpen={showPesoModal} onClose={() => setShowPesoModal(false)} title="NUEVO PESAJE DE CAMPO" maxWidth="sm">
                <form onSubmit={handleSubmit(async (data) => {
                    await onPesoSubmit(data);
                })} className="space-y-6">

                    <div className="bg-[#F4F6F4] rounded-[32px] p-8 text-center border-2 border-[#E6F4D7] focus-within:border-[#8CB33E] transition-all">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Peso en Báscula (KG)</label>
                        <input
                            type="number" step="0.01"
                            {...register('peso', { required: true })}
                            className="w-full bg-transparent border-none p-0 text-6xl font-black text-[#11261F] focus:ring-0 outline-none tabular-nums text-center"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-gray-500 ml-2 tracking-widest">Observaciones en Corral</label>
                        <textarea
                            {...register('observaciones')}
                            rows="3"
                            className="w-full bg-[#F4F6F4] border-2 border-[#E6F4D7] rounded-[24px] p-5 text-sm font-bold text-[#11261F] outline-none focus:border-[#8CB33E] resize-none"
                            placeholder="Ej: Animal con leve cojera, o sin apetito..."
                        ></textarea>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#8CB33E] text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#11261F] transition-all active:scale-95">
                        {isSubmitting ? 'Guardando...' : 'Guardar Pesaje'}
                    </button>
                </form>
            </ModalOverlay>
        </div>
    );
}
