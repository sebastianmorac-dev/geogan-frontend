import React, { useState, useEffect } from 'react';
import api from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { exportToExcel } from '../../../utils/export';

export default function ContadorHub({ dashboard }) {
    const user = useAuthStore(state => state.user);
    const { fincaActual, fincaSel } = dashboard;
    
    const [finanzas, setFinanzas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!fincaSel) return;
        const fetchFinanzas = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/v1/analytics/financiero/${fincaSel}`);
                setFinanzas(res.data);
                setError(null);
            } catch (err) {
                console.error("Error cargando financiero:", err);
                setError("No se pudo cargar la información financiera. El backend podría no estar listo.");
            } finally {
                setLoading(false);
            }
        };
        fetchFinanzas();
    }, [fincaSel]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8CB33E]"></div>
                <span className="ml-4 font-black text-[#11261F] uppercase tracking-widest text-sm">Calculando NIC 41...</span>
            </div>
        );
    }

    if (error || !finanzas) {
        return (
            <div className="bg-red-50 text-red-500 p-6 rounded-2xl border-2 border-red-200">
                <p className="font-black uppercase tracking-widest">{error || "Error Desconocido"}</p>
            </div>
        );
    }

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: finanzas.moneda, maximumFractionDigits: 0 }).format(val);

    const handleExportarExcel = () => {
        if (!finanzas) return;
        
        const data = finanzas.centros_costo.map(lote => ({
            "Centro de Costo": lote.nombre_lote,
            "Cabezas Totales": lote.cabezas,
            "Activos Consumibles (Cabezas)": lote.consumible_cabezas || 0,
            "Activos Productores (Cabezas)": lote.productor_cabezas || 0,
            "Biomasa (kg)": lote.biomasa_kg,
            "Valor Razonable": lote.valor_razonable,
            "Costo Sanidad": lote.costos_sanidad,
            "Costo Nutrición": lote.costos_nutricion,
            "Utilidad/Pérdida": lote.utilidad_biologica
        }));
        
        exportToExcel(data, `Estado_Resultados_NIC41_${finanzas.moneda}`);
        dashboard.notifySuccess("Sábana de Excel exportada correctamente");
    };

    const [showCostoModal, setShowCostoModal] = useState(false);
    const [costoData, setCostoData] = useState({ categoria: 'Nómina', valor: '', descripcion: '' });

    const handleGuardarCostoFijo = async (e) => {
        e.preventDefault();
        if (!costoData.valor) return;
        try {
            await api.post(`/api/v1/analytics/financiero/${fincaSel}/costos-fijos`, {
                fecha: new Date().toISOString().split('T')[0],
                categoria: costoData.categoria,
                descripcion: costoData.descripcion,
                valor: parseFloat(costoData.valor)
            });
            dashboard.notifySuccess("Costo fijo registrado correctamente");
            setShowCostoModal(false);
            setCostoData({ categoria: 'Nómina', valor: '', descripcion: '' });
            // Recargar datos
            const res = await api.get(`/api/v1/analytics/financiero/${fincaSel}`);
            setFinanzas(res.data);
        } catch (err) {
            dashboard.notifyError("Error al registrar el costo fijo");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* ════════ HEADER FINANCIERO ════════ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 md:p-10 rounded-[32px] shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#8CB33E] rounded-full blur-3xl opacity-5 -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10">
                    <span className="bg-[#11261F] text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest mb-4 inline-block">
                        Auditoría NIIF Pymes
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black text-[#11261F] tracking-tight">Estado de Resultados (NIC 41)</h2>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Cálculo de Capital Biológico y Rentabilidad Operativa</p>
                </div>

                <div className="flex gap-4 relative z-10">
                    <button 
                        onClick={() => setShowCostoModal(true)}
                        className="bg-[#11261F] text-white hover:bg-[#1e3d33] px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        + Ingresar Gasto
                    </button>
                    <button 
                        onClick={handleExportarExcel}
                        className="bg-[#E6F4D7] text-[#8CB33E] hover:bg-[#8CB33E] hover:text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-[#8CB33E]/20"
                    >
                        📥 Exportar a Siigo / Helisa
                    </button>
                </div>
            </div>

            {/* ════════ MACRO MÉTRICAS ════════ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#8CB33E] transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capital Biológico</p>
                    <h3 className="text-2xl font-black text-[#11261F] tracking-tighter">{formatMoney(finanzas.capital_biologico_total)}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Valor Razonable del hato.</p>
                </div>
                
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-400 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costos Variables</p>
                    <h3 className="text-2xl font-black text-red-500 tracking-tighter">{formatMoney(finanzas.costo_operativo_total)}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Sanidad y Nutrición.</p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-400 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gastos Fijos (Mes)</p>
                    <h3 className="text-2xl font-black text-orange-500 tracking-tighter">{formatMoney(finanzas.costo_fijo_total || 0)}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Nómina, servicios, arriendos.</p>
                </div>
                
                <div className={`rounded-3xl p-6 border shadow-sm relative overflow-hidden group transition-all ${finanzas.utilidad_neta_total >= 0 ? 'bg-[#11261F] border-[#11261F]' : 'bg-red-50 border-red-200'}`}>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Utilidad Neta</p>
                    <h3 className={`text-3xl font-black tracking-tighter ${finanzas.utilidad_neta_total >= 0 ? 'text-[#8CB33E]' : 'text-red-500'}`}>
                        {formatMoney(finanzas.utilidad_neta_total || finanzas.utilidad_biologica_total)}
                    </h3>
                    <p className="text-[10px] text-white/70 mt-1">Ganancia real descontando todo.</p>
                </div>
            </div>

            {/* MODAL COSTOS FIJOS */}
            {showCostoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="bg-[#F4F6F4] p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-[#11261F] text-lg uppercase tracking-wider">Ingresar Gasto Fijo</h3>
                            <button onClick={() => setShowCostoModal(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleGuardarCostoFijo} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Categoría</label>
                                <select 
                                    value={costoData.categoria}
                                    onChange={e => setCostoData({...costoData, categoria: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-[#11261F] focus:border-[#8CB33E] outline-none"
                                >
                                    <option>Nómina</option>
                                    <option>Servicios</option>
                                    <option>Mantenimiento</option>
                                    <option>Arriendo</option>
                                    <option>Insumos Generales</option>
                                    <option>Otros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Valor ($)</label>
                                <input 
                                    type="number" 
                                    required
                                    value={costoData.valor}
                                    onChange={e => setCostoData({...costoData, valor: e.target.value})}
                                    placeholder="Ej: 1500000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-[#11261F] focus:border-[#8CB33E] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Descripción (Opcional)</label>
                                <input 
                                    type="text" 
                                    value={costoData.descripcion}
                                    onChange={e => setCostoData({...costoData, descripcion: e.target.value})}
                                    placeholder="Ej: Pago quincena operarios"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-[#11261F] focus:border-[#8CB33E] outline-none"
                                />
                            </div>
                            <button type="submit" className="w-full bg-[#11261F] text-white hover:bg-[#8CB33E] py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                                Registrar Gasto
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════ CENTROS DE COSTO (LOTES) ════════ */}
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-[#11261F]">Desglose por Centros de Costo</h3>
                        <p className="text-sm text-slate-500">Rentabilidad individualizada por Lote</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-white text-[10px] uppercase tracking-widest text-slate-400">
                                <th className="p-6 font-black">Centro de Costo (Lote)</th>
                                <th className="p-6 font-black">Cabezas</th>
                                <th className="p-6 font-black">Clasificación NIC 41</th>
                                <th className="p-6 font-black">Biomasa</th>
                                <th className="p-6 font-black">Valor Razonable</th>
                                <th className="p-6 font-black">Costo Sanidad</th>
                                <th className="p-6 font-black">Costo Nutrición</th>
                                <th className="p-6 font-black">Utilidad / Pérdida</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-semibold text-[#11261F] divide-y divide-slate-50">
                            {finanzas.centros_costo.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-10 text-center text-slate-400">No hay lotes con animales activos para costear.</td>
                                </tr>
                            ) : (
                                finanzas.centros_costo.map((lote) => (
                                    <tr key={lote.id_lote} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#E6F4D7] text-[#8CB33E] flex items-center justify-center text-xs font-black">
                                                    CC
                                                </div>
                                                <span className="uppercase tracking-wide">{lote.nombre_lote}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">{lote.cabezas}</td>
                                        <td className="p-6 text-xs text-slate-500 space-y-1">
                                            {lote.consumible_cabezas > 0 && <div><span className="text-[#8CB33E] font-black">{lote.consumible_cabezas}</span> Consumibles</div>}
                                            {lote.productor_cabezas > 0 && <div><span className="text-blue-500 font-black">{lote.productor_cabezas}</span> Productores</div>}
                                        </td>
                                        <td className="p-6">{lote.biomasa_kg.toLocaleString('es-CO')} kg</td>
                                        <td className="p-6 text-[#8CB33E]">{formatMoney(lote.valor_razonable)}</td>
                                        <td className="p-6 text-red-400">{formatMoney(lote.costos_sanidad)}</td>
                                        <td className="p-6 text-red-400">{formatMoney(lote.costos_nutricion)}</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider ${lote.utilidad_biologica >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                {formatMoney(lote.utilidad_biologica)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest mt-8">
                Cálculo basado en NIC 41 - NIIF para Pymes Sección 34. Moneda base: {finanzas.moneda}
            </div>
        </div>
    );
}
