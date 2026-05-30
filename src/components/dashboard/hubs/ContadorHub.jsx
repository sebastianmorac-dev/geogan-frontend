// src/components/dashboard/hubs/ContadorHub.jsx
// WRAPPER CONTABLE: Vista de Auditoría Financiera para el Contador
// Monta BodegaTab con una cabecera de exportación y KPIs financieros.

import React from 'react';
import BodegaTab from '../tabs/BodegaTab';
import { notifySuccess, notifyWarning } from '../../../utils/notify';

/**
 * ContadorHub — Vista de Auditoría para el Contador
 * 
 * Envuelve BodegaTab con herramientas de exportación y visualización contable.
 * Los botones operativos (Comprar, Suministrar) dentro de BodegaTab son ocultados
 * por el RoleGuard interno que se agregó al componente base.
 * 
 * @param {Object} dashboard - Estado completo de useDashboardData()
 */
export default function ContadorHub({ dashboard }) {
    const insumos = dashboard.insumos || [];

    // --- KPIs Contables ---
    const capitalInventario = insumos.reduce((total, ins) => {
        const stock = parseFloat(ins.stock_actual_unidad ?? ins.stock_actual_kg ?? 0);
        const cpp = parseFloat(ins.costo_promedio_unidad ?? ins.costo_promedio_kg ?? 0);
        return total + (stock * cpp);
    }, 0);

    const productosRegistrados = insumos.length;
    const productosSinCosto = insumos.filter(ins => {
        const cpp = parseFloat(ins.costo_promedio_unidad ?? ins.costo_promedio_kg ?? 0);
        return cpp === 0;
    }).length;

    // --- Exportación CSV para la DIAN ---
    const handleExportarCSV = () => {
        if (insumos.length === 0) {
            notifyWarning("No hay productos en la bodega para exportar.");
            return;
        }

        const headers = ['Producto', 'Tipo', 'Unidad Medida', 'Stock Actual', 'Costo Promedio Unitario', 'Valor Total en Inventario'];
        const rows = insumos.map(ins => {
            const stock = parseFloat(ins.stock_actual_unidad ?? ins.stock_actual_kg ?? 0);
            const cpp = parseFloat(ins.costo_promedio_unidad ?? ins.costo_promedio_kg ?? 0);
            const valorTotal = stock * cpp;
            return [
                `"${ins.nombre_insumo}"`,
                `"${ins.tipo_insumo || 'General'}"`,
                `"${ins.unidad_empaque || 'UN'}"`,
                stock,
                cpp.toFixed(2),
                valorTotal.toFixed(2)
            ].join(',');
        });

        // Fila totalizadora
        rows.push(['', '', '', '', 'TOTAL INVENTARIO:', capitalInventario.toFixed(2)].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const BOM = '\uFEFF'; // Para que Excel reconozca tildes
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        const fechaHoy = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `GeoGan_Inventario_DIAN_${fechaHoy}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        notifySuccess("📥 Archivo CSV descargado. Listo para importar en tu software contable.");
    };

    return (
        <div className="space-y-8">
            {/* CABECERA DE AUDITORÍA CONTABLE */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-[32px] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-3">🧾 Control Contable de Inventarios</p>
                            <h2 className="text-4xl font-black uppercase tracking-tight">Auditoría de Bodega</h2>
                        </div>
                        <button 
                            onClick={handleExportarCSV}
                            className="bg-[#8CB33E] hover:bg-lime-600 text-white px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3"
                        >
                            📥 Exportar a Excel (DIAN)
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Capital en Inventario</p>
                            <p className="text-3xl font-black italic text-amber-400">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(capitalInventario)}
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Productos Registrados</p>
                            <p className="text-3xl font-black italic text-white">{productosRegistrados}</p>
                        </div>
                        <div className={`backdrop-blur-sm rounded-2xl p-6 border ${productosSinCosto > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-white/10 border-white/5'}`}>
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Sin Costo Asignado</p>
                            <p className={`text-3xl font-black italic ${productosSinCosto > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {productosSinCosto}
                            </p>
                            {productosSinCosto > 0 && (
                                <p className="text-[9px] text-red-300 font-bold mt-1 uppercase">⚠️ Requieren compra inicial</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* NOTA INFORMATIVA PARA EL CONTADOR */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
                <span className="text-2xl">📋</span>
                <div>
                    <p className="text-sm font-black text-amber-800 uppercase mb-1">Modo Solo Lectura Activado</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                        Como contador, puedes revisar todos los costos y stock pero las operaciones de compra y suministro son exclusivas del administrador de finca. 
                        Usa el botón <strong>"Exportar a Excel"</strong> para descargar el inventario valorizado listo para tu software contable o para reportar a la DIAN.
                    </p>
                </div>
            </div>

            {/* BODEGA TAB — Los botones operativos ya están ocultos por RoleGuard interno */}
            <BodegaTab {...dashboard} />
        </div>
    );
}
