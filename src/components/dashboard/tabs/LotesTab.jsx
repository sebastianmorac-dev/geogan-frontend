import React, { useState } from 'react';
import RoleGuard from '../../auth/RoleGuard';
import useAuthStore from '../../../store/authStore';
import { Search, Settings, Eye } from 'lucide-react';

export default function LotesTab({ 
    selectedLote, lotesEnriquecidos, setShowImportarModal, setShowNuevoLoteModal,
    setSelectedLote, setLoteEditData, setShowEditarLoteModal,
    setShowTratamientoGrupalModal, navigate, fincaSel, allAnimales, handleEliminarAnimal,
    setShowMoverGanado, setShowImportar
}) {
    const user = useAuthStore((state) => state.user);
    const esSuperadmin = user?.rol === 'superadmin';
    const [searchTerm, setSearchTerm] = useState('');

    const lotesFiltrados = lotesEnriquecidos?.filter(l => (l.nombre || 'LOTE GENERAL').toLowerCase().includes(searchTerm.toLowerCase())) || [];

    return (
        <div className="animate-in slide-in-from-left-4 duration-500">
            {!selectedLote ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            <h4 className="text-lg font-black uppercase text-[#11261F]">Tus Lotes Actuales ({lotesEnriquecidos.length})</h4>
                            <div className="relative flex-1 md:w-64">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar lote..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-[#8CB33E] transition-colors shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button onClick={() => setShowMoverGanado(true)} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors flex-1 md:flex-none">Rotar Ganado</button>
                            <button onClick={() => setShowImportarModal(true)} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors flex-1 md:flex-none">Importar Pesajes</button>
                            <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin', 'administrador']}>
                                <button onClick={() => setShowImportar(true)} className="bg-[#E6F4D7] text-[#8CB33E] hover:bg-[#8CB33E] hover:text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-sm transition-colors flex-1 md:flex-none">📥 Importar SINIGÁN</button>
                                <button onClick={() => setShowNuevoLoteModal(true)} className="bg-[#11261F] text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-[#8CB33E] transition-colors flex-1 md:flex-none">+ Nuevo Lote</button>
                            </RoleGuard>
                        </div>
                    </div>

                    <div className="bg-white rounded-[40px] border border-[#E6F4D7] shadow-sm overflow-hidden mx-4 mt-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#F4F6F4] border-b border-[#E6F4D7] text-xs font-black uppercase text-gray-500">
                                    <tr>
                                        <th className="px-8 py-5">Potrero</th>
                                        <th className="px-6 py-5 text-center">Responsable</th>
                                        <th className="px-6 py-5 text-center">Inventario</th>
                                        <th className="px-6 py-5 text-right">Biomasa / Prom.</th>
                                        <th className="px-6 py-5 text-center">Meta GMD</th>
                                        <th className="px-8 py-5">El Oráculo (Estado)</th>
                                        <th className="px-8 py-5 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E6F4D7]">
                                    {lotesFiltrados.length > 0 ? (
                                        lotesFiltrados.map(lote => {
                                            const pesoIdealVenta = 450;
                                            const pesoPromLote = lote.peso_promedio || 0;
                                            const gmdReal = lote.gmd_promedio_lote || 0;
                                            const kgFaltantes = pesoIdealVenta - pesoPromLote;
                                            
                                            let estado = 'calculando';
                                            let diasEst = 0;
                                            let fechaLote = null;
                                            
                                            if (lote.cabezas_reales > 0) {
                                                if (pesoPromLote >= pesoIdealVenta) {
                                                    estado = 'listo';
                                                } else if (gmdReal > 0) {
                                                    diasEst = Math.ceil(kgFaltantes / gmdReal);
                                                    if (diasEst > 730) {
                                                        estado = 'inviable';
                                                    } else {
                                                        estado = 'activo';
                                                        fechaLote = new Date();
                                                        fechaLote.setDate(fechaLote.getDate() + diasEst);
                                                    }
                                                } else {
                                                    estado = 'estancado';
                                                }
                                            }

                                            return (
                                                <tr key={lote.id_lote || 'general'} className="hover:bg-[#F4F6F4]/50 transition-colors border-b border-gray-50">
                                                    {/* Potrero */}
                                                    <td className="px-8 py-4">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8CB33E] mb-1">{lote.tipo_manejo || 'Propósito General'}</p>
                                                        <h3 className="text-base font-black text-[#11261F] uppercase" title={lote.nombre || 'LOTE GENERAL'}>
                                                            {lote.nombre || 'LOTE GENERAL'}
                                                        </h3>
                                                    </td>
                                                    
                                                    {/* Responsable */}
                                                    <td className="px-6 py-4 text-center">
                                                        {lote.responsables && lote.responsables.length > 0 ? (
                                                            <div className="flex flex-col gap-1 items-center">
                                                                {lote.responsables.map((r, idx) => (
                                                                    <span key={r.id || idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                                                        {r.nombre_completo}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block">
                                                                Sin Asignar
                                                            </span>
                                                        )}
                                                    </td>
                                                    
                                                    {/* Inventario / Descanso */}
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="bg-[#F4F6F4] inline-block px-4 py-2 rounded-xl text-center">
                                                            <p className="text-xl font-black text-[#11261F] tabular-nums leading-none">{lote.cabezas_reales || 0}</p>
                                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Cabezas</p>
                                                        </div>
                                                        {lote.cabezas_reales === 0 && lote.fecha_inicio_descanso && (
                                                            <div className="mt-2 text-center">
                                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                                                                    🌿 {Math.floor((new Date() - new Date(lote.fecha_inicio_descanso)) / (1000 * 60 * 60 * 24))} días de descanso
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    
                                                    {/* Biomasa / Promedio */}
                                                    <td className="px-6 py-4 text-right">
                                                        <p className="text-sm font-black text-[#11261F] tabular-nums">{(lote.biomasa_total || 0).toLocaleString('es-CO')} <span className="text-[10px] text-gray-400">KG Total</span></p>
                                                        <p className="text-xs font-bold text-gray-500 tabular-nums">{(lote.peso_promedio || 0).toFixed(1)} <span className="text-[10px] text-gray-400">KG Prom.</span></p>
                                                    </td>

                                                    {/* Meta GMD */}
                                                    <td className="px-6 py-4 text-center font-black text-[#8CB33E]">
                                                        {lote.gmd_meta ? `${lote.gmd_meta} kg/d` : '---'}
                                                    </td>

                                                    {/* El Oráculo */}
                                                    <td className="px-8 py-4">
                                                        {lote.cabezas_reales === 0 ? (
                                                            <span className="text-gray-400 text-xs italic font-bold">Sin animales</span>
                                                        ) : estado === 'listo' ? (
                                                            <div className="bg-green-50 text-green-700 px-3 py-2 rounded-xl inline-flex items-center gap-2">
                                                                <span className="text-lg">🏆</span>
                                                                <div>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest">Punto Óptimo</p>
                                                                    <p className="text-[10px] font-bold">{pesoPromLote.toFixed(0)}KG - ¡Vender!</p>
                                                                </div>
                                                            </div>
                                                        ) : estado === 'activo' ? (
                                                            <div className="bg-[#11261F]/5 text-[#11261F] px-3 py-2 rounded-xl inline-flex items-center gap-3">
                                                                <span className="text-lg">🔮</span>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-[#8CB33E] uppercase tracking-widest">Est. Venta: {fechaLote.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                                                                    <p className="text-xs font-black tabular-nums">{diasEst} días</p>
                                                                </div>
                                                            </div>
                                                        ) : estado === 'estancado' ? (
                                                            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl inline-flex items-center gap-2">
                                                                <span className="text-lg">📉</span>
                                                                <div>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest">Estancado</p>
                                                                    <p className="text-[10px] font-bold">Revisar nutrición</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded-xl inline-flex items-center gap-2">
                                                                <span className="text-lg">⏳</span>
                                                                <div>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest">Largo Plazo</p>
                                                                    <p className="text-[10px] font-bold">+2 años est.</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Acciones */}
                                                    <td className="px-8 py-4 text-center">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <button 
                                                                onClick={() => setSelectedLote(lote.id_lote || 'general')} 
                                                                className="bg-[#F4F6F4] text-[#11261F] px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#8CB33E] hover:text-white transition-all flex items-center gap-2"
                                                            >
                                                                <Eye className="w-4 h-4" /> Ver
                                                            </button>
                                                            <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                                                                <button 
                                                                    onClick={() => {
                                                                        setLoteEditData({ 
                                                                            id_lote: lote.id_lote, 
                                                                            nombre: lote.nombre, 
                                                                            tipo_manejo: lote.tipo_manejo || 'General', 
                                                                            gmd_meta: lote.gmd_meta || '', 
                                                                            responsables_ids: lote.responsables ? lote.responsables.map(r => r.id) : [] 
                                                                        });
                                                                        setShowEditarLoteModal(true);
                                                                    }} 
                                                                    className="p-2 bg-white border border-[#E6F4D7] text-gray-400 rounded-xl hover:text-[#11261F] hover:border-gray-300 transition-all"
                                                                >
                                                                    <Settings className="w-4 h-4" />
                                                                </button>
                                                            </RoleGuard>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="text-center p-10 text-gray-400 font-bold bg-white">
                                                {searchTerm ? 'No se encontraron lotes con ese nombre.' : 'Calculando biomasa... (o no hay lotes registrados)'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* VISTA DE DETALLE DEL LOTE (NIVEL 2: GRUPAL) */
                <div className="animate-in fade-in duration-500">
                    <section className="bg-white rounded-[40px] border border-[#E6F4D7] overflow-hidden shadow-sm">

                        {/* CABECERA CON TARJETAS DE RESUMEN DEL LOTE */}
                        <div className="p-10 border-b border-[#E6F4D7] bg-[#F4F6F4]/30">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div>
                                    <button onClick={() => setSelectedLote(null)} className="text-[10px] font-black text-[#8CB33E] uppercase mb-2 block hover:underline tracking-widest">← Volver a todos los lotes</button>
                                    <h3 className="text-4xl font-black uppercase italic tracking-tighter text-[#11261F]">Lote: {selectedLote === 'general' ? 'INVENTARIO GENERAL' : (lotesEnriquecidos.find(l => l.id_lote === selectedLote || l.nombre === selectedLote)?.nombre || selectedLote)}</h3>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar animal (ID)..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-9 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-[#8CB33E] transition-colors shadow-sm"
                                        />
                                    </div>
                                    <button onClick={() => setShowTratamientoGrupalModal(true)} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors whitespace-nowrap">Tratamiento Grupal</button>
                                    <button onClick={() => navigate('/registrar-animal', { state: { fromFinca: fincaSel, fromTab: 'lotes', fromLote: selectedLote } })}
                                        className="bg-[#11261F] text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg whitespace-nowrap">+ Nuevo Animal</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-[24px] border border-[#E6F4D7] shadow-sm flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Rendimiento Actual</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-3xl font-black text-[#11261F]">
                                                {allAnimales.filter(a => {
                                                    if (selectedLote === 'general' || selectedLote === 'INVENTARIO GENERAL') return !a.id_lote;
                                                    return a.id_lote === Number(selectedLote) || a.lote === selectedLote;
                                                }).length}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Cabezas</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#11261F] p-6 rounded-[24px] text-white shadow-md flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-[#8CB33E] uppercase tracking-widest mb-4">Sanidad del Grupo</p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                            <span className="text-[10px] font-bold text-gray-300">Última acción</span>
                                            <span className="text-[10px] font-black uppercase text-gray-500">-</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-300">Próxima acción</span>
                                            <span className="text-[10px] font-black uppercase text-gray-500">-</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-50 border border-red-100 p-6 rounded-[24px] flex flex-col justify-center shadow-sm">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                         <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Animales en cuarentena
                                    </p>
                                    <p className="text-xs font-black text-red-900 leading-relaxed uppercase">Animales con medicamento activo. No aptos para venta ni consumo.</p>
                                </div>
                            </div>

                            {/* EL ORÁCULO: INTELIGENCIA COLECTIVA MOCK */}
                            <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-[24px] border border-indigo-100 p-6 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>
                                <div className="relative z-10">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3 flex items-center gap-2">
                                        <span className="text-lg">🔮</span> El Oráculo (IA Comunitaria)
                                    </h4>
                                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                        <div className="flex-1">
                                            <h5 className="text-xl font-black text-[#11261F] uppercase italic mb-2">
                                                Recomendación Predictiva
                                            </h5>
                                            <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                                Analizando <strong>450 fincas</strong> con condiciones climáticas y razas similares en la región, la comunidad logró subir la GMD a <strong>0.82 kg/día</strong> rotando potreros cada 15 días y suplementando con sal proteinada al 8%.
                                            </p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-indigo-100 flex gap-4 min-w-[200px] shadow-sm">
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest mb-1">GMD Proyectada</p>
                                                <p className="text-2xl font-black text-indigo-600">+0.15 kg</p>
                                            </div>
                                            <div className="w-px bg-gray-100"></div>
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest mb-1">Certeza Algoritmo</p>
                                                <p className="text-2xl font-black text-green-500">89%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TABLA ORIGINAL DE ANIMALES */}
                        <table className="w-full text-left">
                            <thead className="bg-[#F4F6F4] border-b border-[#E6F4D7] text-xs font-black uppercase text-gray-500">
                                <tr><th className="px-12 py-6">Identificación</th><th className="px-6 py-6 text-center">Raza</th><th className="px-12 py-6 text-right">Peso Actual</th><th className="px-12 py-6 text-right">Acciones</th></tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6F4D7]">
                                {allAnimales.filter(a => {
                                    if (selectedLote === 'general' || selectedLote === 'INVENTARIO GENERAL') return !a.id_lote;
                                    return a.id_lote === Number(selectedLote) || a.lote === selectedLote;
                                }).filter(a => a.codigo_identificacion?.toLowerCase().includes(searchTerm.toLowerCase())).map((a) => (
                                    <tr key={a.id_animal} onClick={() => navigate(`/animales/detalle/${a.id_animal}`, { state: { fromFinca: fincaSel, fromTab: 'lotes', fromLote: selectedLote } })} className={`cursor-pointer hover:bg-[#F4F6F4]/50 transition-all text-[#11261F] border-b border-gray-100 ${a.apto_para_consumo === false ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-12 py-6 font-black uppercase text-lg">
                                            <div className="flex items-center gap-3">
                                                {a.codigo_identificacion}
                                                {esSuperadmin && (
                                                    <span className="text-[9px] text-gray-400 font-medium">[ID: {a.id_animal}]</span>
                                                )}
                                                {a.apto_para_consumo === false && (
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[9px] font-black animate-pulse uppercase tracking-widest">
                                                        🔴 EN CUARENTENA
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center text-sm font-bold text-gray-500 uppercase">{a.raza || 'Brahman'}</td>
                                        <td className="px-12 py-6 text-right font-black text-2xl">{Number(a.peso).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-normal text-gray-400">kg</span></td>
                                        <td className="px-12 py-6 text-right flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                            <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin', 'encargado']}>
                                                <button onClick={() => navigate(`/animales/editar/${a.id_animal}`, { state: { fromFinca: fincaSel, fromTab: 'lotes', fromLote: selectedLote } })} className="text-xs font-black text-[#8CB33E] hover:underline">EDITAR</button>
                                            </RoleGuard>
                                            <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                                                <button onClick={() => handleEliminarAnimal(a.id_animal)} className="text-xs font-black text-red-500 hover:underline">ELIMINAR</button>
                                            </RoleGuard>
                                        </td>
                                    </tr>
                                ))}
                                {allAnimales.filter(a => {
                                    if (selectedLote === 'general' || selectedLote === 'INVENTARIO GENERAL') return !a.id_lote;
                                    return a.id_lote === Number(selectedLote) || a.lote === selectedLote;
                                }).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-gray-400 font-bold uppercase">No hay animales en este lote.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </section>
                </div>
            )}
        </div>
    );
}
