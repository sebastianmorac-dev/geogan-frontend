// src/components/dashboard/hubs/AdministradorHub.jsx
// WRAPPER LOGÍSTICO: Vista de Gestión Operativa y Cumplimiento Legal
// Monta LotesTab y SanidadTab con el panel SINIGÁN.

import React from 'react';
import LotesTab from '../tabs/LotesTab';
import SanidadTab from '../tabs/SanidadTab';
import GanadoEnTransito from '../GanadoEnTransito';
import { notifyWarning } from '../../../utils/notify';

/**
 * AdministradorHub — Vista de Gestión para el Encargado / Administrador
 * 
 * Envuelve LotesTab y SanidadTab con un panel de cumplimiento normativo
 * (SINIGÁN/ICA) que prepara botones de exportación de reportes.
 * 
 * @param {Object} dashboard - Estado completo de useDashboardData()
 */
export default function AdministradorHub({ dashboard }) {
    const totalCabezas = dashboard.stats?.total || 0;
    const totalLotes = (dashboard.lotesEnriquecidos || []).length;
    const animalesEnCuarentena = (dashboard.allAnimales || []).filter(a => a.apto_para_consumo === false).length;

    // --- Botones de Reporte (Inactivos, listos para conectar al backend) ---
    const handleReporteSINIGAN = (tipo) => {
        notifyWarning(`🚧 Reporte "${tipo}" en desarrollo. Estará disponible cuando el backend lo habilite.`);
    };

    return (
        <div className="space-y-8">
            {/* PANEL DE CUMPLIMIENTO SINIGÁN */}
            <div className="bg-gradient-to-br from-[#11261F] via-[#1c3d30] to-[#0d1f17] rounded-[32px] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">🏛️ Asistente de Cumplimiento Legal</p>
                            <h2 className="text-4xl font-black uppercase tracking-tight">SINIGÁN &amp; ICA</h2>
                            <p className="text-sm text-gray-400 mt-2 max-w-lg">
                                Genera reportes oficiales para el Instituto Colombiano Agropecuario. Mantén al día tu inventario ganadero y libreta sanitaria.
                            </p>
                        </div>
                    </div>

                    {/* KPIs de Cumplimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Inventario Total</p>
                            <p className="text-3xl font-black italic text-white">{totalCabezas} <span className="text-sm font-bold text-gray-400">cabezas</span></p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Potreros Activos</p>
                            <p className="text-3xl font-black italic text-emerald-400">{totalLotes}</p>
                        </div>
                        <div className={`backdrop-blur-sm rounded-2xl p-6 border ${animalesEnCuarentena > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-white/10 border-white/5'}`}>
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">En Cuarentena</p>
                            <p className={`text-3xl font-black italic ${animalesEnCuarentena > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {animalesEnCuarentena}
                            </p>
                            {animalesEnCuarentena > 0 && (
                                <p className="text-[9px] text-red-300 font-bold mt-1 uppercase">🚨 Con medicamento activo</p>
                            )}
                        </div>
                    </div>

                    {/* Botones de Reportes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button 
                            onClick={() => handleReporteSINIGAN('Inventario Ganadero Semestral')}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-5 text-left transition-all group"
                        >
                            <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">📄</span>
                            <p className="text-xs font-black uppercase text-white">Inventario Semestral</p>
                            <p className="text-[10px] text-gray-400 mt-1">Reporte ICA Form. 01</p>
                        </button>
                        <button 
                            onClick={() => handleReporteSINIGAN('Movilización de Ganado')}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-5 text-left transition-all group"
                        >
                            <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">🚛</span>
                            <p className="text-xs font-black uppercase text-white">Guía de Movilización</p>
                            <p className="text-[10px] text-gray-400 mt-1">Traslados entre fincas</p>
                        </button>
                        <button 
                            onClick={() => handleReporteSINIGAN('Historial Sanitario')}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-5 text-left transition-all group"
                        >
                            <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">💉</span>
                            <p className="text-xs font-black uppercase text-white">Libreta Sanitaria</p>
                            <p className="text-[10px] text-gray-400 mt-1">Vacunas y tratamientos</p>
                        </button>
                        <button 
                            onClick={() => handleReporteSINIGAN('Registro de Nacimientos')}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-5 text-left transition-all group"
                        >
                            <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">🐮</span>
                            <p className="text-xs font-black uppercase text-white">Nacimientos</p>
                            <p className="text-[10px] text-gray-400 mt-1">Registro reproductivo</p>
                        </button>
                    </div>
                </div>
            </div>

            {/* TABS EXISTENTES — Sin modificar su lógica */}
            <div className="space-y-8">
                <GanadoEnTransito allAnimales={dashboard.allAnimales} />
                <LotesTab {...dashboard} />
                <SanidadTab {...dashboard} />
            </div>
        </div>
    );
}
