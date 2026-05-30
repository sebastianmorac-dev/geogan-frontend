import React from 'react';
import RoleGuard from '../../auth/RoleGuard';

export default function BodegaTab({ insumos, setShowNuevoProductoModal, setShowCompraModal, setInsumoEditData, setShowEditarInsumoModal, handleEliminarInsumo }) {
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
                <div>
                    <h4 className="text-xl font-black uppercase text-[#11261F]">Inventario General de la Finca</h4>
                    <p className="text-gray-500 mt-1 font-medium">Control de insumos, stock y costos promedio.</p>
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

            {/* GRID DE INVENTARIO */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                {insumos.map((ins) => {
                    const stockActual = parseFloat(ins.stock_actual_unidad ?? ins.stock_actual_kg ?? 0);
                    const puntoCritico = parseFloat(ins.punto_critico_unidad ?? 50);
                    const esCritico = stockActual <= puntoCritico;
                    const costoPromedio = ins.costo_promedio_unidad || ins.costo_promedio_kg || 0;
                    const unidad = ins.unidad_empaque || 'UN';

                    return (
                        <div key={ins.id_insumo} className={`p-6 rounded-[32px] border-2 flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${esCritico ? 'border-red-500 bg-red-50/50' : 'border-[#E6F4D7] bg-white'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-black text-[#11261F] text-lg uppercase leading-tight pr-4">{ins.nombre_insumo}</h4>
                                    {esCritico && <span className="text-[9px] bg-red-500 text-white px-3 py-1.5 rounded-xl animate-pulse font-black uppercase tracking-widest text-center whitespace-nowrap shadow-sm">CRÍTICO</span>}
                                </div>
                                
                                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Stock Disponible</p>
                                <p className={`text-4xl font-black tabular-nums tracking-tighter ${esCritico ? 'text-red-600' : 'text-[#8CB33E]'}`}>
                                    {stockActual} <span className="text-sm font-bold text-gray-500 tracking-normal ml-1">{unidad}</span>
                                </p>

                                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mt-6 mb-1" title="Precio real unitario">Costo Promedio (CPP)</p>
                                <p className="text-xl font-black text-[#11261F]">$ {Number(costoPromedio).toLocaleString('es-CO')} <span className="text-[10px] text-gray-400">/{unidad}</span></p>
                            </div>

                            <div className="flex justify-between items-center mt-8 pt-6 border-t border-dashed border-black/5">
                                <RoleGuard allowedRoles={['propietario', 'encargado', 'superadmin']}>
                                    <button
                                        onClick={() => {
                                            setInsumoEditData({ id_insumo: ins.id_insumo, nombre: ins.nombre_insumo, cantidad: stockActual, precio: costoPromedio });
                                            setShowEditarInsumoModal(true);
                                        }}
                                        className="text-[10px] font-black uppercase text-gray-500 hover:text-[#8CB33E] tracking-widest transition-colors flex gap-2 items-center"
                                    >
                                        ⚙️ Editar
                                    </button>
                                </RoleGuard>
                                <RoleGuard allowedRoles={['propietario', 'encargado', 'superadmin']}>
                                    <button
                                        onClick={() => handleEliminarInsumo(ins.id_insumo, ins.nombre_insumo)}
                                        className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 tracking-widest transition-colors flex gap-2 items-center"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </RoleGuard>
                            </div>
                        </div>
                    );
                })}
                {insumos.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-[#E6F4D7]">
                        <p className="text-gray-500 font-bold text-lg">Tu bodega está vacía.</p>
                        <p className="text-sm text-gray-400 mt-2">Registra compras para alimentar tu inventario inteligente.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
