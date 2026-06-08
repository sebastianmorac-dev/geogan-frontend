import React, { useState } from 'react';
import RoleGuard from '../../auth/RoleGuard';
import { Search, AlertTriangle, Settings, Trash2 } from 'lucide-react';

export default function BodegaTab({ insumos, setShowNuevoProductoModal, setShowCompraModal, setInsumoEditData, setShowEditarInsumoModal, handleEliminarInsumo }) {
    const [searchTerm, setSearchTerm] = useState('');
    // --- KPIs FINANCIEROS UNIFICADOS (Tomados de BodegaPage.jsx) ---
    const capitalTotal = insumos.reduce((total, insumo) => {
        const stockActual = parseFloat(insumo.stock_actual_unidad ?? insumo.stock_actual_kg ?? 0);
        const costoPromedio = parseFloat(insumo.costo_promedio_unidad ?? insumo.costo_promedio_kg ?? 0);
        return total + (stockActual * costoPromedio);
    }, 0);

    const insumosCriticos = insumos.filter(insumo => {
        const stockActual = parseFloat(insumo.stock_actual_unidad ?? insumo.stock_actual_kg ?? 0);
        const puntoCritico = parseFloat(insumo.punto_critico_unidad ?? insumo.punto_critico_kg ?? 50);
        return stockActual <= puntoCritico;
    }).length;

    return (
        <div className="animate-in slide-in-from-right-4 duration-500">
            {/* ENCABEZADO Y ACCIONES */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-4">
                <div className="flex items-center gap-6 w-full md:w-auto">
                    <div>
                        <h4 className="text-xl font-black uppercase text-[#11261F]">Inventario General de la Finca</h4>
                        <p className="text-gray-500 mt-1 font-medium">Control de insumos, stock y costos promedio.</p>
                    </div>
                </div>
                <div className="relative flex-1 md:w-64 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input 
                        type="text" 
                        placeholder="Buscar producto por nombre..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-[#8CB33E] transition-colors shadow-sm"
                    />
                </div>
                <RoleGuard allowedRoles={['propietario', 'encargado', 'superadmin']}>
                    <div className="flex gap-4">
                        <button onClick={() => setShowNuevoProductoModal(true)} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors">+ Crear Producto</button>
                        <button onClick={() => setShowCompraModal(true)} className="bg-[#11261F] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-lg">+ Registrar Nueva Compra</button>
                    </div>
                </RoleGuard>
            </div>

            {/* TARJETAS DE KPIs (Inspiradas en BodegaPage pero con UI de Dashboard) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 px-4">
                <div className="bg-[#11261F] text-white rounded-3xl p-6 shadow-md border border-[#E6F4D7]">
                    <h3 className="text-[#8CB33E] text-[10px] font-black uppercase tracking-widest mb-2">Capital Invertido (Stock)</h3>
                    <p className="text-3xl font-black italic">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(capitalTotal)}
                    </p>
                </div>
                <div className="bg-white border border-[#E6F4D7] rounded-3xl p-6 shadow-sm">
                    <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Total de Productos</h3>
                    <p className="text-3xl font-black text-[#11261F]">{insumos.length}</p>
                </div>
                <div className={`border rounded-3xl p-6 shadow-sm transition-colors ${insumosCriticos > 0 ? 'bg-red-50/50 border-red-500' : 'bg-white border-[#E6F4D7]'}`}>
                    <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Alertas de Stock</h3>
                    <p className={`text-3xl font-black ${insumosCriticos > 0 ? 'text-red-600' : 'text-[#8CB33E]'}`}>
                        {insumosCriticos} {insumosCriticos === 1 ? 'crítico' : 'críticos'}
                    </p>
                </div>
            </div>

            {/* TABLA DE INVENTARIO */}
            <div className="bg-white rounded-[40px] border border-[#E6F4D7] shadow-sm overflow-hidden mx-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#F4F6F4] border-b border-[#E6F4D7] text-xs font-black uppercase text-gray-500">
                            <tr>
                                <th className="px-8 py-5">Producto</th>
                                <th className="px-6 py-5 text-center">Estado</th>
                                <th className="px-8 py-5 text-right">Stock Disponible</th>
                                <th className="px-8 py-5 text-right">Costo Promedio Unitario</th>
                                <th className="px-8 py-5 text-right">Costo Total</th>
                                <th className="px-8 py-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6F4D7]">
                            {insumos.filter(ins => ins.nombre_insumo?.toLowerCase().includes(searchTerm.toLowerCase())).map((ins) => {
                                const stockActual = parseFloat(ins.stock_actual_unidad ?? ins.stock_actual_kg ?? 0);
                                const puntoCritico = parseFloat(ins.punto_critico_unidad ?? 50);
                                const esCritico = stockActual <= puntoCritico;
                                const costoPromedio = ins.costo_promedio_unidad || ins.costo_promedio_kg || 0;
                                const unidad = ins.unidad_empaque || 'UN';
                                const totalValor = stockActual * costoPromedio;

                                return (
                                    <tr key={ins.id_insumo} className={`hover:bg-[#F4F6F4]/50 transition-colors border-b border-gray-50 ${esCritico ? 'bg-red-50/20 hover:bg-red-50/40' : ''}`}>
                                        <td className="px-8 py-4 font-black uppercase text-[#11261F]">
                                            {ins.nombre_insumo}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {esCritico ? (
                                                <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    <AlertTriangle className="w-3 h-3" /> Crítico
                                                </span>
                                            ) : (
                                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    Óptimo
                                                </span>
                                            )}
                                        </td>
                                        <td className={`px-8 py-4 text-right font-black text-xl tabular-nums ${esCritico ? 'text-red-600' : 'text-[#8CB33E]'}`}>
                                            {stockActual} <span className="text-xs font-bold text-gray-500 ml-1 tracking-normal">{unidad}</span>
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-gray-700 tabular-nums">
                                            $ {Number(costoPromedio).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-[#11261F] tabular-nums">
                                            $ {Number(totalValor).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <div className="flex justify-center items-center gap-3">
                                                <RoleGuard allowedRoles={['propietario', 'encargado', 'superadmin']}>
                                                    <button
                                                        onClick={() => {
                                                            setInsumoEditData({ id_insumo: ins.id_insumo, nombre: ins.nombre_insumo, cantidad: stockActual, precio: costoPromedio });
                                                            setShowEditarInsumoModal(true);
                                                        }}
                                                        className="text-gray-400 hover:text-[#8CB33E] transition-colors p-2"
                                                        title="Editar Insumo"
                                                    >
                                                        <Settings className="w-5 h-5" />
                                                    </button>
                                                </RoleGuard>
                                                <RoleGuard allowedRoles={['propietario', 'encargado', 'superadmin']}>
                                                    <button
                                                        onClick={() => handleEliminarInsumo(ins.id_insumo, ins.nombre_insumo)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                                        title="Eliminar Insumo"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </RoleGuard>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {insumos.filter(ins => ins.nombre_insumo?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-16 text-center">
                                        <p className="text-gray-500 font-bold text-lg">
                                            {searchTerm ? 'No se encontraron productos.' : 'Tu bodega está vacía.'}
                                        </p>
                                        <p className="text-sm text-gray-400 mt-2">
                                            {searchTerm ? 'Intenta buscar con otros términos.' : 'Registra compras para alimentar tu inventario inteligente.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
