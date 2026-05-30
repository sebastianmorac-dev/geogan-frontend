import React from 'react';

export default function NutricionTab({ setShowSuministroModal }) {
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
                            <p className="text-xs font-bold text-gray-300 uppercase mb-2">Costo promedio por kilo ganado</p>
                            {/* REMOVED fake stat "$4,200" */}
                            <p className="text-4xl font-black italic text-gray-500">-</p>
                        </div>
                    </div>

                    {/* Gráfico de Ganancia (Maquetación) */}
                    <div className="bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                        <h5 className="text-sm font-black uppercase tracking-widest mb-6">Tendencia de Ganancia de Peso</h5>
                        <div className="h-40 flex items-center justify-center text-center text-gray-400 text-sm font-bold border border-dashed border-[#E6F4D7] rounded-xl">
                            Sin datos suficientes para graficar
                        </div>
                    </div>
                </div>

                {/* HISTORIAL DE SUMINISTRO (COLUMNA 2 y 3) */}
                <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="text-xl font-black uppercase text-[#11261F]">Historial de Alimento Suministrado</h4>
                        <button onClick={() => setShowSuministroModal(true)} className="bg-[#8CB33E] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-[#7a9d35]">Repartir Alimento Ahora</button>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-[#F4F6F4] text-xs font-black uppercase text-gray-500">
                            <tr><th className="px-6 py-4 rounded-tl-2xl">Fecha</th><th className="px-6 py-4">Lote Destino</th><th className="px-6 py-4">Producto (Solo Alimentos)</th><th className="px-6 py-4">Cantidad</th><th className="px-6 py-4 rounded-tr-2xl text-right">Acciones</th></tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6F4D7]">
                            {/* REMOVED: fake table rows */}
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500 font-bold uppercase">Sin registros de suministro</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
