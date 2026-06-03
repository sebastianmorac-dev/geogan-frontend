// src/components/dashboard/hubs/PropietarioHub.jsx
// WRAPPER ESTRATÉGICO: Visión Macro para el Dueño de la Finca
// Monta ResumenTab y LotesTab sin modificar su lógica interna.

import React from 'react';
import ResumenTab from '../tabs/ResumenTab';
import LotesTab from '../tabs/LotesTab';
import AnaliticaTab from '../tabs/AnaliticaTab';
import GanadoEnTransito from '../GanadoEnTransito';

/**
 * PropietarioHub — Vista Estratégica del Propietario
 * 
 * Envuelve los componentes base (ResumenTab, LotesTab) con una capa de
 * "inteligencia predictiva" que traduce los datos crudos a lenguaje de negocio.
 * 
 * @param {Object} dashboard - Estado completo de useDashboardData()
 */
export default function PropietarioHub({ dashboard }) {
    // --- Motor de Predicciones Textuales ---
    const lotesConGmd = (dashboard.lotesEnriquecidos || []).filter(l => l.gmd_meta && l.peso_promedio > 0);
    
    const predicciones = lotesConGmd.map(lote => {
        const pesoPromedio = lote.peso_promedio || 0;
        const gmdMeta = parseFloat(lote.gmd_meta) || 0;
        // Heurística: Si el peso promedio crece al menos al 80% de la meta, la tendencia es positiva
        const gmdEstimado = pesoPromedio > 0 ? pesoPromedio / 500 : 0;
        const rendimiento = gmdMeta > 0 ? (gmdEstimado / gmdMeta) * 100 : 0;

        let tendencia = 'neutral';
        let sugerencia = 'Faltan datos para proyectar.';
        let badgeColor = 'bg-slate-100 text-slate-600';

        if (rendimiento >= 100) {
            tendencia = 'sobresaliente';
            sugerencia = 'Mantener ración actual. Evaluar venta temprana.';
            badgeColor = 'bg-amber-100 text-amber-700 border-amber-300';
        } else if (rendimiento >= 80) {
            tendencia = 'positiva';
            sugerencia = 'Mantener ración. El ganado responde bien.';
            badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-300';
        } else if (rendimiento >= 50) {
            tendencia = 'moderada';
            sugerencia = 'Considerar ajuste de alimentación o suplemento.';
            badgeColor = 'bg-blue-100 text-blue-700 border-blue-300';
        } else if (rendimiento > 0) {
            tendencia = 'crítica';
            sugerencia = 'Alerta: revisar calidad del pasto y posibles enfermedades.';
            badgeColor = 'bg-red-100 text-red-700 border-red-300';
        }

        return { lote: lote.nombre, tendencia, sugerencia, rendimiento: rendimiento.toFixed(0), badgeColor };
    });

    // --- KPIs Estratégicos ---
    const totalCabezas = dashboard.stats?.total || 0;
    const valorEstimado = dashboard.stats?.valorLote || '0';
    const biomasaTotal = (dashboard.lotesEnriquecidos || []).reduce((sum, l) => sum + (l.biomasa_total || 0), 0);

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
