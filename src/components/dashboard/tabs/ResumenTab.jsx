import React from 'react';
import RoleGuard from '../../auth/RoleGuard';
import useAuthStore from '../../../store/authStore';

export default function ResumenTab({ fincaActual, stats, alertasInteligentes, setActiveTab, setShowModalPrecio }) {
    const user = useAuthStore((state) => state.user);

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[32px] overflow-hidden border border-[#E6F4D7] shadow-sm mb-10 flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 h-64 relative">
                    <img src={`https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${fincaActual?.longitud || -74.6611},${fincaActual?.latitud || 5.4542}&z=14&l=sat&size=450,250`}
                        alt="Mapa" className="w-full h-full object-cover grayscale-[0.2]" />
                </div>
                <div className="p-10 flex-1 flex flex-col justify-center">
                    <h4 className="text-sm font-black text-[#8CB33E] uppercase tracking-widest mb-6">Sobre tu tierra y el clima</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-xl font-black text-[#11261F] uppercase mb-2">{fincaActual?.tipo_ecosistema || 'Bosque Seco Tropical'}</p>
                            <p className="text-sm text-gray-500 leading-relaxed">Tu zona tiene épocas de mucha sequía y calor intenso, lo que afecta el pasto.</p>
                        </div>
                        <div>
                            <p className="text-xl font-black text-[#11261F] uppercase mb-2">{fincaActual?.regimen_lluvias || 'Monomodal'}</p>
                            <p className="text-sm text-gray-500 leading-relaxed">Aquí llueve fuerte en una sola época del año, prepárate guardando agua.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                {/* TARJETA FINANCIERA — Solo visible para propietario y superadmin */}
                <RoleGuard allowedRoles={['superadmin', 'propietario']}>
                    <div className="lg:col-span-8 bg-[#11261F] rounded-[40px] p-10 text-white shadow-2xl flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-6">
                            <p className="text-sm font-black uppercase tracking-widest text-[#8CB33E]">Valor Estimado de tus Animales</p>
                            <button
                                onClick={() => setShowModalPrecio(true)}
                                className="bg-white/10 p-2 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                                title="Ajustar precio de mercado por KG"
                            >
                                ✏️<span className="sr-only">Editar Precio</span>
                            </button>
                        </div>
                        <h3 className="text-6xl font-black italic tracking-tighter mb-10">$ {stats.valorLote}</h3>
                        <div className="flex gap-6">
                            <div className="bg-white/10 px-6 py-4 rounded-2xl"><p className="text-xs uppercase font-bold text-gray-300">Peso Promedio</p><p className="text-2xl font-black italic">{stats.promedioPeso} kg</p></div>
                            <div className="bg-white/10 px-6 py-4 rounded-2xl"><p className="text-xs uppercase font-bold text-gray-300">Población Total</p><p className="text-2xl font-black italic">{stats.total} cabezas</p></div>
                        </div>
                    </div>
                </RoleGuard>

                {/* TARJETA OPERATIVA — Visible para encargado y operario (sin datos financieros) */}
                {(user?.rol === 'encargado' || user?.rol === 'operario') && (
                    <div className="lg:col-span-8 bg-[#11261F] rounded-[40px] p-10 text-white shadow-2xl flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-6">
                            <p className="text-sm font-black uppercase tracking-widest text-[#8CB33E]">Resumen del Ganado</p>
                        </div>
                        <h3 className="text-6xl font-black italic tracking-tighter mb-10">{stats.total} <span className="text-2xl font-bold not-italic text-gray-300">cabezas</span></h3>
                        <div className="flex gap-6">
                            <div className="bg-white/10 px-6 py-4 rounded-2xl"><p className="text-xs uppercase font-bold text-gray-300">Peso Promedio</p><p className="text-2xl font-black italic">{stats.promedioPeso} kg</p></div>
                            <div className="bg-white/10 px-6 py-4 rounded-2xl"><p className="text-xs uppercase font-bold text-gray-300">Alertas Pendientes</p><p className="text-2xl font-black italic">{stats.alertas}</p></div>
                        </div>
                    </div>
                )}

                <div className={`${(user?.rol === 'encargado' || user?.rol === 'operario') ? 'lg:col-span-4' : 'lg:col-span-4'} bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm`}>
                    <h4 className="text-base font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                        {stats.alertas > 0 && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}
                        Atiende hoy ({stats.alertas})
                    </h4>
                    <div className="space-y-4">
                        {alertasInteligentes.map((alerta, idx) => {
                            const nivel = alerta.nivel_alerta || alerta.NivelAlerta || alerta.nivel || '';
                            let bgStyle = "bg-[#F4F6F4] border-[#8CB33E]";
                            let icon = "🔔";
                            
                            if (nivel.toUpperCase() === 'ALTA') {
                                bgStyle = "bg-rose-50 border-rose-400";
                                icon = "🚨";
                            } else if (nivel.toUpperCase() === 'MEDIA') {
                                bgStyle = "bg-amber-50 border-amber-400";
                                icon = "⚠️";
                            } else if (nivel.toUpperCase() === 'BAJA') {
                                bgStyle = "bg-blue-50 border-blue-400";
                                icon = "ℹ️";
                            }

                            const gmdActual = alerta.detalles?.gmd_actual;
                            const gmdMeta = alerta.detalles?.gmd_meta;
                            const tieneGmd = gmdActual !== undefined && gmdMeta !== undefined;

                            // Traducción de tipos de alerta a lenguaje campesino
                            const tipoTraducido = {
                                'RETIRO_SANITARIO': '🩺 Cuarentena por medicamento',
                                'QUIEBRE_STOCK': '📦 Se está acabando un producto',
                                'PESAJE_ATRASADO': '⚖️ Pesaje pendiente',
                                'GMD_CRITICO': '📉 Bajo crecimiento de peso',
                            }[alerta.tipo] || alerta.tipo || 'Alerta';

                            return (
                                <div
                                    key={alerta.id || idx}
                                    onClick={() => {
                                        const tipoLower = (alerta.tipo || '').toLowerCase();
                                        if (tipoLower.includes('pesaje') || tipoLower.includes('gmd')) setActiveTab('lotes');
                                        if (tipoLower.includes('stock') || tipoLower.includes('quiebre')) setActiveTab('bodega');
                                        if (tipoLower.includes('retiro') || tipoLower.includes('sanitario')) setActiveTab('sanidad');
                                    }}
                                    className={`p-5 rounded-2xl border-l-4 cursor-pointer hover:shadow-md transition-all group ${bgStyle}`}
                                >
                                    <p className="text-sm font-black uppercase text-[#11261F] mb-1 flex items-center gap-2">
                                        {tipoTraducido}
                                    </p>
                                    <p className="text-xs text-gray-700 font-medium mb-3">{alerta.mensaje || alerta.desc}</p>
                                    
                                    {tieneGmd && (
                                        <div className="mb-3 flex items-center gap-2">
                                            <span className="bg-white/60 border border-black/5 px-2 py-1 rounded text-[10px] font-black text-gray-600">
                                                Actual: {gmdActual} kg/día
                                            </span>
                                            <span className="bg-white/60 border border-[#8CB33E]/20 px-2 py-1 rounded text-[10px] font-black text-[#8CB33E]">
                                                Meta: {gmdMeta} kg/día
                                            </span>
                                        </div>
                                    )}

                                    <p className="text-[10px] font-black text-[#11261F] uppercase group-hover:underline opacity-60">
                                        {alerta.accion || 'Ir a revisar'} ➡️
                                    </p>
                                </div>
                            );
                        })}
                        {stats.alertas === 0 && <p className="text-gray-400 italic font-medium">Todo está al día. ¡Buen trabajo! 🎉</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
