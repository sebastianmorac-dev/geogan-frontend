import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../../api/client';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp, AlertOctagon, BrainCircuit, Settings, DollarSign, Target, Activity, CheckCircle, X, ExternalLink, Filter, ShieldCheck, HeartPulse } from 'lucide-react';
import { notifySuccess, notifyError, notifyWarning } from '../../../utils/notify';

const COLORS = ['#8CB33E', '#064E3B', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
const HEALTH_COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Verde (Vacunado), Amarillo (Tratamiento), Rojo (Vulnerable)

export default function AnaliticaTab({ fincaActual, allAnimales, lotesReales }) {
    const [oraculoData, setOraculoData] = useState([]);
    const [sanidadData, setSanidadData] = useState(null);
    const [loadingOraculo, setLoadingOraculo] = useState(true);
    
    // Master Filter
    const [loteFilter, setLoteFilter] = useState('TODOS');

    // Configuración de Precio
    const [precioKg, setPrecioKg] = useState(8000);
    const [editandoPrecio, setEditandoPrecio] = useState(false);
    const [precioTemp, setPrecioTemp] = useState('');

    // Modal de Acción
    const [accionModal, setAccionModal] = useState(null);
    const [selectedAnimalsModal, setSelectedAnimalsModal] = useState([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [motivoSalida, setMotivoSalida] = useState('vendido');
    
    const navigate = useNavigate();

    const agruparRecomendaciones = (recomendaciones) => {
        const agrupadas = {};
        recomendaciones.forEach(rec => {
            const lote = rec.detalles?.lote || 'Sin Lote';
            const key = `${rec.tipo}-${lote}`;
            if (!agrupadas[key]) {
                agrupadas[key] = {
                    ...rec,
                    id_recomendacion: key,
                    valor_estimado_usd: rec.valor_estimado_usd || 0,
                    animales_agrupados: [rec],
                    es_grupo: true
                };
            } else {
                agrupadas[key].valor_estimado_usd += (rec.valor_estimado_usd || 0);
                agrupadas[key].animales_agrupados.push(rec);
            }
        });
        
        return Object.values(agrupadas).map(grupo => {
            const cant = grupo.animales_agrupados.length;
            if (grupo.tipo === 'VENTA_OPTIMA') {
                grupo.titulo = `PROYECCIÓN DE INGRESOS: ¿QUÉ ANIMALES HAN ALCANZADO SU PUNTO ÓPTIMO DE VENTA? (${cant})`;
                grupo.mensaje = `En el lote ${grupo.detalles?.lote || 'Sin Lote'} existen ${cant} animales que han alcanzado su peso ideal de venta.`;
                grupo.accion_sugerida = `Se recomienda agendar la venta de estos ${cant} animales para maximizar el retorno de inversión.`;
            } else if (grupo.tipo === 'BAJA_RENTABILIDAD') {
                grupo.titulo = `DESEMPEÑO PRODUCTIVO: ¿QUÉ ANIMALES PRESENTAN BAJA RENTABILIDAD? (${cant})`;
                grupo.mensaje = `En el lote ${grupo.detalles?.lote || 'Sin Lote'} se identificaron ${cant} animales con un rendimiento productivo inferior al esperado.`;
                grupo.accion_sugerida = `Se sugiere realizar una evaluación clínica o considerar el descarte de los ${cant} animales para evitar costos innecesarios.`;
            } else if (grupo.tipo === 'PROYECCION_VENTA') {
                grupo.titulo = `PROYECCIÓN FINANCIERA: ¿QUÉ INVENTARIO ESTARÁ LISTO EN LOS PRÓXIMOS 60 DÍAS? (${cant})`;
                grupo.mensaje = `El lote ${grupo.detalles?.lote || 'Sin Lote'} cuenta con ${cant} animales que alcanzarán su peso meta en menos de 60 días.`;
                grupo.accion_sugerida = `Se aconseja iniciar la planificación logística y de mercadeo para este grupo de animales.`;
            }
            return grupo;
        });
    };

    useEffect(() => {
        const fetchOraculo = async () => {
            if (!fincaActual?.id_finca) {
                setLoadingOraculo(false);
                return;
            }
            
            setLoadingOraculo(true);
            try {
                const paramsRes = await api.get(`/fincas/${fincaActual.id_finca}/parametros`);
                if (paramsRes.data && paramsRes.data.precio_base_venta_kg) {
                    setPrecioKg(Number(paramsRes.data.precio_base_venta_kg));
                    setPrecioTemp(paramsRes.data.precio_base_venta_kg);
                } else {
                    setPrecioTemp('8000');
                }

                const res = await api.get(`/api/v1/analytics/finca/${fincaActual.id_finca}/oraculo`);
                
                let recs = res.data?.recomendaciones || [];
                // Aplicar Filtro Maestro al Oráculo
                if (loteFilter !== 'TODOS') {
                    recs = recs.filter(r => r.detalles?.id_lote === parseInt(loteFilter));
                }
                setOraculoData(agruparRecomendaciones(recs));
                
                // Fetch Sanidad
                let urlSanidad = `/api/v1/analytics/finca/${fincaActual.id_finca}/estado-sanitario`;
                if (loteFilter !== 'TODOS') {
                    urlSanidad += `?lote_id=${loteFilter}`;
                }
                const sanidadRes = await api.get(urlSanidad);
                setSanidadData(sanidadRes.data);

            } catch (error) {
                console.error("Error fetching oraculo/sanidad:", error);
            } finally {
                setLoadingOraculo(false);
            }
        };
        fetchOraculo();
    }, [fincaActual?.id_finca, loteFilter]);

    const guardarPrecio = async () => {
        if (!precioTemp || isNaN(precioTemp)) {
            notifyWarning("Ingresa un precio válido.");
            return;
        }
        try {
            await api.put(`/fincas/${fincaActual.id_finca}/parametros`, {
                precio_base_venta_kg: parseFloat(precioTemp)
            });
            setPrecioKg(parseFloat(precioTemp));
            setEditandoPrecio(false);
            notifySuccess("Precio actualizado correctamente.");
        } catch (error) {
            console.error(error);
            notifyError("Error al guardar precio.");
        }
    };

    const ejecutarAccion = async () => {
        if (!accionModal || selectedAnimalsModal.length === 0) return;
        setIsExecuting(true);
        try {
            await Promise.all(selectedAnimalsModal.map(async (id) => {
                const recOriginal = accionModal.animales_agrupados.find(a => a.entidad_id === id);
                const isVenta = accionModal.tipo === 'VENTA_OPTIMA';
                const estadoFinal = isVenta ? 'vendido' : motivoSalida;
                const precioVenta = isVenta && recOriginal?.valor_estimado_usd ? recOriginal.valor_estimado_usd : null;

                const payload = {
                    estado: estadoFinal,
                    precio_venta: precioVenta,
                    detalle_salida: `Dado de baja via Oráculo. Motivo original: ${accionModal.tipo}`,
                    fecha_salida: new Date().toISOString().split('T')[0]
                };

                return api.patch(`/animales/${id}/dar-baja`, payload);
            }));
            
            notifySuccess(`Éxito: ${selectedAnimalsModal.length} animal(es) procesados.`);
            setAccionModal(null);
            
            // Refrescar silenciosamente
            const res = await api.get(`/api/v1/analytics/finca/${fincaActual.id_finca}/oraculo`);
            let recs = res.data?.recomendaciones || [];
            if (loteFilter !== 'TODOS') recs = recs.filter(r => r.detalles?.id_lote === parseInt(loteFilter));
            setOraculoData(agruparRecomendaciones(recs));
            
        } catch (error) {
            console.error("Error ejecutando acción:", error);
            notifyError("Error al ejecutar la acción masiva en el Oráculo.");
        } finally {
            setIsExecuting(false);
        }
    };

    // PREPARACIÓN DE DATOS PARA GRÁFICOS
    // Aplicamos Filtro Maestro
    const animalesFiltrados = loteFilter === 'TODOS' 
        ? allAnimales 
        : allAnimales.filter(a => a.id_lote === parseInt(loteFilter));

    const biomasaTotal = animalesFiltrados.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);
    const numAnimales = animalesFiltrados.length;
    
    // Proyección Financiera basada en GMD Real
    const animalesConGMD = animalesFiltrados.filter(a => a.ganancia_media_diaria && parseFloat(a.ganancia_media_diaria) > 0);
    const gmdPromedio = animalesConGMD.length > 0 
        ? animalesConGMD.reduce((acc, curr) => acc + parseFloat(curr.ganancia_media_diaria), 0) / animalesConGMD.length
        : 0.6; 
    const gananciaDiariaTotalKg = numAnimales * gmdPromedio;
    
    const dataProyeccion = [
        { dia: 'Hoy', valor: Math.round(biomasaTotal * precioKg) },
        { dia: 'Día 7', valor: Math.round((biomasaTotal + (gananciaDiariaTotalKg * 7)) * precioKg) },
        { dia: 'Día 15', valor: Math.round((biomasaTotal + (gananciaDiariaTotalKg * 15)) * precioKg) },
        { dia: 'Día 30', valor: Math.round((biomasaTotal + (gananciaDiariaTotalKg * 30)) * precioKg) },
    ];

    // 1. Distribución por Lote (Biomasa) - Solo si es TODOS
    const dataLotesBiomasa = lotesReales.map(lote => {
        const animalesLote = allAnimales.filter(a => a.id_lote === lote.id_lote);
        const biomasaLote = animalesLote.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);
        return {
            name: lote.nombre,
            biomasa: Math.round(biomasaLote),
            cantidad: animalesLote.length
        };
    }).filter(d => d.cantidad > 0);

    // 2. Distribución Demográfica (Pie Chart)
    const dataRaza = animalesFiltrados.reduce((acc, animal) => {
        const raza = animal.raza || 'Mestizo';
        acc[raza] = (acc[raza] || 0) + 1;
        return acc;
    }, {});
    const pieRazaData = Object.keys(dataRaza).map(key => ({ name: key, value: dataRaza[key] }));

    // 3. Distribución Sanitaria
    const pieSanidadData = sanidadData ? [
        { name: 'Vacunados/Protegidos', value: sanidadData.vacunados_recientes },
        { name: 'En Tratamiento', value: sanidadData.en_tratamiento },
        { name: 'Vulnerables', value: sanidadData.vulnerables },
    ].filter(d => d.value > 0) : [];

    return (
        <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8">
            {/* Modal omitido aquí por brevedad, igual que antes */}
            
            {/* ENCABEZADO PREMIUM CON FILTRO MAESTRO */}
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700/50">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none mix-blend-screen"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none mix-blend-screen"></div>
                
                <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-purple-500/30 border border-white/10">
                            <BrainCircuit className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tight mb-1 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">EL ORÁCULO</h2>
                            <p className="text-gray-400 font-medium text-sm tracking-widest uppercase">Inteligencia de Negocio & Predicciones</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full xl:w-auto items-center justify-end">
                        
                        {/* FILTRO MAESTRO DE LOTES */}
                        <div className="bg-indigo-900/50 backdrop-blur-md p-4 rounded-2xl border border-indigo-500/30 w-full md:w-auto">
                            <p className="text-xs uppercase tracking-widest font-bold text-indigo-300 flex items-center gap-1 mb-1">
                                <Filter className="w-3 h-3"/> Filtro Maestro
                            </p>
                            <select 
                                value={loteFilter}
                                onChange={(e) => setLoteFilter(e.target.value)}
                                className="bg-slate-900 border border-slate-600 text-white font-bold rounded-lg px-3 py-1.5 w-full md:w-48 outline-none focus:border-indigo-500"
                            >
                                <option value="TODOS">Toda la Finca</option>
                                {lotesReales.map(l => (
                                    <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Configuración de Precio */}
                        <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-600/50 flex-1 md:flex-none">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs uppercase tracking-widest font-bold text-gray-400 flex items-center gap-1">
                                    <Settings className="w-3 h-3"/> Ref. Kilo en Pie
                                </p>
                                {!editandoPrecio && (
                                    <button onClick={() => setEditandoPrecio(true)} className="text-purple-400 hover:text-purple-300 text-xs font-bold uppercase ml-4">Editar</button>
                                )}
                            </div>
                            
                            {editandoPrecio ? (
                                <div className="flex gap-2 mt-2">
                                    <input 
                                        type="number" 
                                        value={precioTemp} 
                                        onChange={e => setPrecioTemp(e.target.value)}
                                        className="bg-slate-900 border border-slate-600 text-white text-lg font-bold rounded-lg px-3 py-1 w-24 outline-none focus:border-purple-500 transition-colors"
                                    />
                                    <button onClick={guardarPrecio} className="bg-purple-600 hover:bg-purple-500 px-3 rounded-lg text-white font-bold transition-colors">
                                        <CheckCircle className="w-5 h-5"/>
                                    </button>
                                </div>
                            ) : (
                                <p className="text-2xl font-black text-emerald-400">
                                    ${precioKg.toLocaleString()} <span className="text-sm font-normal text-gray-500">COP</span>
                                </p>
                            )}
                        </div>

                        {/* KPI Biomasa */}
                        <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-600/50 hidden lg:block">
                            <p className="text-xs uppercase tracking-widest font-bold text-gray-400">Biomasa Analizada</p>
                            <p className="text-2xl font-black text-white">
                                {Math.round(biomasaTotal).toLocaleString()} <span className="text-sm font-normal text-gray-500">kg</span>
                            </p>
                        </div>
                        
                        {/* KPI Valor Estimado */}
                        <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-600/50 flex-1 md:flex-none">
                            <p className="text-xs uppercase tracking-widest font-bold text-gray-400">Valor Segmento</p>
                            <p className="text-2xl font-black text-white">
                                ${(Math.round(biomasaTotal * precioKg)).toLocaleString()} <span className="text-sm font-normal text-gray-500">COP</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DEL ASESOR INTELIGENTE */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
                    <Target className="w-8 h-8 text-[#11261F]" />
                    <h3 className="text-2xl font-black uppercase tracking-wider text-[#11261F]">
                        Consultas Estratégicas y Respuestas {loteFilter !== 'TODOS' ? '(Segmentadas)' : ''}
                    </h3>
                </div>

                {loadingOraculo ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-6" />
                        <p className="text-sm font-bold uppercase tracking-widest text-gray-400 animate-pulse">Analizando genéticas, históricos y proyectando futuros...</p>
                    </div>
                ) : oraculoData.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                        <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold text-lg">No se han detectado situaciones críticas bajo los parámetros actuales.</p>
                        <p className="text-slate-400 font-medium text-sm mt-2">Los indicadores de crecimiento biológico se mantienen dentro de los modelos predictivos esperados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {oraculoData.map(rec => {
                            const isVenta = rec.tipo === 'VENTA_OPTIMA';
                            const bgColor = isVenta ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200' : 'bg-gradient-to-br from-rose-50 to-white border-rose-200';
                            const iconColor = isVenta ? 'text-emerald-500 bg-emerald-100' : 'text-rose-500 bg-rose-100';
                            const titleColor = isVenta ? 'text-emerald-900' : 'text-rose-900';
                            const btnColor = isVenta ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20';

                            return (
                                <div key={rec.id_recomendacion} className={`p-6 rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${bgColor} flex flex-col group relative overflow-hidden`}>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className={`p-3 rounded-2xl ${iconColor}`}>
                                            {isVenta ? <TrendingUp className="w-6 h-6"/> : <AlertOctagon className="w-6 h-6"/>}
                                        </div>
                                        {rec.valor_estimado_usd && (
                                            <span className="bg-white/80 backdrop-blur-sm border border-emerald-100 px-4 py-1.5 rounded-full text-xs font-black tracking-wider text-emerald-700 shadow-sm">
                                                ~ ${(rec.valor_estimado_usd || 0).toLocaleString()}
                                            </span>
                                        )}
                                    </div>

                                    <h4 className={`font-black uppercase tracking-wide text-lg mb-2 relative z-10 ${titleColor}`}>{rec.titulo}</h4>
                                    <p className="text-sm text-gray-600 font-medium mb-6 relative z-10 leading-relaxed">{rec.mensaje}</p>
                                    
                                    <div className="mt-auto relative z-10">
                                        <button 
                                            onClick={() => {
                                                setAccionModal(rec);
                                                setSelectedAnimalsModal(rec.animales_agrupados.map(a => a.entidad_id));
                                            }}
                                            className={`w-full py-3 rounded-xl text-white text-sm font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-xl ${btnColor}`}
                                        >
                                            Ver Grupo
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* GRÁFICOS ESTRATÉGICOS - FILA 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Proyección Financiera a 30 Días */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-sm font-black text-[#11261F] uppercase tracking-widest">Proyección Financiera</h4>
                            <p className="text-gray-400 text-xs font-medium mt-1">Acumulación de biomasa a 30 días</p>
                        </div>
                        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2">
                            <TrendingUp className="w-5 h-5"/>
                            +{Math.round((gananciaDiariaTotalKg * 30) * precioKg).toLocaleString()} COP
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dataProyeccion} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorProy" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} dy={10} />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                                />
                                <Tooltip 
                                    formatter={(value) => [`$${value.toLocaleString()}`, 'Valor Proyectado']}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProy)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Estado Sanitario del Hato */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-sm font-black text-[#11261F] uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-500" /> Cobertura Inmunológica
                            </h4>
                            <p className="text-gray-400 text-xs font-medium mt-1">Estado de salud global del segmento</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        {pieSanidadData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieSanidadData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieSanidadData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={HEALTH_COLORS[index % HEALTH_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-400 text-sm font-medium">Cargando datos sanitarios...</p>
                        )}
                    </div>
                </div>
            </div>

            {/* GRÁFICOS ESTRATÉGICOS - FILA 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfico de Dona: Demografía */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-[350px]">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Composición Genética (Razas)</h4>
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        {pieRazaData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieRazaData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieRazaData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-400 text-sm font-medium">No hay datos suficientes.</p>
                        )}
                    </div>
                </div>

                {/* Gráfico de Barras: Biomasa por Lote (SOLO VISIBLE SI ES "TODOS") */}
                {loteFilter === 'TODOS' && (
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-[350px]">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Ranking de Biomasa por Lote</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dataLotesBiomasa} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="biomasa" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
