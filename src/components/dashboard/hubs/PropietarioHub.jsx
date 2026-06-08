// src/components/dashboard/hubs/PropietarioHub.jsx
// WRAPPER ESTRATÉGICO: Visión Macro para el Dueño de la Finca
// Monta ResumenTab y LotesTab sin modificar su lógica interna.

import React, { useState, useEffect } from 'react';
import ResumenTab from '../tabs/ResumenTab';
import LotesTab from '../tabs/LotesTab';
import AnaliticaTab from '../tabs/AnaliticaTab';
import GanadoEnTransito from '../GanadoEnTransito';
import api from '../../../api/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PropietarioHub({ dashboard }) {
    const { fincaSel } = dashboard;
    const [historico, setHistorico] = useState([]);
    const [proyecciones, setProyecciones] = useState(null);

    useEffect(() => {
        if (!fincaSel) return;
        const fetchDatos = async () => {
            try {
                const [resHistorico, resProyecciones] = await Promise.all([
                    api.get(`/api/v1/analytics/financiero/${fincaSel}/historico`),
                    api.get(`/api/v1/analytics/proyecciones/${fincaSel}`)
                ]);
                
                // Formatear histórico para la gráfica
                const dataFormat = resHistorico.data.map(item => ({
                    fecha: new Date(item.fecha_cierre).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
                    Capital: parseFloat(item.capital_biologico),
                    Utilidad: parseFloat(item.utilidad_biologica)
                }));
                setHistorico(dataFormat);
                setProyecciones(resProyecciones.data);
            } catch (error) {
                console.error("Error cargando analítica avanzada", error);
            }
        };
        fetchDatos();
    }, [fincaSel]);

    // --- KPIs Estratégicos ---
    const totalCabezas = dashboard.stats?.total || 0;
    const valorEstimado = dashboard.stats?.valorLote || '0';
    const biomasaTotal = (dashboard.lotesEnriquecidos || []).reduce((sum, l) => sum + (l.biomasa_total || 0), 0);

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8">
            {/* CABECERA ESTRATÉGICA */}
            <div className="bg-gradient-to-br from-[#11261F] via-[#1a3a2e] to-[#0d1f17] rounded-[32px] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#8CB33E]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-[#8CB33E] uppercase tracking-[0.3em] mb-3">📊 Métricas de Capital Biológico</p>
                    <h2 className="text-4xl font-black uppercase tracking-tight mb-8">Visión Estratégica</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Capital en Ganado</p>
                            <p className="text-3xl font-black italic text-amber-400">$ {valorEstimado}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Biomasa Total en Finca</p>
                            <p className="text-3xl font-black italic text-white">{biomasaTotal.toLocaleString('es-CO')} <span className="text-base font-bold text-gray-400">KG</span></p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Población Activa</p>
                            <p className="text-3xl font-black italic text-white">{Number(totalCabezas).toLocaleString('es-CO')} <span className="text-base font-bold text-gray-400">cabezas</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE INTELIGENCIA Y PROYECCIÓN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* GRÁFICA DE PATRIMONIO HISTÓRICO */}
                <div className="bg-white rounded-[32px] p-8 border border-[#E6F4D7] shadow-sm">
                    <h3 className="text-xl font-black text-[#11261F] uppercase tracking-tight mb-6 flex items-center gap-2">
                        <span className="text-[#8CB33E]">📈</span> Evolución Patrimonial
                    </h3>
                    <div className="h-64">
                        {historico.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8CB33E" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8CB33E" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} />
                                    <Tooltip formatter={(value) => formatMoney(value)} />
                                    <Area type="monotone" dataKey="Capital" stroke="#8CB33E" strokeWidth={3} fillOpacity={1} fill="url(#colorCapital)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm font-bold border-2 border-dashed rounded-xl border-slate-200">
                                Sin datos históricos suficientes.
                            </div>
                        )}
                    </div>
                </div>

                {/* WIDGET DE PROYECCIÓN DE VENTAS */}
                <div className="bg-white rounded-[32px] p-8 border border-[#E6F4D7] shadow-sm">
                    <h3 className="text-xl font-black text-[#11261F] uppercase tracking-tight mb-2 flex items-center gap-2">
                        <span className="text-blue-500">🔮</span> Proyección de Ventas
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mb-6">
                        Estimación basada en GMD hacia meta de {proyecciones?.peso_meta_referencia || 450}kg.
                    </p>
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {proyecciones?.proyecciones?.length > 0 ? (
                            proyecciones.proyecciones.map((proy, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="font-black text-[#11261F] text-sm uppercase">{proy.nombre_lote}</p>
                                        <p className="text-[10px] text-slate-500 font-bold mt-1">
                                            {proy.cabezas} Cabezas • {proy.peso_promedio_actual}kg actual
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-blue-600">En {proy.dias_estimados_restantes} días</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                            {formatMoney(proy.valor_estimado_venta)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center py-10 text-slate-400 text-sm font-bold border-2 border-dashed rounded-xl border-slate-200">
                                No hay lotes de ceba activos o pesajes.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* NUEVA SECCIÓN: TALENTO Y ADOPCIÓN DIGITAL */}
            {dashboard.equipoActividad?.operarios && dashboard.equipoActividad.operarios.length > 0 && (
                <div className="bg-white rounded-[32px] p-8 md:p-10 border border-[#E6F4D7] shadow-sm">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase tracking-tight flex items-center gap-3">
                            <span className="bg-[#8CB33E]/20 text-[#8CB33E] p-2 rounded-xl text-2xl">👥</span> 
                            Rendimiento y Adopción Digital
                        </h3>
                        <p className="text-sm text-gray-500 font-medium mt-2 max-w-3xl">
                            Monitoreo del volumen de actividad y trazabilidad de tu equipo. Estos indicadores reflejan la interacción del personal con GeoGan en el registro de datos vitales (pesajes y sanidad).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LÍDERES EN PESAJES */}
                        <div className="bg-gradient-to-br from-[#F4F6F4] to-white rounded-3xl p-6 border border-[#E6F4D7]">
                            <h4 className="text-[10px] font-black uppercase text-[#8CB33E] tracking-widest mb-4 flex items-center gap-2">
                                ⚖️ Líderes en Registro de Peso (Últimos 7 días)
                            </h4>
                            <div className="space-y-3">
                                {[...dashboard.equipoActividad.operarios]
                                    .sort((a, b) => b.pesajes_semana - a.pesajes_semana)
                                    .slice(0, 3)
                                    .map((op, i) => (
                                        <div key={op.id_usuario} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    #{i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-[#11261F]">{op.nombre_completo}</p>
                                                    <p className="text-[9px] uppercase font-bold text-gray-400">{op.rol}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-[#8CB33E]">{op.pesajes_semana}</p>
                                                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Registros</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* LÍDERES EN SANIDAD */}
                        <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-3xl p-6 border border-blue-100">
                            <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-4 flex items-center gap-2">
                                💉 Liderazgo en Sanidad (Últimos 7 días)
                            </h4>
                            <div className="space-y-3">
                                {[...dashboard.equipoActividad.operarios]
                                    .sort((a, b) => b.sanidad_semana - a.sanidad_semana)
                                    .slice(0, 3)
                                    .map((op, i) => (
                                        <div key={op.id_usuario} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    #{i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-[#11261F]">{op.nombre_completo}</p>
                                                    <p className="text-[9px] uppercase font-bold text-gray-400">{op.rol}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-blue-500">{op.sanidad_semana}</p>
                                                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Aplicaciones</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NUEVA SECCIÓN: BUSINESS INTELLIGENCE Y ORÁCULO */}
            <AnaliticaTab 
                fincaActual={dashboard.fincaActual}
                allAnimales={dashboard.allAnimales}
                lotesReales={dashboard.lotesReales}
            />

            {/* TABS EXISTENTES */}
            <div className="space-y-8">
                <GanadoEnTransito allAnimales={dashboard.allAnimales} />
                <ResumenTab {...dashboard} />
                <LotesTab {...dashboard} />
            </div>
        </div>
    );
}
