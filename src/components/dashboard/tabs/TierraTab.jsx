import React, { useState } from 'react';
import { Map as MapIcon, Plus, Info, Edit, ArrowRight, Sprout, Trees, Droplets, Target, Search, ChevronDown, ChevronRight, Crosshair, Filter } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Popup, FeatureGroup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Componente auxiliar para volar a una coordenada
function MapFlyTo({ target }) {
    const map = useMap();
    React.useEffect(() => {
        if (target) {
            map.flyTo(target, 17, { duration: 1.5 });
        }
    }, [target, map]);
    return null;
}

export default function TierraTab({ fincaActual, lotesReales, setActiveTab, setSelectedLote }) {
    // Estados para la UI interactiva
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('alfabetico');
    const [focusedPolygon, setFocusedPolygon] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({
        'Listo para pastoreo': true,
        'Ocupado (Ganado Adentro)': true,
        'En Recuperación (Descanso)': false
    });
    const [visibleCounts, setVisibleCounts] = useState({
        'Listo para pastoreo': 10,
        'Ocupado (Ganado Adentro)': 10,
        'En Recuperación (Descanso)': 10
    });

    const toggleGroup = (group) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const loadMore = (group) => {
        setVisibleCounts(prev => ({ ...prev, [group]: (prev[group] || 10) + 20 }));
    };

    // Coordenadas base de Santa Elena (Ruralidad) para simulación
    const baseCenter = [6.2238, -75.4985]; // Santa Elena, Antioquia

    // Simular polígonos basados en los lotes reales de la base de datos
    const lotesSimulados = lotesReales?.map((lote, index) => {
        // Crear un grid de potreros para simulación (3 columnas)
        const row = Math.floor(index / 3);
        const col = index % 3;
        
        // Desplazamiento en grados decimales (~100 metros)
        const offsetLat = row * 0.002;
        const offsetLng = col * 0.002;
        
        // Esquina inferior izquierda del potrero
        const baseLat = baseCenter[0] + offsetLat - 0.003;
        const baseLng = baseCenter[1] + offsetLng - 0.003;

        // Cuadrado de ~1 hectárea
        const polygon = [
            [baseLat, baseLng],
            [baseLat + 0.0018, baseLng],
            [baseLat + 0.0018, baseLng + 0.0018],
            [baseLat, baseLng + 0.0018]
        ];

        // Simulación: Inyectar ganado aleatorio si la BD está en 0 para mostrar cómo se vería ocupado
        const simulatedCantidad = lote.cantidad_animales > 0 ? lote.cantidad_animales : (lote.id_lote % 3 === 0 ? ((lote.id_lote * 13) % 40) + 15 : 0);
        
        // Lógica de Semáforo de Pastoreo
        const ocupado = simulatedCantidad > 0;
        // Simular que algunos potreros vacíos están en descanso (amarillo) y otros listos (verde)
        const enRecuperacion = !ocupado && (lote.id_lote % 2 !== 0);

        let colorInfo = { color: '#10b981', fillColor: '#10b981', status: 'Listo para pastoreo' }; // Verde
        if (ocupado) {
            colorInfo = { color: '#f43f5e', fillColor: '#f43f5e', status: 'Ocupado (Ganado Adentro)' }; // Rojo
        } else if (enRecuperacion) {
            colorInfo = { color: '#fbbf24', fillColor: '#fbbf24', status: 'En Recuperación (Descanso)' }; // Amarillo
        }

        // MOCKUP DATOS AGRONÓMICOS
        const diasDescanso = enRecuperacion ? ((lote.id_lote * 7) % 20) + 10 : 0;
        const aforoEstimado = ocupado ? 'Bajo' : (enRecuperacion ? 'Medio' : 'Óptimo');

        return { ...lote, polygon, centerPoint: [baseLat + 0.0009, baseLng + 0.0009], colorInfo, diasDescanso, aforoEstimado, cantidad_animales: simulatedCantidad };
    }) || [];

    const totalHectareas = lotesSimulados.length; // Simulación: 1 ha por lote
    const lotesListos = lotesSimulados.filter(l => l.colorInfo.status.includes('Listo')).length;
    const lotesRecuperacion = lotesSimulados.filter(l => l.colorInfo.status.includes('Recuperación')).length;

    // Filtrar, ordenar y agrupar lotes para el sidebar
    let filteredLotes = lotesSimulados.filter(l => l.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Aplicar ordenamiento
    filteredLotes.sort((a, b) => {
        if (sortBy === 'carga') return b.cantidad_animales - a.cantidad_animales;
        if (sortBy === 'descanso') return b.diasDescanso - a.diasDescanso;
        return a.nombre.localeCompare(b.nombre);
    });

    const groupedLotes = filteredLotes.reduce((acc, lote) => {
        const group = lote.colorInfo.status;
        if (!acc[group]) acc[group] = [];
        acc[group].push(lote);
        return acc;
    }, {});

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h3 className="text-2xl font-black text-slate-800">Mapeo de Potreros</h3>
                    <p className="text-slate-500 font-medium mt-1">Control de rotación, biomasa y descansos.</p>
                </div>
                <button className="bg-[#11261F] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 hover:bg-[#8CB33E] transition-all">
                    <Plus className="w-4 h-4" /> Nuevo Potrero
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* PANEL IZQUIERDO: MAPA (8 COLUMNAS) */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    <div className="bg-white rounded-[24px] p-2 shadow-sm border border-slate-200">
                        <div className="h-[600px] w-full rounded-[16px] overflow-hidden relative z-0">
                            <MapContainer center={baseCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <MapFlyTo target={focusedPolygon} />
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution="Tiles &copy; Esri &mdash; Source: Esri"
                                />
                        
                        {lotesSimulados.map((lote) => (
                            <Polygon 
                                key={lote.id_lote} 
                                positions={lote.polygon}
                                pathOptions={{ 
                                    color: lote.colorInfo.color, 
                                    fillColor: lote.colorInfo.fillColor, 
                                    fillOpacity: 0.5,
                                    weight: 3
                                }}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <h4 className="font-black text-sm uppercase text-slate-800 mb-1">
                                            {lote.nombre}
                                        </h4>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lote.colorInfo.color }}></div>
                                            <span className="text-xs font-bold text-slate-500">{lote.colorInfo.status}</span>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Carga Animal</p>
                                            <p className="text-sm font-black text-slate-700">{lote.cantidad_animales} cabezas</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-emerald-50 p-1.5 rounded text-center">
                                                <p className="text-[8px] font-bold text-emerald-600/70 uppercase">Días Descanso</p>
                                                <p className="text-xs font-black text-emerald-700">{lote.diasDescanso}d</p>
                                            </div>
                                            <div className="bg-blue-50 p-1.5 rounded text-center">
                                                <p className="text-[8px] font-bold text-blue-600/70 uppercase">Biomasa</p>
                                                <p className="text-xs font-black text-blue-700">{lote.aforoEstimado}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    setSelectedLote(lote.id_lote);
                                                    setActiveTab('lotes');
                                                }}
                                                className="flex-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase py-2 rounded-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-1"
                                            >
                                                <Edit className="w-3 h-3" /> Editar
                                            </button>
                                            {lote.cantidad_animales > 0 && (
                                                <button className="flex-1 bg-[#11261F] text-white text-[10px] font-bold uppercase py-2 rounded-lg hover:bg-[#8CB33E] transition-all">
                                                    Mover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Polygon>
                        ))}
                    </MapContainer>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm border-2 border-white"></div>
                    <span className="text-sm font-bold text-slate-700">Listo para pastoreo</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
                    <div className="w-4 h-4 rounded-full bg-amber-400 shadow-sm border-2 border-white"></div>
                    <span className="text-sm font-bold text-slate-700">En descanso / Recuperación</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
                    <div className="w-4 h-4 rounded-full bg-rose-500 shadow-sm border-2 border-white"></div>
                    <span className="text-sm font-bold text-slate-700">Ocupado (Ganado adentro)</span>
                </div>
            </div>
        </div>

        {/* PANEL DERECHO: MÉTRICAS Y LISTADO (4 COLUMNAS) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Estado de la Tierra</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-emerald-50 p-4 rounded-2xl">
                        <Sprout className="w-5 h-5 text-emerald-500 mb-2" />
                        <p className="text-2xl font-black text-emerald-900">{lotesListos}</p>
                        <p className="text-[10px] uppercase font-bold text-emerald-600/70">Potreros Listos</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl">
                        <Droplets className="w-5 h-5 text-amber-500 mb-2" />
                        <p className="text-2xl font-black text-amber-900">{lotesRecuperacion}</p>
                        <p className="text-[10px] uppercase font-bold text-amber-600/70">Recuperándose</p>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Área Total Mapeada</p>
                        <p className="text-lg font-black text-slate-700">{totalHectareas} Hectáreas</p>
                    </div>
                    <MapIcon className="w-6 h-6 text-slate-300" />
                </div>
            </div>

            <div className="bg-white flex-1 p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col min-h-[400px]">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Navegador de Tierra</h4>
                        <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-lg">{lotesSimulados.length}</span>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input 
                                type="text" 
                                placeholder="Buscar potrero..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-[#8CB33E] transition-colors"
                            />
                        </div>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-[#8CB33E] transition-colors cursor-pointer"
                        >
                            <option value="alfabetico">A-Z</option>
                            <option value="carga">Más Animales</option>
                            <option value="descanso">Más Descanso</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    {Object.entries(groupedLotes).map(([groupName, lotesInGroup]) => (
                        <div key={groupName} className="border border-slate-100 rounded-2xl overflow-hidden">
                            <button 
                                onClick={() => toggleGroup(groupName)}
                                className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
                            >
                                <span className="text-xs font-black text-slate-700 uppercase">{groupName} ({lotesInGroup.length})</span>
                                {expandedGroups[groupName] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </button>
                            
                            {expandedGroups[groupName] && (
                                <div className="p-2 space-y-1">
                                    {lotesInGroup.slice(0, visibleCounts[groupName] || 10).map(lote => (
                                        <div key={`list-${lote.id_lote}`} className="p-3 border border-transparent rounded-xl hover:bg-slate-50 hover:border-slate-100 transition-colors flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lote.colorInfo.color }}></div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{lote.nombre}</p>
                                                    <div className="flex gap-2">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{lote.cantidad_animales} cabezas</p>
                                                        {lote.diasDescanso > 0 && <p className="text-[9px] font-bold text-emerald-500 uppercase">{lote.diasDescanso}d descanso</p>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => setFocusedPolygon(lote.centerPoint)}
                                                    className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                                                    title="Ubicar en el Mapa"
                                                >
                                                    <Crosshair className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedLote(lote.id_lote); setActiveTab('lotes'); }}
                                                    className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#8CB33E] hover:text-white transition-all"
                                                    title="Editar Potrero"
                                                >
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {lotesInGroup.length > (visibleCounts[groupName] || 10) && (
                                        <button 
                                            onClick={() => loadMore(groupName)}
                                            className="w-full bg-slate-50 border border-slate-100 text-[#8CB33E] text-[10px] font-black uppercase py-2 rounded-xl mt-2 hover:bg-[#8CB33E] hover:text-white transition-all"
                                        >
                                            + Mostrar {lotesInGroup.length - (visibleCounts[groupName] || 10)} potreros más
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {Object.keys(groupedLotes).length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-slate-400 text-sm font-bold">No se encontraron potreros con ese nombre.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
</div>
    );
}
