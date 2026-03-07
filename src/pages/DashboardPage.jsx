import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const [fincas, setFincas] = useState([]);
    const [fincaSel, setFincaSel] = useState('');
    const [allAnimales, setAllAnimales] = useState([]);
    const [stats, setStats] = useState({ total: 0, promedioPeso: 0, alertas: 0, valorLote: "0" });
    const [loading, setLoading] = useState(true);

    // Valor estratégico por kilo (ajustable según mercado)
    const PRECIO_KG_ESTIMADO = 8500;

    // 1. CARGA DE FINCAS (UNIDADES DE NEGOCIO)
    const loadFincas = useCallback(async () => {
        try {
            const res = await api.get('/fincas/');
            if (res.data && res.data.length > 0) {
                setFincas(res.data);
                // Si no hay selección, tomamos la primera por defecto
                setFincaSel(prev => prev || res.data[0].id_finca);
            }
        } catch (err) {
            console.error("Error cargando fincas:", err);
        }
    }, []);

    // 2. CARGA DE ANIMALES Y CÁLCULO DE KPIs
    const loadData = useCallback(async () => {
        if (!fincaSel) return;
        setLoading(true);
        try {
            const res = await api.get(`/animales/?finca_id=${fincaSel}`);
            const data = res.data || [];
            setAllAnimales(data);

            const hoy = new Date();
            // Filtro de alertas: pesajes vencidos o programados para hoy
            const vencidos = data.filter(a => a.fecha_proximo_pesaje && new Date(a.fecha_proximo_pesaje) <= hoy).length;
            const sumaPesos = data.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);

            setStats({
                total: data.length,
                promedioPeso: data.length > 0 ? (sumaPesos / data.length).toFixed(1) : 0,
                alertas: vencidos,
                valorLote: (sumaPesos * PRECIO_KG_ESTIMADO).toLocaleString('es-CO')
            });
        } catch (err) {
            console.error("Error cargando animales:", err);
        } finally {
            setLoading(false);
        }
    }, [fincaSel]);

    useEffect(() => { loadFincas(); }, [loadFincas]);
    useEffect(() => { loadData(); }, [loadData]);

    if (!fincaSel && loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#F9FBFA]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#8CB33E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="font-black text-[#1A3D2F] uppercase tracking-widest text-xs">Sincronizando GeoGan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9FBFA] font-sans text-[#1A3D2F] antialiased flex flex-col">
            {/* HEADER CORPORATIVO */}
            <header className="fixed top-0 z-50 w-full bg-white border-b border-[#E6F4D7] h-28 px-10 flex justify-between items-center shadow-sm">
                <img src={logo} alt="GeoGan" className="h-30 w-auto object-contain" />

                <div className="flex items-center gap-8">
                    {/* SELECTOR DE FINCA (UNIDAD DE NEGOCIO) */}
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#8CB33E] tracking-widest text-right">Unidad de Negocio</p>
                        <select
                            value={fincaSel}
                            onChange={(e) => setFincaSel(e.target.value)}
                            className="bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-xl px-4 py-2 font-black text-[#1A3D2F] text-sm focus:ring-2 focus:ring-[#8CB33E] outline-none transition-all cursor-pointer"
                        >
                            {fincas.map(f => (
                                <option key={f.id_finca} value={f.id_finca}>{f.nombre?.toUpperCase() || 'SIN NOMBRE'}</option>
                            ))}
                        </select>
                    </div>

                    <div className="text-right border-l-2 border-[#E6F4D7] pl-8">
                        <p className="text-[10px] font-black uppercase text-[#8CB33E]">Administrador</p>
                        <p className="text-lg font-black uppercase">{user?.nombre || 'ANA MARÍA'}</p>
                    </div>
                    <button onClick={logout} className="text-xs font-black hover:text-[#8CB33E] transition-colors uppercase tracking-widest border-b-2 border-transparent hover:border-[#8CB33E] pb-1">Salir</button>
                </div>
            </header>

            <div className="flex pt-28 h-screen">
                {/* SIDEBAR ESTRATÉGICO */}
                <aside className="w-72 bg-white border-r border-[#E6F4D7] p-8 hidden lg:flex flex-col shrink-0">
                    <nav className="space-y-3 flex-1">
                        <button className="w-full text-left px-6 py-4 rounded-2xl bg-[#E6F4D7] text-[#1A3D2F] font-black text-xs uppercase tracking-widest">Dashboard</button>
                        <button onClick={() => navigate('/registrar-animal')} className="w-full text-left px-6 py-4 rounded-2xl text-[#8CB33E] font-black text-xs uppercase tracking-widest hover:bg-[#F9FBFA] transition-all">Registrar Animal</button>
                    </nav>
                </aside>

                <main className="flex-1 p-10 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">

                        {/* 1. KPIs DE RENDIMIENTO */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                            <div className="bg-white p-8 rounded-[40px] border border-[#E6F4D7] shadow-sm">
                                <p className="text-[10px] font-black text-[#8CB33E] uppercase mb-2">Inventario</p>
                                <h3 className="text-5xl font-black text-[#1A3D2F] tabular-nums">{stats.total}</h3>
                            </div>
                            <div className="bg-white p-8 rounded-[40px] border border-[#E6F4D7] shadow-sm">
                                <p className="text-[10px] font-black text-[#8CB33E] uppercase mb-2">Promedio Lote</p>
                                <h3 className="text-5xl font-black text-[#1A3D2F] tabular-nums">{stats.promedioPeso} <span className="text-xs font-bold uppercase text-gray-400">kg</span></h3>
                            </div>
                            <div className="bg-[#1A3D2F] p-8 rounded-[40px] shadow-lg shadow-[#1A3D2F]/20">
                                <p className="text-[10px] font-black text-[#8CB33E] uppercase mb-2">Valoración Estimada</p>
                                <h3 className="text-2xl font-black text-white tabular-nums">$ {stats.valorLote}</h3>
                            </div>
                            <div className={`p-8 rounded-[40px] border shadow-sm flex flex-col justify-center items-center transition-all ${stats.alertas > 0 ? 'bg-orange-50 border-orange-200 animate-pulse' : 'bg-white border-[#E6F4D7]'}`}>
                                <p className={`text-[10px] font-black uppercase mb-2 ${stats.alertas > 0 ? 'text-orange-600' : 'text-[#8CB33E]'}`}>Alertas Pesaje</p>
                                <h3 className={`text-5xl font-black ${stats.alertas > 0 ? 'text-orange-600' : 'text-[#1A3D2F]'}`}>{stats.alertas}</h3>
                            </div>
                        </div>

                        {/* 2. PANEL DE ACCIÓN INMEDIATA (ALERTAS) */}
                        {stats.alertas > 0 && (
                            <section className="mb-12">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="flex h-3 w-3 rounded-full bg-orange-600 animate-ping"></span>
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-orange-600">Tareas Pendientes de Pesaje</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {allAnimales
                                        .filter(a => a.fecha_proximo_pesaje && new Date(a.fecha_proximo_pesaje) <= new Date())
                                        .slice(0, 3)
                                        .map(a => (
                                            <div
                                                key={a.id_animal}
                                                onClick={() => navigate(`/editar-animal/${a.id_animal}`)}
                                                className="bg-white border-l-8 border-orange-600 p-6 rounded-[32px] shadow-md hover:translate-y-[-5px] transition-all cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-2xl font-black group-hover:text-orange-600 transition-colors">{a.codigo_identificacion}</span>
                                                    <span className="text-[8px] font-black bg-orange-100 text-orange-700 px-3 py-1 rounded-full uppercase">Crítico</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Venció: {a.fecha_proximo_pesaje}</p>
                                            </div>
                                        ))}
                                </div>
                            </section>
                        )}

                        {/* 3. TABLA GENERAL DE ACTIVOS */}
                        <div className="bg-white rounded-[40px] border border-[#E6F4D7] overflow-hidden shadow-sm">
                            <div className="px-10 py-8 border-b border-[#E6F4D7] flex justify-between items-center bg-[#F9FBFA]/50">
                                <h3 className="text-xs font-black uppercase tracking-widest">Censo de Activos Biológicos</h3>
                                <button
                                    onClick={() => navigate('/registrar-animal')}
                                    className="bg-[#1A3D2F] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#8CB33E] transition-all shadow-lg active:scale-95"
                                >
                                    + Nuevo Animal
                                </button>
                            </div>

                            <table className="w-full text-left">
                                <thead className="bg-[#E6F4D7]/30 border-b border-[#E6F4D7]">
                                    <tr className="text-[10px] font-black uppercase text-[#1A3D2F] tracking-[0.2em]">
                                        <th className="px-10 py-6">Identificador</th>
                                        <th className="px-6 py-6 text-center">Raza / Tipo</th>
                                        <th className="px-10 py-6 text-right font-black">Peso Actual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E6F4D7]">
                                    {allAnimales.length > 0 ? allAnimales.map((a) => (
                                        <tr key={a.id_animal} onClick={() => navigate(`/editar-animal/${a.id_animal}`)} className="hover:bg-[#F9FBFA] transition-all cursor-pointer group">
                                            <td className="px-10 py-6 font-black text-[#1A3D2F] group-hover:text-[#8CB33E] uppercase transition-colors">{a.codigo_identificacion}</td>
                                            <td className="px-6 py-6 text-center font-bold text-[10px] uppercase text-[#8CB33E]">{a.raza || 'Común'}</td>
                                            <td className="px-10 py-6 text-right font-black text-lg tabular-nums text-[#1A3D2F]">{a.peso} <span className="text-[10px] text-gray-300">KG</span></td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="px-10 py-24 text-center">
                                                <p className="font-black text-[#E6F4D7] uppercase tracking-[0.4em] text-xs">No hay activos registrados en esta unidad</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}