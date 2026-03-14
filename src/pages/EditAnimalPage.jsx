import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';

export default function EditAnimalPage() {
    const { id_animal } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    const [loading, setLoading] = useState(true);
    const [historial, setHistorial] = useState([]);
    const [historialSanitario, setHistorialSanitario] = useState([]);
    const [animalData, setAnimalData] = useState(null);
    const [lotes, setLotes] = useState([]); // NUEVO: Estado para los lotes
    const [activeTab, setActiveTab] = useState('pesajes');
    const [showSanitaryModal, setShowSanitaryModal] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm();
    const sanitaryForm = useForm();

    const fromFinca = location.state?.fromFinca;
    const fromTab = location.state?.fromTab || 'lotes';
    const fromLote = location.state?.fromLote;
    const nombreFinca = location.state?.nombreFinca || 'Finca Activa';

    const handleVolver = () => {
        navigate('/dashboard', { state: { fromFinca, fromTab, fromLote } });
    };

    const fetchDatos = async () => {
        try {
            const [resAnimal, resHistorial] = await Promise.all([
                api.get(`/animales/${id_animal}`),
                api.get(`/animales/${id_animal}/historial-pesos`)
            ]);
            setAnimalData(resAnimal.data);
            const dataOrdenada = resHistorial.data ? [...resHistorial.data].sort((a, b) => new Date(a.fecha_pesaje) - new Date(b.fecha_pesaje)) : [];
            setHistorial(dataOrdenada);

            reset({ peso: resAnimal.data.peso, observaciones: '' });

            // NUEVO: Traer los lotes disponibles de la finca del animal
            if (resAnimal.data.id_finca) {
                try {
                    const resLotes = await api.get(`/lotes/finca/${resAnimal.data.id_finca}`);
                    setLotes(resLotes.data || []);
                } catch (e) { console.warn("Módulo de lotes no responde", e); }
            }

            try {
                const resSalud = await api.get(`/animales/${id_animal}/salud`);
                setHistorialSanitario(resSalud.data || []);
            } catch (e) { setHistorialSanitario([]); }

            setLoading(false);
        } catch (err) { setLoading(false); }
    };

    useEffect(() => { if (id_animal) fetchDatos(); }, [id_animal]);

    // =========================================================================
    // INTELIGENCIA DE NEGOCIO Y PROYECCIONES
    // =========================================================================
    let pesoActual = animalData?.peso || 0;
    let pesoProyectado = pesoActual;
    let gmdReal = 0;

    if (historial.length > 1) {
        const ultimo = historial[historial.length - 1];
        const penultimo = historial[historial.length - 2];
        const dias = (new Date(ultimo.fecha_pesaje) - new Date(penultimo.fecha_pesaje)) / (1000 * 60 * 60 * 24);
        if (dias > 0) {
            gmdReal = (ultimo.peso_kg - penultimo.peso_kg) / dias;
            pesoProyectado = Math.round(pesoActual + (gmdReal * 30));
        }
    }

    const sugerenciaVenta = pesoProyectado >= 450;

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
            peso_proyectado: pesoProyectado
        });
    }

    // =========================================================================
    // CONTROLADORES DE BASE DE DATOS
    // =========================================================================
    const onPesoSubmit = async (data) => {
        try {
            await api.post(`/animales/${id_animal}/pesaje`, {
                id_animal: parseInt(id_animal),
                peso_kg: parseFloat(data.peso),
                fecha_pesaje: new Date().toISOString().split('T')[0],
                observaciones: data.observaciones,
                creado_por: user?.id_usuario
            });
            handleVolver();
        } catch (err) { alert("Error al guardar novedad"); }
    };

    const onSanitarySubmit = async (data) => {
        try {
            await api.post(`/animales/${id_animal}/salud`, {
                ...data,
                id_animal: parseInt(id_animal),
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
        alert("Modifica los datos en el panel izquierdo y guarda. (Nota: Esto creará un nuevo registro con fecha de hoy según la política de trazabilidad).");
    };

    // NUEVO: Controlador para mover al animal de lote
    const onChangeLote = async (e) => {
        const nuevoIdLote = e.target.value ? parseInt(e.target.value) : null;
        try {
            await api.put(`/animales/${id_animal}/lote`, { id_lote: nuevoIdLote });
            fetchDatos(); // Recargamos para ver el cambio reflejado
        } catch (error) {
            alert("Error al mover el animal de lote.");
        }
    };

    const registroActivo = historialSanitario?.length > 0 ? historialSanitario.find(s => {
        const fechaFin = new Date(s.fecha_aplicacion);
        fechaFin.setDate(fechaFin.getDate() + (s.dias_retiro || 0));
        return new Date() < fechaFin;
    }) : null;

    if (loading) return <div className="min-h-screen bg-[#F4F6F4] flex items-center justify-center font-black text-[#11261F] animate-pulse uppercase tracking-widest text-xl">Sincronizando GeoGan...</div>;

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

                    <form onSubmit={handleSubmit(onPesoSubmit)} className="space-y-8">
                        <div className="p-8 bg-[#F4F6F4] rounded-[32px] border-2 border-[#E6F4D7]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 block">Peso Registrado (KG)</label>
                            <input type="number" step="0.01" {...register('peso')} className="w-full bg-transparent border-none p-0 text-6xl font-black text-[#11261F] focus:ring-0 outline-none tabular-nums" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* NUEVO: SELECTOR DE LOTE INTERACTIVO */}
                            <div className="bg-[#11261F] p-5 rounded-2xl shadow-sm relative group cursor-pointer border border-transparent hover:border-[#8CB33E] transition-all">
                                <p className="text-[9px] font-black text-[#8CB33E] uppercase tracking-widest">Lote Actual</p>
                                <select
                                    value={animalData?.id_lote || ''}
                                    onChange={onChangeLote}
                                    className="w-full bg-transparent text-white font-black text-xs uppercase mt-1 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="" className="text-black">GENERAL</option>
                                    {lotes.map(lote => (
                                        <option key={lote.id_lote} value={lote.id_lote} className="text-black">
                                            {lote.nombre}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 mt-1 pointer-events-none text-[#8CB33E] text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">▼</div>
                            </div>

                            <div className="bg-white border border-[#E6F4D7] p-5 rounded-2xl shadow-sm">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Raza</p>
                                <p className="font-black text-[#11261F] text-xs uppercase mt-1">{animalData?.raza || 'Brahman'}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-gray-500 ml-2 tracking-widest">Novedades en Campo</label>
                            <textarea {...register('observaciones')} rows="4" className="w-full bg-[#F4F6F4] border-2 border-[#E6F4D7] rounded-[28px] p-6 text-base font-bold text-[#11261F] outline-none focus:border-[#8CB33E] transition-all resize-none" placeholder="¿Cómo está el animal hoy?"></textarea>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-[#8CB33E] text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-lg hover:bg-[#11261F] transition-all active:scale-95">
                            {isSubmitting ? 'Guardando...' : 'Guardar Novedad'}
                        </button>
                    </form>
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
                                <div className="bg-[#11261F] px-6 py-4 rounded-3xl text-right shadow-lg">
                                    <p className="text-[9px] font-black text-[#8CB33E] uppercase mb-1 tracking-widest">Proyección 30D</p>
                                    <p className="text-2xl font-black text-white tabular-nums">{pesoProyectado} KG</p>
                                </div>
                                <div className="bg-[#E6F4D7] px-6 py-4 rounded-3xl text-right border border-[#8CB33E]/30">
                                    <p className="text-[9px] font-black text-[#11261F] uppercase mb-1 tracking-widest">Actual</p>
                                    <p className="text-2xl font-black text-[#11261F] tabular-nums">{pesoActual} KG</p>
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
                                                <td className="py-5 text-right">
                                                    <button onClick={() => editarPeso(h)} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all mr-2">Editar</button>
                                                    <button onClick={() => eliminarPeso(h.id_peso)} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-all">Eliminar</button>
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
        </div>
    );
}