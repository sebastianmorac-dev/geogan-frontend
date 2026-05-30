import React from 'react';
import { Truck } from 'lucide-react';

export default function GanadoEnTransito({ allAnimales }) {
    // Filtrado estricto por estado 'en_transito'
    const animalesEnTransito = (allAnimales || []).filter(animal => 
        animal.estado && animal.estado.toLowerCase() === 'en_transito'
    );

    return (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 flex items-center gap-4">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
                    <Truck className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter text-[#11261F]">Ganado por Recibir / En Camino</h3>
                    <p className="text-xs text-slate-500 font-bold">Animales pre-registrados pendientes de pesaje de ingreso a lote.</p>
                </div>
                {animalesEnTransito.length > 0 && (
                    <div className="ml-auto bg-amber-100 text-amber-800 px-4 py-2 rounded-xl font-black text-sm">
                        {animalesEnTransito.length} CABEZAS
                    </div>
                )}
            </div>

            <div className="p-8">
                {animalesEnTransito.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold">No hay despachos ni lotes pendientes por recibir en este momento.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="pb-4 font-black text-[10px] uppercase text-slate-400 tracking-widest pl-4">Código / Chapeta</th>
                                    <th className="pb-4 font-black text-[10px] uppercase text-slate-400 tracking-widest">Raza / Sexo</th>
                                    <th className="pb-4 font-black text-[10px] uppercase text-slate-400 tracking-widest">Peso (Manifiesto)</th>
                                    <th className="pb-4 font-black text-[10px] uppercase text-slate-400 tracking-widest">Registro SINIGÁN</th>
                                    <th className="pb-4 font-black text-[10px] uppercase text-slate-400 tracking-widest">Guía Movilización</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {animalesEnTransito.map((animal) => (
                                    <tr key={animal.id_animal} className="hover:bg-slate-50 transition-colors group">
                                        <td className="py-4 pl-4">
                                            <span className="font-black text-sm text-[#11261F]">{animal.codigo_identificacion}</span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs text-slate-700">{animal.raza || 'N/A'}</span>
                                                <span className="text-[10px] text-slate-400 font-black uppercase">{animal.sexo || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className="font-black text-sm text-slate-700">{animal.peso ? `${animal.peso} KG` : 'N/A'}</span>
                                        </td>
                                        <td className="py-4">
                                            <span className="font-bold text-xs text-slate-600">{animal.registro_sinigan || 'Sin registro'}</span>
                                        </td>
                                        <td className="py-4">
                                            <span className="font-bold text-xs text-slate-600">{animal.guia_movilizacion_ingreso || 'Sin guía'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
