import React from 'react';
import RoleGuard from '../../auth/RoleGuard';
import useAuthStore from '../../../store/authStore';

export default function LotesTab({ 
    selectedLote, lotesEnriquecidos, setShowImportarModal, setShowNuevoLoteModal,
    setSelectedLote, setLoteEditData, setShowEditarLoteModal,
    setShowTratamientoGrupalModal, navigate, fincaSel, allAnimales, handleEliminarAnimal
}) {
    const user = useAuthStore((state) => state.user);
    const esSuperadmin = user?.rol === 'superadmin';

    return (
        <div className="animate-in slide-in-from-left-4 duration-500">
            {!selectedLote ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                        <h4 className="text-lg font-black uppercase text-[#11261F]">Tus Lotes Actuales ({lotesEnriquecidos.length})</h4>
                        <div className="flex gap-4">
                            <button onClick={() => setShowImportarModal(true)} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors">Importar Pesajes</button>
                            <button onClick={() => setShowNuevoLoteModal(true)} className="bg-[#11261F] text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg">+ Crear Nuevo Lote</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                        
                        {/* TARJETA DE CREACIÓN DE NUEVO LOTE (Protegida) */}
                        <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                            <div 
                                onClick={() => setShowNuevoLoteModal(true)}
                                className="border-2 border-dashed border-[#E6F4D7] rounded-[40px] flex flex-col items-center justify-center p-10 cursor-pointer hover:border-[#8CB33E] hover:bg-[#F4F6F4] transition-all min-h-[250px] group">
                                <div className="w-16 h-16 bg-[#F9FBFA] rounded-full flex items-center justify-center mb-4 group-hover:bg-[#8CB33E] transition-all">
                                    <span className="text-2xl text-[#8CB33E] group-hover:text-white font-black">+</span>
                                </div>
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest group-hover:text-[#11261F]">Abrir Nuevo Potrero</h3>
                            </div>
                        </RoleGuard>

                        {/* RENDERIZADO DEL MOTOR DE LOTES */}
                        {lotesEnriquecidos && lotesEnriquecidos.length > 0 ? (
                            lotesEnriquecidos.map(lote => (
                                <div key={lote.id_lote || 'general'} className="bg-white rounded-[40px] p-8 border border-[#E6F4D7] shadow-sm hover:shadow-lg transition-all relative overflow-hidden">
                                    
                                    {/* Cabecera del Potrero */}
                                    <div className="flex justify-between items-start mb-8 border-b border-[#F4F6F4] pb-6">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#8CB33E] mb-2">{lote.tipo_manejo || 'Propósito General'}</p>
                                            <h3 className="text-2xl font-black text-[#11261F] uppercase tracking-tighter">
                                                {lote.nombre || 'LOTE GENERAL'}
                                                {esSuperadmin && lote.id_lote !== 'general' && (
                                                    <span className="text-[9px] text-gray-400 font-medium ml-2 normal-case tracking-normal">[ID: {lote.id_lote}]</span>
                                                )}
                                            </h3>
                                        </div>
                                        <div className="bg-[#F4F6F4] px-4 py-2 rounded-2xl text-center">
                                            <p className="text-2xl font-black text-[#11261F] tabular-nums leading-none">{lote.cabezas_reales || 0}</p>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Cabezas</p>
                                        </div>
                                    </div>

                                    {/* Inteligencia de Negocio */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#11261F] p-5 rounded-3xl relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <p className="text-[9px] font-black text-[#8CB33E] uppercase tracking-widest mb-1">Kilos en Pie (Biomasa)</p>
                                                <p className="text-xl font-black text-white tabular-nums">{(lote.biomasa_total || 0).toLocaleString('es-CO')} KG</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-[#F9FBFA] border border-[#E6F4D7] p-5 rounded-3xl">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Promedio / Animal</p>
                                            <p className="text-xl font-black text-[#11261F] tabular-nums">{(lote.peso_promedio || 0).toFixed(1)} KG</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#8CB33E]/10 border border-[#8CB33E]/30 p-3 mt-4 rounded-xl flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-[#8CB33E]">Meta de ganancia diaria 📈</span>
                                        <span className="text-sm font-black text-[#11261F]">{lote.gmd_meta ? `${lote.gmd_meta} kg/día` : 'Sin definir'}</span>
                                    </div>

                                    {/* 🔮 EL ORÁCULO: Proyección a 450 KG por Lote — ARMADURA MATEMÁTICA */}
                                    {(() => {
                                        if (lote.cabezas_reales === 0) return null;

                                        const pesoIdealVenta = 450;
                                        const pesoPromLote = lote.peso_promedio || 0;
                                        const gmdEstimado = pesoPromLote > 0 ? pesoPromLote / 500 : 0;
                                        const kgFaltantes = pesoIdealVenta - pesoPromLote;

                                        let estado = 'calculando';
                                        let diasEst = 0;
                                        let fechaLote = null;

                                        if (pesoPromLote >= pesoIdealVenta) {
                                            estado = 'listo';
                                        } else if (gmdEstimado > 0) {
                                            diasEst = Math.ceil(kgFaltantes / gmdEstimado);
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

                                        if (estado === 'listo') {
                                            return (
                                                <div className="mt-3 bg-gradient-to-r from-green-500/10 to-[#8CB33E]/10 border border-green-300 p-4 rounded-2xl flex items-center gap-3">
                                                    <span className="text-lg">🏆</span>
                                                    <div>
                                                        <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Lote en Punto Óptimo</p>
                                                        <p className="text-xs font-bold text-green-600">Promedio: {pesoPromLote.toFixed(0)} KG. ¡Evalúa la venta!</p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (estado === 'activo') {
                                            return (
                                                <div className="mt-3 bg-gradient-to-r from-[#11261F]/5 to-[#8CB33E]/5 border border-[#E6F4D7] p-4 rounded-2xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg">🔮</span>
                                                        <div>
                                                            <p className="text-[9px] font-black text-[#8CB33E] uppercase tracking-widest">Fecha Est. de Venta</p>
                                                            <p className="text-sm font-black text-[#11261F]">{fechaLote.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-[#8CB33E] tabular-nums">{diasEst}d</p>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase">Restantes</p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (estado === 'estancado') {
                                            return (
                                                <div className="mt-3 bg-red-50/50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 border-l-4 border-l-red-400">
                                                    <span className="text-lg">📉</span>
                                                    <div>
                                                        <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Curva Estancada</p>
                                                        <p className="text-[10px] font-bold text-red-500">Proyección pausada. Sin incremento registrado.</p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (estado === 'inviable') {
                                            return (
                                                <div className="mt-3 bg-yellow-50/50 border border-yellow-200 p-4 rounded-2xl flex items-center gap-3 border-l-4 border-l-yellow-400">
                                                    <span className="text-lg">⏳</span>
                                                    <div>
                                                        <p className="text-[9px] font-black text-yellow-700 uppercase tracking-widest">Largo Plazo (+2 años)</p>
                                                        <p className="text-[10px] font-bold text-yellow-600">Se habilita en fase de ceba.</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        
                                        return null;
                                    })()}

                                    {/* Acciones de Gestión */}
                                    <div className="mt-6 flex gap-2">
                                        <button onClick={() => setSelectedLote(lote.id_lote || 'general')} className="flex-1 bg-[#F4F6F4] text-[#11261F] py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#8CB33E] hover:text-white transition-all">
                                            Ver Animales
                                        </button>
                                        <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                                            <button onClick={() => {
                                                setLoteEditData({ id_lote: lote.id_lote, nombre: lote.nombre, tipo_manejo: lote.tipo_manejo || 'General', gmd_meta: lote.gmd_meta || '' });
                                                setShowEditarLoteModal(true);
                                            }} className="px-5 bg-white border border-[#E6F4D7] text-gray-400 rounded-2xl hover:text-[#11261F] hover:border-gray-300 transition-all">
                                                ⚙️
                                            </button>
                                        </RoleGuard>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center p-10 text-gray-400 font-bold">
                                Calculando biomasa... (o no hay lotes registrados)
                            </div>
                        )}
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
                                <div className="flex gap-4">
                                    <button onClick={() => setShowTratamientoGrupalModal(true)} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors">Tratamiento Grupal</button>
                                    <button onClick={() => navigate('/registrar-animal', { state: { fromFinca: fincaSel, fromTab: 'lotes', fromLote: selectedLote } })}
                                        className="bg-[#11261F] text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg">+ Nuevo Animal</button>
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
                                        {/* REMOVED: fake gain data */}
                                    </div>
                                </div>

                                <div className="bg-[#11261F] p-6 rounded-[24px] text-white shadow-md flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-[#8CB33E] uppercase tracking-widest mb-4">Sanidad del Grupo</p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                            <span className="text-[10px] font-bold text-gray-300">Última acción</span>
                                            {/* REMOVED: fake action data */}
                                            <span className="text-[10px] font-black uppercase text-gray-500">-</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-300">Próxima acción</span>
                                            {/* REMOVED: fake next action data */}
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
                                }).map((a) => (
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
                                        <td className="px-12 py-6 text-right font-black text-2xl">{a.peso} <span className="text-sm font-normal">kg</span></td>
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
