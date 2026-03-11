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
    const [animalData, setAnimalData] = useState(null);
    const [activeTab, setActiveTab] = useState('pesajes');
    const [selectedPoint, setSelectedPoint] = useState(null);

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
    const fromFinca = location.state?.fromFinca;

    useEffect(() => {
        const fetchDatos = async () => {
            setLoading(true);
            try {
                const [resAnimal, resHistorial] = await Promise.all([
                    api.get(`/animales/${id_animal}`),
                    api.get(`/animales/${id_animal}/historial-pesos`)
                ]);
                setAnimalData(resAnimal.data);
                const dataOrdenada = resHistorial.data ? [...resHistorial.data].sort((a, b) => new Date(a.fecha_pesaje) - new Date(b.fecha_pesaje)) : [];
                setHistorial(dataOrdenada);
                reset(resAnimal.data);
                setLoading(false);
            } catch (err) {
                console.error("Fallo Sync GeoGan:", err);
                setLoading(false);
            }
        };
        if (id_animal) fetchDatos();
    }, [id_animal, reset]);

    const onSubmit = async (data) => {
        try {
            const hoy = new Date().toISOString().split('T')[0];
            await api.post(`/animales/${id_animal}/pesaje`, {
                id_animal: parseInt(id_animal),
                peso_kg: parseFloat(data.peso),
                fecha_pesaje: hoy,
                observaciones: data.observaciones,
                creado_por: user?.id_usuario
            });
            await api.put(`/animales/${id_animal}`, {
                peso: parseFloat(data.peso),
                estado: data.estado,
                fecha_proximo_pesaje: data.fecha_proximo_pesaje,
                observaciones: data.observaciones
            });
            window.location.reload();
        } catch (err) { alert("Error en persistencia GeoGan"); }
    };

    const minP = historial.length > 0 ? Math.min(...historial.map(h => h.peso_kg)) : 0;
    const maxP = 223;
    const dataConProyeccion = [...historial];
    if (historial.length > 0) {
        dataConProyeccion.push({ fecha_pesaje: '2026-04-07', peso_kg: 223, isProyeccion: true });
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-[#1A3D2F] animate-pulse uppercase tracking-widest">Sincronizando GeoGan...</div>;

    return (
        <div className="min-h-screen bg-[#F9FBFA] font-sans text-[#11261F] antialiased pb-20 relative">

            <header className="sticky top-0 z-50 w-full bg-white border-b border-[#E6F4D7] h-28 px-10 flex justify-between items-center shadow-sm">
                <img src={logo} alt="GeoGan" className="h-30 w-auto object-contain" />
                <button onClick={() => navigate('/dashboard', { state: { selectedFincaId: fromFinca } })} className="text-[11px] font-black uppercase tracking-widest text-[#8CB33E] border-2 border-[#8CB33E] px-8 py-3 rounded-full hover:bg-[#8CB33E] hover:text-white transition-all active:scale-95 shadow-sm">VOLVER A LA FINCA</button>
            </header>

            <main className="max-w-[1600px] mx-auto p-8 flex flex-col lg:flex-row gap-8 items-start">
                <aside className="w-full lg:w-[380px] bg-white rounded-[40px] p-8 shadow-xl border border-[#E6F4D7] lg:sticky lg:top-36 shrink-0">
                    <div className="mb-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8CB33E] mb-1">Activo Biológico</p>
                        <h2 className="text-4xl font-black text-[#11261F]">{animalData?.codigo_identificacion || '987'}</h2>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="p-5 bg-[#F9FBFA] rounded-3xl border border-[#E6F4D7]">
                            <label className="text-[10px] font-black uppercase text-[#11261F]">Peso (KG)</label>
                            <input type="number" step="0.01" {...register('peso')} className="w-full bg-transparent border-none p-0 text-5xl font-black text-[#1A3D2F] focus:ring-0 tabular-nums" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#1A3D2F] p-4 rounded-2xl shadow-sm"><p className="text-[9px] font-black text-[#8CB33E] uppercase tracking-widest">Lote</p><p className="text-white font-black text-xs uppercase">{animalData?.lote_nombre || 'ENGORDE-NORTE'}</p></div>
                            <div className="bg-[#F9FBFA] border border-[#E6F4D7] p-4 rounded-2xl shadow-sm"><p className="text-[9px] font-black text-[#4B5563] uppercase tracking-widest">Sexo</p><p className="font-black text-[#11261F] text-xs uppercase">{animalData?.sexo === 'M' ? 'MACHO' : 'HEMBRA'}</p></div>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-[#11261F] text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg hover:bg-[#8CB33E] transition-all">GUARDAR CAMBIOS</button>
                    </form>
                </aside>

                <div className="flex-1 flex flex-col gap-8">
                    <section className="flex-none bg-white rounded-[40px] p-8 border border-[#E6F4D7] flex flex-col shadow-sm overflow-hidden">
                        <div className="flex flex-wrap justify-between items-start mb-6 gap-4 shrink-0">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#11261F]">Evolución y Proyección 30D</h3>
                            <div className="flex gap-3">
                                <div className="bg-[#11261F] px-5 py-3 rounded-3xl text-right shadow-lg"><p className="text-[8px] font-black text-[#8CB33E] uppercase mb-1">PROYECTADO</p><p className="text-xl font-black text-white">223 KG</p></div>
                                <div className="bg-[#E6F4D7] px-5 py-3 rounded-3xl text-right"><p className="text-[8px] font-black text-[#11261F] uppercase mb-1">ACTUAL</p><p className="text-xl font-black text-[#1A3D2F]">{animalData?.peso} KG</p></div>
                            </div>
                        </div>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dataConProyeccion} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                                    <defs><linearGradient id="colorGeo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8CB33E" stopOpacity={0.3} /><stop offset="95%" stopColor="#8CB33E" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6F4D7" />
                                    <XAxis dataKey="fecha_pesaje" tick={{ fill: '#4B5563', fontSize: 10 }} tickFormatter={(str) => new Date(str).toLocaleDateString('es-ES', { month: 'short' })} dy={10} />
                                    <YAxis orientation="right" domain={[minP - 10, maxP + 10]} tick={{ fill: '#11261F', fontSize: 11, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '20px', border: '2px solid #8CB33E' }} />
                                    <Area type="monotone" dataKey="peso_kg" stroke="#11261F" strokeWidth={5} fill="url(#colorGeo)" strokeDasharray={(d) => d?.isProyeccion ? "5 5" : "0"} />
                                    {selectedPoint && <ReferenceDot x={selectedPoint.fecha_pesaje} y={selectedPoint.peso_kg} r={8} fill="#8CB33E" stroke="white" strokeWidth={3} />}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="flex-1 bg-white rounded-[40px] p-10 border border-[#E6F4D7] flex flex-col shadow-sm">
                        <div className="flex gap-10 mb-10 border-b border-[#E6F4D7] pb-0 shrink-0 overflow-x-auto no-scrollbar">
                            {['pesajes', 'salud', 'nutricion'].map((tab) => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`text-[12px] font-black uppercase tracking-[0.2em] pb-4 transition-all border-b-4 ${activeTab === tab ? 'border-[#8CB33E] text-[#11261F]' : 'border-transparent text-[#11261F]/40 hover:text-[#11261F]'}`}>
                                    {tab === 'pesajes' ? 'HISTORIAL PESAJES' : tab === 'salud' ? 'SALUD Y RETIRO' : 'NUTRICIÓN Y DIETA'}
                                </button>
                            ))}
                        </div>

                        <div className="animate-in fade-in duration-500 pb-10">
                            {activeTab === 'pesajes' && (
                                <div className="space-y-8">
                                    <h4 className="text-[12px] font-black text-[#11261F] uppercase tracking-widest italic">Auditoría de Crecimiento</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                                        {historial.length > 0 ? [...historial].reverse().map((h, i) => (
                                            <div key={i} onClick={() => setSelectedPoint(h)} className={`cursor-pointer transition-all border-2 p-6 rounded-[32px] border-l-[12px] shadow-sm hover:scale-[1.02] ${selectedPoint?.fecha_pesaje === h.fecha_pesaje ? 'border-[#8CB33E] bg-[#E6F4D7]/10' : 'border-[#E6F4D7] bg-[#F9FBFA] border-l-[#8CB33E]'}`}>
                                                <p className="text-[10px] font-black text-[#4B5563] uppercase mb-2 tracking-widest">{new Date(h.fecha_pesaje).toLocaleDateString()}</p>
                                                <p className="text-3xl font-black text-[#11261F] tabular-nums">{h.peso_kg} <span className="text-xs text-[#8CB33E]">KG</span></p>
                                            </div>
                                        )) : <p className="text-sm font-black text-[#4B5563] uppercase text-center py-10 italic">Sin registros históricos</p>}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'salud' && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center"><p className="text-[13px] font-black text-[#8CB33E] uppercase italic tracking-tighter">Nueva Ficha de Protocolo</p><span className="text-[9px] font-black bg-[#11261F] text-white px-4 py-1.5 rounded-full shadow-sm uppercase tracking-widest">Auditoría Geogan</span></div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2"><label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Producto / Insumo</label><input type="text" placeholder="Ej: Oxitetraciclina" className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-4 text-sm font-bold text-[#11261F] outline-none focus:border-[#8CB33E]" /></div>
                                            <div className="space-y-2"><label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Diagnóstico / Motivo</label><select className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-4 text-sm font-bold text-[#11261F] outline-none"><option>PLAN SANITARIO (CICLO)</option><option>CONTROL PARASITARIO</option><option>TRATAMIENTO INFECCIOSO</option><option>SUPLEMENTACIÓN VITAMÍNICA</option></select></div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="space-y-2"><label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Vía Aplicación</label><select className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-5 py-4 text-xs font-bold text-[#11261F] outline-none"><option>SUBCUTÁNEA</option><option>INTRAMUSCULAR</option><option>TÓPICA / POUR-ON</option></select></div>
                                            <div className="space-y-2"><label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Inversión ($)</label><input type="number" placeholder="0.00" className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-5 py-4 text-sm font-bold text-[#11261F]" /></div>
                                            <div className="space-y-2"><label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Responsable ID</label><input type="text" placeholder="Ej: OP-102" className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-5 py-4 text-xs font-bold text-[#11261F]" /></div>
                                        </div>
                                        <div className="space-y-2"><label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Días de Carencia (Retiro)</label><input type="number" placeholder="28" className="w-full bg-white border-2 border-[#8CB33E]/30 rounded-2xl px-6 py-5 text-2xl font-black text-[#11261F] outline-none focus:border-[#8CB33E] transition-all" /></div>
                                        <button className="w-full bg-[#11261F] text-white py-6 rounded-[30px] font-black uppercase text-[12px] shadow-xl hover:bg-[#8CB33E] active:scale-95 transition-all tracking-[0.2em]">CERTIFICAR REGISTRO SANITARIO</button>
                                    </div>
                                    <div className="space-y-8 border-l-2 border-[#E6F4D7] pl-12">
                                        <p className="text-[11px] font-black text-[#11261F] uppercase tracking-widest flex items-center gap-3"><span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>Seguridad Alimentaria: Retiro Activo</p>
                                        <div className="bg-white border-2 border-red-100 p-8 rounded-[48px] shadow-sm relative overflow-hidden group hover:border-red-600 transition-all">
                                            <div className="absolute top-0 right-0 bg-red-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest">Venta Bloqueada</div>
                                            <div className="flex justify-between items-start mb-6"><div><p className="text-[16px] font-black text-[#11261F] uppercase tracking-tighter">Oxitetraciclina 200</p><p className="text-[12px] font-bold text-red-600 mt-1 italic">Estado: 19 días restantes</p></div><span className="text-4xl group-hover:scale-110 transition-transform">💉</span></div>
                                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden shadow-inner"><div className="bg-red-600 h-full w-[15%] transition-all duration-1000 shadow-sm"></div></div>
                                            <div className="mt-4 flex justify-between items-center text-[9px] font-black text-[#4B5563] uppercase opacity-70"><span>Operario: OP-102</span><span className="bg-[#E6F4D7] px-3 py-1 rounded-full text-[#11261F]">Inversión: $32,000</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'nutricion' && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 h-full">
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[13px] font-black text-[#8CB33E] uppercase italic tracking-tighter">Suministro de Insumos</p>
                                            <span className="text-[9px] font-black bg-[#11261F] text-white px-4 py-1.5 rounded-full shadow-sm uppercase tracking-widest">Control de Dieta</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Tipo de Suplemento</label>
                                                <select className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-5 text-sm font-bold text-[#11261F] outline-none focus:border-[#8CB33E]">
                                                    <option>SILO DE MAÍZ</option>
                                                    <option>SAL MINERALIZADA</option>
                                                    <option>CONCENTRADO PROTEICO</option>
                                                    <option>HENO / FORRAJE</option>
                                                    <option>MELAZA</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Cantidad (KG/Día)</label>
                                                <input type="number" placeholder="0.00" className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-5 text-sm font-bold text-[#11261F] outline-none focus:border-[#8CB33E]" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-[#4B5563] uppercase ml-1">Costo Unitario por KG ($)</label>
                                            <input type="number" placeholder="Ej: 1200" className="w-full bg-white border-2 border-[#8CB33E]/30 rounded-2xl px-6 py-5 text-2xl font-black text-[#11261F] outline-none focus:border-[#8CB33E] transition-all" />
                                        </div>

                                        <button className="w-full bg-[#11261F] text-white py-6 rounded-[30px] font-black uppercase text-[12px] shadow-xl hover:bg-[#8CB33E] active:scale-95 transition-all tracking-[0.2em]">
                                            REGISTRAR CONSUMO DIARIO
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-6 border-l-2 border-[#E6F4D7] pl-12">
                                        <p className="text-[11px] font-black text-[#11261F] uppercase tracking-widest">Inversión Acumulada en Dieta</p>

                                        <div className="bg-[#1A3D2F] p-8 rounded-[48px] shadow-lg relative overflow-hidden group">
                                            <div className="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">🌽</div>
                                            <p className="text-[10px] font-black text-[#8CB33E] uppercase mb-1">Costo Total Dieta (Mes)</p>
                                            <p className="text-4xl font-black text-white">$145,000</p>
                                            <div className="mt-6 flex justify-between items-end">
                                                <div>
                                                    <p className="text-[8px] font-black text-white/50 uppercase">GMD Promedio</p>
                                                    <p className="text-sm font-black text-white">0.85 KG/Día</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-white/50 uppercase">Eficiencia</p>
                                                    <p className="text-sm font-black text-[#8CB33E]">ALTA ✅</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#F9FBFA] border-2 border-[#E6F4D7] p-6 rounded-[32px] flex justify-between items-center opacity-70 grayscale hover:grayscale-0 transition-all">
                                            <div>
                                                <p className="text-[12px] font-black text-[#11261F] uppercase">Silo de Maíz</p>
                                                <p className="text-[9px] font-bold text-[#4B5563] uppercase italic">150 KG Suministrados</p>
                                            </div>
                                            <span className="text-sm font-black text-[#11261F]">$180,000</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}