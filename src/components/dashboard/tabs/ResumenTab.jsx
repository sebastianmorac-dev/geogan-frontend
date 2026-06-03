import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleGuard from '../../auth/RoleGuard';
import useAuthStore from '../../../store/authStore';
import { Pencil, Scale, Beef, AlertTriangle, Info, Bell, AlertCircle, ArrowRight, Sparkles, ChevronDown, Users, CheckCircle2, Search } from 'lucide-react';

export default function ResumenTab({ 
    fincaActual, stats, alertasInteligentes, setActiveTab, setShowModalPrecio, 
    lotesReales, allAnimales, equipoActividad, setSelectedLote 
}) {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const [searchTermSinergia, setSearchTermSinergia] = useState('');

    // Calcular métricas adicionales
    const cantidadLotes = lotesReales ? lotesReales.length : 0;
    const cargaAnimal = fincaActual?.tamano_hectareas && fincaActual.tamano_hectareas > 0 
        ? (stats.total / fincaActual.tamano_hectareas).toFixed(2) 
        : 'N/A';
        
    const animalesConGMD = allAnimales?.filter(a => a.ganancia_media_diaria !== undefined && a.ganancia_media_diaria !== null && parseFloat(a.ganancia_media_diaria) > 0) || [];
    const gmdPromedioFinca = animalesConGMD.length > 0 
        ? (animalesConGMD.reduce((acc, a) => acc + parseFloat(a.ganancia_media_diaria), 0) / animalesConGMD.length).toFixed(2) 
        : '0.00';

    // Generar texto inteligente del asistente
    const totalPesajesHoy = equipoActividad?.total_pesajes_hoy || 0;
    const equipoMensaje = totalPesajesHoy > 0 
        ? `el equipo ha estado muy activo, con ${totalPesajesHoy} pesajes registrados hoy.`
        : `el equipo no ha registrado pesajes el día de hoy.`;

    const handleAlertClick = (alerta, tipo) => {
        const tipoLower = tipo.toLowerCase();
        
        // Si la alerta tiene un ID de entidad y es un animal (ej. RETIRO_SANITARIO o GMD_CRITICO individual)
        if (alerta.entidad_id) {
            if (tipoLower.includes('retiro') || tipoLower.includes('sanitario') || tipoLower.includes('gmd')) {
                // Ir a la hoja de vida del animal
                navigate(`/animales/detalle/${alerta.entidad_id}`);
                return;
            }
            if (tipoLower.includes('pesaje') || tipoLower.includes('lote')) {
                // Ir a la pestaña de lotes y seleccionar el lote
                if (setSelectedLote) setSelectedLote(alerta.entidad_id);
                setActiveTab('lotes');
                return;
            }
        }

        // Fallbacks por defecto si no hay entidad_id clara
        if (tipoLower.includes('pesaje') || tipoLower.includes('gmd')) setActiveTab('lotes');
        else if (tipoLower.includes('stock') || tipoLower.includes('quiebre')) setActiveTab('bodega');
        else if (tipoLower.includes('retiro') || tipoLower.includes('sanitario')) setActiveTab('sanidad');
    };

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            {/* EL ASISTENTE GEOGAN (Nuevo diseño de cabecera) */}
            <div className="bg-white rounded-[32px] p-6 md:p-8 border border-[#E6F4D7] shadow-sm mb-10 transition-all hover:shadow-md">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8CB33E]/20 to-[#8CB33E]/10 text-[#8CB33E] flex items-center justify-center shrink-0 border border-[#8CB33E]/20">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-[#11261F] mb-3 flex items-center gap-2">
                            GeoGan <span className="text-sm font-bold bg-[#E6F4D7] text-[#5c7a26] px-2 py-0.5 rounded-full">Asistente</span>
                        </h3>
                        <p className="text-gray-600 font-medium leading-relaxed text-sm md:text-base">
                            ¡Buen día! La finca <span className="font-bold text-gray-800">{fincaActual?.nombre || 'General'}</span> está operando activamente con una carga animal de <span className="font-bold text-gray-800">{cargaAnimal} cabezas/ha</span>. 
                            El crecimiento promedio global (GMD) está en <span className="font-bold text-gray-800">{gmdPromedioFinca} kg/día</span>. 
                            Además, {equipoMensaje}
                            {alertasInteligentes.length > 0 && <span className="text-rose-600 font-semibold"> Tienes {alertasInteligentes.length} alertas pendientes de revisar.</span>}
                            {alertasInteligentes.length === 0 && <span className="text-emerald-600 font-semibold"> Todo está al día y bajo control.</span>}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* TARJETA FINANCIERA — Solo visible para propietario y superadmin */}
                <RoleGuard allowedRoles={['superadmin', 'propietario']}>
                    <div className="lg:col-span-8 relative overflow-hidden bg-gradient-to-br from-[#11261F] to-[#1a382e] rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between min-h-[280px]">
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-[#8CB33E] mb-1">Portafolio Ganadero</p>
                                <h2 className="text-xl font-medium text-gray-300">Valor Estimado de Inventario</h2>
                            </div>
                            <button
                                onClick={() => setShowModalPrecio(true)}
                                className="bg-white/10 p-2.5 hover:bg-white/20 rounded-xl transition-all flex items-center justify-center backdrop-blur-sm shadow-sm"
                                title="Ajustar precio de mercado por KG"
                            >
                                <Pencil className="w-5 h-5 text-white/80" />
                                <span className="sr-only">Editar Precio</span>
                            </button>
                        </div>
                        
                        <div className="z-10 mt-6 mb-8">
                            <h3 className="text-5xl md:text-6xl font-black tracking-tight drop-shadow-sm">
                                <span className="text-[#8CB33E] mr-1">$</span>
                                {stats.valorLote}
                            </h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 z-10">
                            <div className="bg-black/20 backdrop-blur-md px-5 py-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-[#8CB33E]/20 rounded-lg text-[#8CB33E]">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Peso Promedio</p>
                                    <p className="text-lg font-bold text-white">{stats.promedioPeso} <span className="text-xs font-normal text-gray-400">kg</span></p>
                                </div>
                            </div>
                            <div className="bg-black/20 backdrop-blur-md px-5 py-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <Beef className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Población Total</p>
                                    <p className="text-lg font-bold text-white">{Number(stats.total).toLocaleString('es-CO')} <span className="text-xs font-normal text-gray-400">cabezas</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </RoleGuard>

                {/* TARJETA OPERATIVA — Visible para encargado y operario */}
                {(user?.rol === 'encargado' || user?.rol === 'operario') && (
                    <div className="lg:col-span-8 relative overflow-hidden bg-gradient-to-br from-[#11261F] to-[#1a382e] rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between min-h-[280px]">
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-[#8CB33E] mb-1">Inventario Físico</p>
                                <h2 className="text-xl font-medium text-gray-300">Resumen del Ganado</h2>
                            </div>
                        </div>
                        
                        <div className="z-10 mt-6 mb-8">
                            <h3 className="text-5xl md:text-6xl font-black tracking-tight drop-shadow-sm">
                                {Number(stats.total).toLocaleString('es-CO')} <span className="text-2xl font-bold not-italic text-gray-400">cabezas</span>
                            </h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 z-10">
                            <div className="bg-black/20 backdrop-blur-md px-5 py-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-[#8CB33E]/20 rounded-lg text-[#8CB33E]">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Peso Promedio</p>
                                    <p className="text-lg font-bold text-white">{stats.promedioPeso} <span className="text-xs font-normal text-gray-400">kg</span></p>
                                </div>
                            </div>
                            <div className="bg-black/20 backdrop-blur-md px-5 py-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Alertas Pendientes</p>
                                    <p className="text-lg font-bold text-white">{stats.alertas}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TARJETA DE ALERTAS */}
                <div className={`lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col`}>
                    <div className="flex items-center justify-between mb-5">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-800 flex items-center gap-2">
                            {stats.alertas > 0 && <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>}
                            Tareas & Alertas
                        </h4>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{stats.alertas}</span>
                    </div>
                    
                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                        {(() => {
                            if (alertasInteligentes.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                                        <div className="text-4xl mb-3 opacity-50">✨</div>
                                        <p className="text-gray-400 text-sm font-medium">Todo está al día.<br/>¡Buen trabajo!</p>
                                    </div>
                                );
                            }

                            return alertasInteligentes.map((alerta) => {
                                const tipo = alerta.tipo || 'OTROS';
                                const nivel = alerta.nivel_alerta || alerta.NivelAlerta || alerta.nivel || '';
                                
                                let bgStyle = "bg-gray-50 border-gray-200 hover:border-gray-300";
                                let IconComponent = Bell;
                                let textStyle = "text-gray-700";
                                let iconColor = "text-gray-500";
                                
                                if (nivel.toUpperCase() === 'ALTA') {
                                    bgStyle = "bg-rose-50 border-rose-200 hover:border-rose-300 hover:bg-rose-100/50";
                                    IconComponent = AlertTriangle;
                                    textStyle = "text-rose-800";
                                    iconColor = "text-rose-600";
                                } else if (nivel.toUpperCase() === 'MEDIA') {
                                    bgStyle = "bg-amber-50 border-amber-200 hover:border-amber-300 hover:bg-amber-100/50";
                                    IconComponent = AlertCircle;
                                    textStyle = "text-amber-800";
                                    iconColor = "text-amber-600";
                                } else if (nivel.toUpperCase() === 'BAJA') {
                                    bgStyle = "bg-blue-50 border-blue-200 hover:border-blue-300 hover:bg-blue-100/50";
                                    IconComponent = Info;
                                    textStyle = "text-blue-800";
                                    iconColor = "text-blue-600";
                                }

                                const tipoTraducido = {
                                    'RETIRO_SANITARIO': 'Cuarentena Sanitaria',
                                    'QUIEBRE_STOCK': 'Inventario Bajo',
                                    'PESAJE_ATRASADO': 'Pesaje Pendiente',
                                    'GMD_CRITICO': 'Bajo Crecimiento',
                                }[tipo] || tipo;

                                return (
                                    <div
                                        key={alerta.id_alerta}
                                        onClick={() => handleAlertClick(alerta, tipo)}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all group ${bgStyle}`}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <IconComponent className={`w-5 h-5 ${iconColor}`} />
                                                <p className={`text-xs font-bold uppercase ${textStyle}`}>
                                                    {tipoTraducido}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 font-medium pl-7 line-clamp-2 mt-1">
                                            {alerta.mensaje}
                                        </p>
                                        <div className="pl-7 mt-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase group-hover:text-gray-800 transition-colors flex items-center gap-1">
                                                Revisar novedad <ArrowRight className="w-3 h-3"/>
                                            </span>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* SECCIÓN SINERGIA DEL EQUIPO */}
            {equipoActividad?.operarios?.length > 0 && (
                <div className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-sm mt-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-black text-[#11261F] flex items-center gap-2">
                                <Users className="w-6 h-6 text-[#8CB33E]" /> Sinergia del Equipo
                            </h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">Trazabilidad de aportes recientes del personal de la finca.</p>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            <input 
                                type="text" 
                                placeholder="Buscar por nombre o rol..." 
                                value={searchTermSinergia}
                                onChange={(e) => setSearchTermSinergia(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-[#8CB33E] transition-colors shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#F4F6F4] text-xs font-black uppercase text-gray-500 border-b border-[#E6F4D7]">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-2xl">Personal</th>
                                    <th className="px-6 py-4 text-center">Rol</th>
                                    <th className="px-6 py-4 text-right">Pesajes (Sem)</th>
                                    <th className="px-6 py-4 text-right">Sanidad (Sem)</th>
                                    <th className="px-6 py-4 rounded-tr-2xl text-right">Último Aporte</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6F4D7]">
                                {equipoActividad.operarios.filter(op => (op.nombre_completo || '').toLowerCase().includes(searchTermSinergia.toLowerCase()) || (op.rol || '').toLowerCase().includes(searchTermSinergia.toLowerCase())).length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-bold uppercase">
                                            {searchTermSinergia ? 'No se encontró personal coincidente.' : 'Sin datos de actividad.'}
                                        </td>
                                    </tr>
                                ) : (
                                    equipoActividad.operarios.filter(op => (op.nombre_completo || '').toLowerCase().includes(searchTermSinergia.toLowerCase()) || (op.rol || '').toLowerCase().includes(searchTermSinergia.toLowerCase())).map(op => {
                                        const esAdmin = op.rol === 'encargado' || op.rol === 'superadmin';
                                        
                                        let ultimaAccionText = "Sin aportes";
                                        let dotColor = "bg-gray-300";
                                        
                                        if (op.ultima_contribucion) {
                                            const dias = Math.floor((new Date() - new Date(op.ultima_contribucion)) / (1000 * 60 * 60 * 24));
                                            if (dias === 0) { ultimaAccionText = "Hoy"; dotColor = "bg-emerald-400 animate-pulse"; }
                                            else if (dias === 1) { ultimaAccionText = "Ayer"; dotColor = "bg-emerald-400"; }
                                            else { ultimaAccionText = `Hace ${dias} días`; dotColor = dias < 7 ? "bg-[#8CB33E]" : "bg-amber-400"; }
                                        }

                                        return (
                                            <tr key={op.id_usuario} className={`hover:bg-gray-50 transition-colors ${esAdmin ? 'bg-indigo-50/20' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${esAdmin ? 'bg-indigo-100 text-indigo-600' : 'bg-[#8CB33E]/10 text-[#8CB33E]'}`}>
                                                            {op.nombre_completo.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-black text-[#11261F] text-sm">{op.nombre_completo}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${esAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {op.rol === 'encargado' ? 'Admin' : op.rol}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-black text-[#8CB33E] text-base">{op.pesajes_semana}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-black text-blue-500 text-base">{op.sanidad_semana}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-bold text-gray-500 flex items-center justify-end gap-2">
                                                        {ultimaAccionText}
                                                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
