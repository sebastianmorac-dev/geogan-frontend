import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';

/**
 * EditAnimalPage v8.6 — Consola de Control GeoGan
 * CARACTERÍSTICAS:
 * 1. PERSISTENCIA: Se mantiene en la página tras guardar para validar cambios.
 * 2. INTELIGENCIA: Proyección predictiva a 30 días basada en GMD.
 * 3. BRANDING: Paleta técnica #1A3D2F (Bosque) y #8CB33E (Lima).
 */
export default function EditAnimalPage() {
    const { id_animal } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(true);
    const [historial, setHistorial] = useState([]);
    const [animalData, setAnimalData] = useState(null);
    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        const fetchDatos = async () => {
            setLoading(true);
            try {
                const [resAnimal, resHistorial] = await Promise.all([
                    api.get(`/animales/${id_animal}`),
                    api.get(`/animales/${id_animal}/historial-pesos`)
                ]);
                setAnimalData(resAnimal.data);
                // Orden cronológico para que la curva crezca hacia la derecha
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
            // 1. Registro de pesaje (ID de usuario como entero)
            const pesajePayload = {
                peso_kg: parseFloat(data.peso),
                fecha_pesaje: new Date().toISOString().split('T')[0],
                fecha_proximo_pesaje: data.fecha_proximo_pesaje || null,
                observaciones: data.observaciones || "Control técnico GeoGan",
                creado_por: user?.id_usuario || user?.usuario_id || null
            };
            await api.post(`/animales/${id_animal}/pesaje`, pesajePayload);

            // 2. Actualización de ficha (Solo campos válidos de AnimalUpdate)
            const updatePayload = {
                peso: parseFloat(data.peso),
                sexo: data.sexo,
                estado: data.estado,
                fecha_proximo_pesaje: data.fecha_proximo_pesaje || null,
                observaciones: data.observaciones
            };
            await api.put(`/animales/${id_animal}`, updatePayload);

            // 3. PERMANENCIA: Recargamos para ver los cambios sin salir de la ficha
            window.location.reload();

        } catch (err) {
            const msg = err.response?.data?.detail || "Fallo en validación de datos.";
            alert(`Error: ${msg}`);
        }
    };

    // Cálculos de Inteligencia de Datos (Proyección 30 días)
    const ultimaGMD = historial.length > 0 ? parseFloat(historial[historial.length - 1].ganancia_media_diaria) || 0 : 0;
    const pesoActual = historial.length > 0 ? parseFloat(historial[historial.length - 1].peso_kg) : 0;
    const proyeccion30d = Math.round(pesoActual + (ultimaGMD * 30));

    if (loading) return <div className="h-screen flex items-center justify-center font-black text-[#1A3D2F] animate-pulse uppercase tracking-widest">Sincronizando GeoGan...</div>;

    return (
        <div className="h-screen bg-[#F9FBFA] font-sans text-[#1A3D2F] overflow-hidden flex flex-col antialiased">
            {/* Header Corporativo GeoGan */}
            <header className="bg-white border-b border-[#E6F4D7] h-28 px-10 flex justify-between items-center shrink-0 shadow-sm">
                <img src={logo} alt="GeoGan" className="h-30 w-auto object-contain" />
                <button onClick={() => navigate('/dashboard', { state: { fincaId: animalData?.id_finca } })} className="text-xs font-black uppercase tracking-widest text-[#8CB33E] hover:text-[#1A3D2F] transition-colors border-2 border-[#8CB33E] px-8 py-3 rounded-full">
                    VOLVER AL DASHBOARD
                </button>
            </header>

            <main className="flex-1 p-8 flex gap-8 overflow-hidden">

                {/* PANEL DE CONTROL (IZQUIERDA) */}
                <aside className="w-[380px] bg-white rounded-[40px] p-8 shadow-xl border border-[#E6F4D7] flex flex-col shrink-0">
                    <div className="mb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8CB33E] mb-1">Activo Digital</p>
                        <h2 className="text-4xl font-black text-[#1A3D2F] tracking-tighter">{animalData?.codigo_identificacion}</h2>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="p-6 bg-[#F9FBFA] rounded-3xl border border-[#E6F4D7]">
                            <label className="text-[10px] font-black uppercase text-[#1A3D2F]">Peso Actual (KG)</label>
                            <input type="number" step="0.01" {...register('peso')} className="w-full bg-transparent border-none p-0 text-5xl font-black text-[#1A3D2F] focus:ring-0 tabular-nums" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#8CB33E]">Notas de Manejo (Lote/Dieta)</label>
                            <textarea {...register('observaciones')} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-[#1A3D2F] min-h-[100px] focus:ring-1 focus:ring-[#8CB33E]" placeholder="Ej: Suplementación con silo..." />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#1A3D2F]">Siguiente Control</label>
                            <input type="date" {...register('fecha_proximo_pesaje')} className="w-full bg-[#E6F4D7]/30 border-none rounded-xl px-5 py-4 text-lg font-bold text-[#1A3D2F]" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Sexo</label>
                                <select {...register('sexo')} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold">
                                    <option value="M">MACHO</option>
                                    <option value="H">HEMBRA</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Estado</label>
                                <select {...register('estado')} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold">
                                    <option value="activo">ACTIVO</option>
                                    <option value="vendido">VENDIDO</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-[#1A3D2F] text-white py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-[#8CB33E] transition-all mt-auto">
                            {isSubmitting ? 'SINCRONIZANDO...' : 'ACTUALIZAR FICHA TÉCNICA'}
                        </button>
                    </form>
                </aside>

                {/* MONITOR Y CRONOLOGÍA (DERECHA) */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">

                    {/* Gráfico de Rendimiento */}
                    <section className="flex-1 bg-white rounded-[40px] p-10 border border-[#E6F4D7] flex flex-col shadow-sm">
                        <div className="flex justify-between items-start mb-8 shrink-0">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#1A3D2F]">Curva de Crecimiento Real</h3>
                            <div className="flex gap-4">
                                <div className="bg-[#1A3D2F] px-6 py-4 rounded-3xl text-right shadow-lg">
                                    <p className="text-[9px] font-black text-[#8CB33E] uppercase tracking-widest mb-1">Proyectado 30d</p>
                                    <p className="text-2xl font-black text-white">{proyeccion30d} KG</p>
                                </div>
                                <div className="bg-[#E6F4D7] px-6 py-4 rounded-3xl border border-[#8CB33E]/20 text-right">
                                    <p className="text-[9px] font-black text-[#8CB33E] uppercase tracking-widest mb-1">Pico de Peso</p>
                                    <p className="text-2xl font-black text-[#1A3D2F]">{pesoActual} KG</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historial}>
                                    <defs>
                                        <linearGradient id="colorGeo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8CB33E" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8CB33E" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6F4D7" />
                                    <XAxis dataKey="fecha_pesaje" hide />
                                    <YAxis orientation="right" axisLine={false} tickLine={false} fontSize={14} fontWeight="900" domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '20px', border: '2px solid #8CB33E', backgroundColor: '#fff' }}
                                        formatter={(val) => [`${Math.round(val)} KG`, 'Peso']}
                                    />
                                    <Area type="monotone" dataKey="peso_kg" stroke="#1A3D2F" strokeWidth={5} fill="url(#colorGeo)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    {/* Cronología de Pesajes */}
                    <section className="h-44 bg-white rounded-[40px] p-6 border border-[#E6F4D7] shrink-0 flex flex-col">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8CB33E] mb-4 text-center">Eventos Históricos de Pesaje</h3>
                        <div className="flex-1 flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                            {historial.length > 0 ? [...historial].reverse().map((h, i) => (
                                <div key={i} className="min-w-[200px] bg-[#F9FBFA] p-5 rounded-3xl border-b-4 border-[#8CB33E] flex flex-col justify-between hover:bg-white transition-all shadow-sm">
                                    <span className="text-[11px] font-black text-[#1A3D2F] uppercase tracking-widest">{h.fecha_pesaje}</span>
                                    <div className="flex justify-between items-end">
                                        <p className="text-2xl font-black text-[#1A3D2F]">{Math.round(h.peso_kg)}<span className="text-[10px] ml-1 text-[#8CB33E] font-bold">KG</span></p>
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full ${parseFloat(h.ganancia_media_diaria) > 0.6 ? 'bg-[#E6F4D7] text-[#1A3D2F]' : 'bg-orange-50 text-orange-700'}`}>
                                            +{h.ganancia_media_diaria} GMD
                                        </span>
                                    </div>
                                </div>
                            )) : <p className="text-xs font-black text-gray-300 uppercase m-auto italic">Sin registros técnicos registrados</p>}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}