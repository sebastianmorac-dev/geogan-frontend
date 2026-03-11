import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const location = useLocation();

    // ESTADOS DE DATOS
    const [fincas, setFincas] = useState([]);
    const [fincaSel, setFincaSel] = useState('');
    const [allAnimales, setAllAnimales] = useState([]);
    const [insumos, setInsumos] = useState([]);
    const [catalogoMaestro, setCatalogoMaestro] = useState([]);
    const [stats, setStats] = useState({ total: 0, promedioPeso: 0, alertas: 0, valorLote: "0", gastoHoy: 0 });
    const [animalesPendientes, setAnimalesPendientes] = useState([]);

    // MODALES Y FORMULARIOS
    const [showCompraModal, setShowCompraModal] = useState(false);
    const [showSuministroModal, setShowSuministroModal] = useState(false);
    const [compraData, setCompraData] = useState({ selection_id: '', cantidad_bultos: '', precio_bulto_neto: '', costo_flete_total: '' });
    const [suministroData, setSuministroData] = useState({ id_insumo: '', cantidad_kg: '' });

    // --- PERSISTENCIA DE NAVEGACIÓN ---
    useEffect(() => {
        const persistedFinca = location.state?.fromFinca || location.state?.selectedFincaId;
        if (persistedFinca) {
            setFincaSel(persistedFinca);
        }
    }, [location.state]);

    const loadFincas = useCallback(async () => {
        try {
            const res = await api.get('/fincas/');
            if (res.data) setFincas(res.data);
        } catch (err) { console.error("Error fincas:", err); }
    }, []);

    const loadInsumos = useCallback(async () => {
        if (!fincaSel) return;
        const cleanId = String(fincaSel).split(':')[0];
        try {
            const [resBodega, resSugeridos] = await Promise.all([
                api.get(`/insumos/?finca_id=${cleanId}`),
                api.get(`/insumos/catalogo-sugerido?finca_id=${cleanId}`)
            ]);
            setInsumos(resBodega.data || []);
            setCatalogoMaestro(resSugeridos.data || []);
        } catch (err) { console.error("Error bodega:", err); }
    }, [fincaSel]);

    const loadData = useCallback(async () => {
        if (!fincaSel) return;
        const cleanId = String(fincaSel).split(':')[0];
        try {
            const [resAnimales] = await Promise.all([
                api.get(`/animales/?finca_id=${cleanId}`),
                loadInsumos()
            ]);
            const data = resAnimales.data || [];
            setAllAnimales(data);

            const hoy = new Date();
            const pendientes = data.filter(a => a.fecha_proximo_pesaje && new Date(a.fecha_proximo_pesaje) <= hoy);
            setAnimalesPendientes(pendientes);

            const sumaPesos = data.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);

            setStats(prev => ({
                ...prev,
                total: data.length,
                promedioPeso: data.length > 0 ? (sumaPesos / data.length).toFixed(1) : 0,
                alertas: pendientes.length,
                valorLote: (sumaPesos * 8500).toLocaleString('es-CO')
            }));
        } catch (err) { console.error("Error data:", err); }
    }, [fincaSel, loadInsumos]);

    useEffect(() => { loadFincas(); }, [loadFincas]);
    useEffect(() => { loadData(); }, [loadData]);

    // --- HANDLERS OPERATIVOS ---
    const handleCompraInsumo = async () => {
        if (!compraData.selection_id || !compraData.cantidad_bultos || !compraData.precio_bulto_neto) {
            alert("Complete los campos obligatorios."); return;
        }
        const cleanFincaId = Number(String(fincaSel).split(':')[0]);
        let finalIdInsumo = null;

        try {
            if (String(compraData.selection_id).startsWith('cat_')) {
                const catId = Number(compraData.selection_id.replace('cat_', ''));
                const catItem = catalogoMaestro.find(c => (c.id_catalogo || c.id_maestro) === catId);
                const resNuevo = await api.post('/insumos/', {
                    id_finca: cleanFincaId,
                    nombre_insumo: catItem.nombre,
                    tipo_insumo: catItem.tipo || 'General',
                    unidad_medida: 'KG'
                });
                finalIdInsumo = resNuevo.data.id_insumo;
            } else {
                finalIdInsumo = Number(compraData.selection_id);
            }

            await api.post('/insumos/compra', {
                id_insumo: finalIdInsumo,
                cantidad_bultos: Number(compraData.cantidad_bultos),
                precio_bulto_neto: Number(compraData.precio_bulto_neto),
                costo_flete_total: Number(compraData.costo_flete_total || 0),
                peso_bulto_kg: 40,
                fecha_compra: new Date().toISOString().split('T')[0]
            });
            alert("Compra registrada con éxito.");
            setShowCompraModal(false);
            setCompraData({ selection_id: '', cantidad_bultos: '', precio_bulto_neto: '', costo_flete_total: '' });
            loadData();
        } catch (err) { alert("Error en el registro técnico."); }
    };

    const handleSuministroMasivo = async () => {
        if (!suministroData.id_insumo || !suministroData.cantidad_kg) {
            alert("Seleccione insumo y cantidad en kg."); return;
        }
        const cleanId = String(fincaSel).split(':')[0];
        const kgTotal = Number(suministroData.cantidad_kg);

        try {
            const insumoElegido = insumos.find(i => i.id_insumo === Number(suministroData.id_insumo));
            const costoSuministro = insumoElegido ? (insumoElegido.costo_promedio_kg * kgTotal) : 0;

            // Enviamos cantidad_bultos=1 y peso_bulto_kg=kgTotal para compatibilidad con el backend
            await api.post('/insumos/suministro-lote', {
                id_insumo: Number(suministroData.id_insumo),
                cantidad_bultos: 1,
                peso_bulto_kg: kgTotal,
                id_finca: Number(cleanId),
                id_usuario: Number(user?.usuario_id)
            });

            // Actualización local del KPI "Gasto Nutrición"
            setStats(prev => ({
                ...prev,
                gastoHoy: (Number(prev.gastoHoy) || 0) + costoSuministro
            }));

            alert(`${kgTotal}kg distribuidos exitosamente.`);
            setShowSuministroModal(false);
            setSuministroData({ id_insumo: '', cantidad_kg: '' });
            loadData();
        } catch (err) {
            console.error("Error Suministro:", err.response?.data);
            alert(`Error: ${err.response?.data?.detail || 'Verifique stock disponible en bodega.'}`);
        }
    };

    const renderEnvironmentalContext = () => {
        const fincaActual = fincas.find(f => String(f.id_finca).split(':')[0] === String(fincaSel).split(':')[0]);
        if (!fincaActual) return null;
        const lat = fincaActual.latitud || 5.4542;
        const lon = fincaActual.longitud || -74.6611;
        const mapUrl = `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${lon},${lat}&z=14&l=sat&size=450,450`;

        return (
            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-10 border border-[#E6F4D7] shadow-xl mb-12 flex flex-col lg:flex-row gap-10 items-center">
                <div className="w-full lg:w-80 h-64 rounded-[32px] overflow-hidden border-4 border-white shadow-lg relative">
                    <img src={mapUrl} alt="GPS" className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 bg-[#8CB33E] text-white px-3 py-1 rounded-full text-[8px] font-black uppercase">GPS ACTIVO</div>
                </div>
                <div className="flex-1 flex flex-wrap gap-12 items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-[#F4F6F4] rounded-full flex items-center justify-center text-4xl border border-[#E6F4D7]">🌴</div>
                        <div>
                            <h4 className="text-[10px] font-black text-[#8CB33E] uppercase tracking-widest mb-1">Ecosistema Villa Mora</h4>
                            <p className="text-3xl font-black text-[#11261F] uppercase italic">{fincaActual.tipo_ecosistema || 'Bosque Seco Tropical'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-12 text-center">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Altitud</p>
                            <p className="text-2xl font-black">150 <span className="text-sm">msnm</span></p>
                        </div>
                        <div className="border-l border-[#E6F4D7] pl-10">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Régimen</p>
                            <p className="text-sm font-black uppercase">Monomodal</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F4F6F4] font-sans text-[#11261F] antialiased flex flex-col">

            <header className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-[#E6F4D7] h-28 px-12 flex justify-between items-center shadow-sm overflow-hidden">
                <img src={logo} alt="GeoGan" style={{ height: '160px', width: 'auto', margin: '-40px 0' }} />
                <div className="flex gap-8 items-center">
                    <select value={fincaSel} onChange={(e) => setFincaSel(e.target.value)}
                        className="bg-transparent border-none font-black text-base outline-none cursor-pointer hover:text-[#8CB33E]">
                        <option value="">-- SELECCIONAR --</option>
                        {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre?.toUpperCase()}</option>)}
                    </select>
                    <div className="text-right border-l border-[#E6F4D7] pl-8">
                        <p className="text-sm font-black uppercase tracking-tight">{user?.nombre || 'ANA_SA'}</p>
                    </div>
                    <button onClick={logout} className="w-10 h-10 rounded-xl bg-[#F9FBFA] border border-[#E6F4D7] flex items-center justify-center hover:text-red-500 transition-all">✕</button>
                </div>
            </header>

            {fincaSel ? (
                <main className="mt-40 px-12 pb-20 max-w-[1600px] mx-auto w-full animate-in fade-in duration-700">
                    {renderEnvironmentalContext()}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
                        <div className="lg:col-span-6 bg-[#11261F] rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#8CB33E] blur-[120px] opacity-20"></div>
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-[#8CB33E] mb-6">Valoración Activos Biológicos</p>
                            <h3 className="text-7xl font-black italic tracking-tighter leading-none mb-10">$ {stats.valorLote}</h3>
                            <div className="flex gap-8">
                                <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl">
                                    <p className="text-[10px] uppercase font-black opacity-50 mb-1">Peso Promedio</p>
                                    <p className="text-2xl font-black italic">{stats.promedioPeso} kg</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl">
                                    <p className="text-[10px] uppercase font-black opacity-50 mb-1">Animales</p>
                                    <p className="text-2xl font-black italic">{stats.total} cabezas</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-3 bg-white rounded-[40px] p-8 border border-[#E6F4D7] shadow-xl flex flex-col relative overflow-hidden">
                            <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-4">Alertas IA</p>
                            <h3 className="text-6xl font-black text-[#11261F] mb-4">{stats.alertas}</h3>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar max-h-48">
                                {animalesPendientes.length > 0 ? animalesPendientes.map(a => (
                                    <div key={a.id_animal}
                                        onClick={() => navigate(`/editar-animal/${a.id_animal}`, { state: { fromFinca: fincaSel } })}
                                        className="flex justify-between items-center p-3 bg-orange-50 rounded-2xl border border-orange-100 cursor-pointer hover:bg-orange-100 transition-all group">
                                        <span className="text-[10px] font-black text-[#11261F] group-hover:text-orange-600">{a.codigo_identificacion}</span>
                                        <span className="text-[8px] font-bold text-orange-600 bg-white px-2 py-1 rounded-lg uppercase shadow-sm">Pesar</span>
                                    </div>
                                )) : <p className="text-[10px] text-gray-400 italic">Sin pesajes pendientes.</p>}
                            </div>
                        </div>

                        <div className="lg:col-span-3 bg-[#8CB33E] rounded-[40px] p-10 shadow-xl flex flex-col items-center justify-center text-center text-white">
                            <p className="text-[11px] font-black uppercase tracking-widest mb-4 opacity-80">Gasto Nutrición</p>
                            <h3 className="text-5xl font-black italic">$ {(Number(stats.gastoHoy) || 0).toLocaleString('es-CO')}</h3>
                        </div>
                    </div>

                    <section className="mb-20">
                        <div className="flex justify-between items-center mb-10 px-4">
                            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-[#11261F]">Control de Suministros</h4>
                            <div className="flex gap-4">
                                <button onClick={() => setShowCompraModal(true)} className="bg-white border border-[#E6F4D7] px-8 py-3 rounded-2xl text-[11px] font-black uppercase shadow-sm">Nueva Compra</button>
                                <button onClick={() => setShowSuministroModal(true)} className="bg-[#11261F] text-white px-10 py-3 rounded-2xl text-[11px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">Suministrar Lote</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                            {insumos.filter(i => i.stock_actual_kg > 0).map((ins) => (
                                <div key={ins.id_insumo} className="bg-white rounded-[32px] p-8 shadow-sm border border-[#E6F4D7] hover:border-[#8CB33E] transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <span className="text-3xl">{ins.tipo_insumo === 'Sal' ? '🧂' : '🌽'}</span>
                                        <p className="text-xl font-black text-[#11261F]">${ins.costo_promedio_kg}</p>
                                    </div>
                                    <h5 className="text-sm font-black uppercase mb-6 tracking-tight">{ins.nombre_insumo}</h5>
                                    <div className="flex justify-between items-end border-t border-[#F4F6F4] pt-6">
                                        <p className="text-4xl font-black tabular-nums">{ins.stock_actual_kg} <span className="text-sm opacity-30 italic">kg</span></p>
                                        <p className="text-[10px] font-black bg-[#E6F4D7] px-4 py-2 rounded-xl uppercase">{Math.floor(ins.stock_actual_kg / 40)} Bultos</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* SUGERENCIAS IA */}
                        <div className="bg-[#E6F4D7]/40 p-10 rounded-[40px] border border-white">
                            <div className="flex items-center gap-4 mb-8">
                                <span className="text-2xl">🌿</span>
                                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[#11261F]">Insumos Sugeridos Magdalena Medio</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {catalogoMaestro.filter(cat => !insumos.some(ins => ins.nombre_insumo === cat.nombre)).slice(0, 4).map(cat => (
                                    <div key={cat.id_catalogo} onClick={() => { setCompraData({ ...compraData, selection_id: `cat_${cat.id_catalogo}` }); setShowCompraModal(true); }}
                                        className="bg-white/60 border-2 border-dashed border-[#BFCAC3] p-6 rounded-[28px] hover:border-[#8CB33E] hover:bg-white transition-all cursor-pointer group shadow-sm">
                                        <h5 className="text-[11px] font-black text-[#11261F] uppercase mb-3 leading-tight">{cat.nombre}</h5>
                                        <span className="text-[9px] font-black uppercase text-[#8CB33E]">+ Agregar</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-[40px] border border-[#E6F4D7] overflow-hidden shadow-sm">
                        <div className="px-10 py-8 border-b border-[#E6F4D7] flex justify-between items-center bg-[#F4F6F4]/50">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#11261F]">Activos Biológicos en Lote</h3>
                            <button onClick={() => navigate('/registrar-animal', { state: { fromFinca: fincaSel } })}
                                className="bg-[#11261F] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Registrar Animal</button>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-[#E6F4D7]/30 border-b border-[#E6F4D7]">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-[#11261F]">
                                    <th className="px-10 py-6">ID Activo</th>
                                    <th className="px-6 py-6 text-center">Genética</th>
                                    <th className="px-10 py-6 text-right">Peso Actual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6F4D7]">
                                {allAnimales.map((a) => (
                                    <tr key={a.id_animal} className="hover:bg-[#F4F6F4] cursor-pointer group transition-all"
                                        onClick={() => navigate(`/editar-animal/${a.id_animal}`, { state: { fromFinca: fincaSel } })}>
                                        <td className="px-10 py-6 font-black uppercase group-hover:text-[#8CB33E] transition-colors">{a.codigo_identificacion}</td>
                                        <td className="px-6 py-6 text-center text-sm font-bold text-[#8CB33E] uppercase">{a.raza || 'Brahman'}</td>
                                        <td className="px-10 py-6 text-right font-black text-xl tabular-nums">{a.peso} KG</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </main>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-pulse">
                    <img src={logo} style={{ height: '160px', width: 'auto', margin: '-40px 0' }} alt="GeoGan" />
                    <p className="text-xs font-black uppercase tracking-[0.5em] mt-8">Esperando Selección de Unidad</p>
                </div>
            )}

            {/* MODAL COMPRA */}
            {showCompraModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-md p-4 animate-in zoom-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[48px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-10 text-center italic tracking-tighter">Entrada de Bodega</h3>
                        <div className="space-y-6">
                            <select className="w-full bg-[#F4F6F4] border-2 border-[#E6F4D7] rounded-2xl p-5 font-black outline-none appearance-none"
                                value={compraData.selection_id}
                                onChange={(e) => setCompraData({ ...compraData, selection_id: e.target.value })}>
                                <option value="">-- Seleccionar --</option>
                                <optgroup label="📦 YA EN BODEGA">{insumos.map(i => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre_insumo}</option>)}</optgroup>
                                <optgroup label="🌿 CATÁLOGO IA">{catalogoMaestro.map(c => <option key={c.id_catalogo} value={`cat_${c.id_catalogo}`}>{c.nombre}</option>)}</optgroup>
                            </select>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Cant. Bultos" className="bg-[#F4F6F4] border-2 border-[#E6F4D7] rounded-2xl p-5 font-black outline-none" onChange={(e) => setCompraData({ ...compraData, cantidad_bultos: e.target.value })} />
                                <input type="number" placeholder="Precio x Bulto" className="bg-[#F4F6F4] border-2 border-[#E6F4D7] rounded-2xl p-5 font-black outline-none" onChange={(e) => setCompraData({ ...compraData, precio_bulto_neto: e.target.value })} />
                            </div>
                            <button onClick={handleCompraInsumo} className="w-full bg-[#11261F] text-white py-6 rounded-[28px] font-black uppercase shadow-xl hover:bg-[#8CB33E] transition-all">Confirmar Registro</button>
                            <button onClick={() => setShowCompraModal(false)} className="w-full text-[10px] font-black uppercase text-gray-400 mt-4 text-center">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SUMINISTRO EN KG */}
            {showSuministroModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#11261F]/95 backdrop-blur-md p-4 animate-in zoom-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[48px] p-10 shadow-2xl text-center border-4 border-[#11261F]">
                        <h3 className="text-xl font-black text-[#11261F] uppercase mb-1 italic">Suministro de Lote</h3>
                        <p className="text-[9px] font-black text-[#8CB33E] uppercase mb-10 tracking-widest underline decoration-2 underline-offset-4">Prorrateo para {allAnimales.length} animales</p>
                        <div className="space-y-6">
                            <select className="w-full bg-[#F4F6F4] border-2 border-[#E6F4D7] rounded-2xl p-4 font-black outline-none"
                                onChange={(e) => setSuministroData({ ...suministroData, id_insumo: e.target.value })}>
                                <option value="">-- Seleccionar Insumo --</option>
                                {insumos.filter(ins => ins.stock_actual_kg > 0).map(ins => (
                                    <option key={ins.id_insumo} value={ins.id_insumo}>
                                        {ins.nombre_insumo} ({ins.stock_actual_kg}kg disp.)
                                    </option>
                                ))}
                            </select>
                            <input type="number" placeholder="Kilogramos a repartir" className="w-full bg-[#F4F6F4] border-2 border-[#E6F4D7] rounded-2xl p-4 font-black text-center text-xl outline-none placeholder:text-sm" onChange={(e) => setSuministroData({ ...suministroData, cantidad_kg: e.target.value })} />
                            <button onClick={handleSuministroMasivo} className="w-full bg-[#8CB33E] text-white py-5 rounded-[28px] font-black uppercase shadow-xl hover:bg-[#11261F] transition-all active:scale-95">Distribuir en Villa Mora</button>
                            <button onClick={() => setShowSuministroModal(false)} className="w-full text-[10px] font-black uppercase text-[#11261F]/30 mt-4">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}