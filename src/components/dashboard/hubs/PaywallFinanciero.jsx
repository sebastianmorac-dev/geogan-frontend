import React from 'react';

export default function PaywallFinanciero({ rol }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-xl mb-8 border-4 border-amber-100 text-4xl">
                🔒
            </div>
            
            <h2 className="text-4xl font-black uppercase tracking-tight mb-4 text-[#11261F]">
                Módulo Financiero Bloqueado
            </h2>
            
            <p className="text-slate-500 text-lg max-w-xl leading-relaxed mb-10">
                La Finca actual no cuenta con la <strong>Suscripción Premium GeoGan Financiero</strong> activa. 
                Este módulo cumple estrictamente con la normativa contable NIC 41 y NIIF para Pymes, calculando automáticamente P&G, Depreciación y Valor Razonable.
            </p>

            <div className="bg-white rounded-[32px] p-8 md:p-12 border border-[#E6F4D7] shadow-lg max-w-3xl w-full text-left">
                <h3 className="text-xl font-black text-[#8CB33E] uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">
                    ¿Qué incluye la suscripción?
                </h3>
                
                <ul className="space-y-4 mb-10">
                    <li className="flex items-start gap-4">
                        <span className="bg-[#E6F4D7] text-[#8CB33E] p-2 rounded-xl text-lg">💰</span>
                        <div>
                            <p className="font-black text-[#11261F]">Cálculo de Capital Biológico en Tiempo Real</p>
                            <p className="text-sm text-slate-500 mt-1">Conozca el Valor Razonable exacto de su ganado basado en precios de mercado actualizados.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-4">
                        <span className="bg-[#E6F4D7] text-[#8CB33E] p-2 rounded-xl text-lg">📊</span>
                        <div>
                            <p className="font-black text-[#11261F]">Pérdidas y Ganancias (P&G) Automático</p>
                            <p className="text-sm text-slate-500 mt-1">Cruza el costo de medicinas y alimento contra los kilos ganados en campo. Descubra qué animales dan rentabilidad.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-4">
                        <span className="bg-[#E6F4D7] text-[#8CB33E] p-2 rounded-xl text-lg">📄</span>
                        <div>
                            <p className="font-black text-[#11261F]">Exportación Contable (NIC 41)</p>
                            <p className="text-sm text-slate-500 mt-1">Sábanas de Excel listas para importar en software contable, separadas por Centros de Costo (Lotes).</p>
                        </div>
                    </li>
                </ul>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button className="bg-[#11261F] text-white px-8 py-4 rounded-2xl text-sm font-black uppercase shadow-xl hover:bg-[#8CB33E] hover:shadow-2xl hover:-translate-y-1 transition-all w-full sm:w-auto">
                        Contactar Asesor de Ventas
                    </button>
                    {rol === 'contador' && (
                        <p className="text-xs text-slate-400 font-bold mt-4 sm:mt-0 max-w-xs text-center sm:text-left">
                            Como Contador, por favor solicite al Propietario que habilite el plan Premium.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
