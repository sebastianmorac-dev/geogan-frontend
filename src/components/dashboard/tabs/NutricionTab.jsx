import React, { useState } from 'react';

export default function NutricionTab({ setShowSuministroModal, historialNutricion = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    return (
        <div className="animate-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* EXPLICACIÓN Y GRÁFICO (COLUMNA 1) */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <div className="bg-[#11261F] rounded-[40px] p-10 text-white shadow-xl">
                        <h5 className="text-2xl font-black uppercase mb-4 text-[#8CB33E]">Inversión Nutricional</h5>
                        <p className="text-sm text-white/80 leading-relaxed mb-6 font-medium">
                            Esto es lo que has invertido en comida para que tus animales ganen peso. Si el número es verde y el ganado sube de peso, vas por buen camino.
                        </p>
                        <div className="bg-white/10 p-6 rounded-3xl border border-white/5">
                            <p className="text-xs font-bold text-gray-300 uppercase mb-2">Suministros Totales</p>
                            <p className="text-4xl font-black italic text-gray-300">{historialNutricion.length}</p>
                        </div>
                    </div>

                    {/* Gráfico de Ganancia (Maquetación) */}
                    <div className="bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                        <h5 className="text-sm font-black uppercase tracking-widest mb-6">Tendencia de Inversión</h5>
                        <div className="h-40 flex items-center justify-center text-center text-gray-400 text-sm font-bold border border-dashed border-[#E6F4D7] rounded-xl">
                            Gráfica de tendencia
                        </div>
                    </div>
                </div>

                {/* HISTORIAL DE SUMINISTRO (COLUMNA 2 y 3) */}
                <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <h4 className="text-xl font-black uppercase text-[#11261F]">Historial de Alimento Suministrado</h4>
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <input 
                                type="text" 
                                placeholder="Buscar por lote o producto..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-64 bg-white border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:border-[#8CB33E] transition-colors shadow-sm"
                            />
                            <button onClick={() => setShowSuministroModal(true)} className="bg-[#8CB33E] text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-[#7a9d35] transition-colors whitespace-nowrap">Repartir Alimento Ahora</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#F4F6F4] text-xs font-black uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-2xl">Fecha</th>
                                    <th className="px-6 py-4">Lote Destino</th>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4 rounded-tr-2xl text-right">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6F4D7]">
                                {historialNutricion.filter(item => (item.nombre_lote || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.nombre_insumo || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-bold uppercase">
                                            {searchTerm ? 'No se encontraron registros de nutrición.' : 'Sin registros de suministro nutricional.'}
                                        </td>
                                    </tr>
                                ) : (
                                    historialNutricion.filter(item => (item.nombre_lote || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.nombre_insumo || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-600">{new Date(item.fecha_evento).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-sm font-black text-[#11261F] uppercase">{item.nombre_lote || 'Lote General'}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-[#8CB33E] uppercase">{item.nombre_insumo}</td>
                                            <td className="px-6 py-4 text-sm font-black text-gray-700 text-right">{item.cantidad} {item.unidad_empaque}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
