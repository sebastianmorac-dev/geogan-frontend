import React, { useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import useDashboardData from '../hooks/useDashboardData';
import useAuthStore from '../store/authStore';
import api from '../api/client';
import logo from '../assets/logo_geogan.png';

// --- Hubs de Composición por Rol ---
import PropietarioHub from '../components/dashboard/hubs/PropietarioHub';
import ContadorHub from '../components/dashboard/hubs/ContadorHub';
import AdministradorHub from '../components/dashboard/hubs/AdministradorHub';

// --- Tabs base (solo para superadmin que necesita la vista completa) ---
import ResumenTab from '../components/dashboard/tabs/ResumenTab';
import LotesTab from '../components/dashboard/tabs/LotesTab';
import NutricionTab from '../components/dashboard/tabs/NutricionTab';
import SanidadTab from '../components/dashboard/tabs/SanidadTab';
import BodegaTab from '../components/dashboard/tabs/BodegaTab';
import AnaliticaTab from '../components/dashboard/tabs/AnaliticaTab';
import ImportarGanado from '../components/dashboard/ImportarGanado';
import Sidebar from '../components/layout/Sidebar';
import TierraTab from '../components/dashboard/tabs/TierraTab';

// --- Modales globales (viven en este nivel) ---
import ModalAjustarPrecio from '../components/modals/ModalAjustarPrecio';
import ModalOverlay from '../components/modals/ModalOverlay';
import ModalConsumo from '../components/modals/ModalConsumo';
import ModalTratamientoGrupal from '../components/modals/ModalTratamientoGrupal';
import RoleGuard from '../components/auth/RoleGuard';

/**
 * DashboardPage — Director de Tráfico Multi-Rol
 * 
 * Lee el rol del usuario desde authStore y renderiza el Hub correspondiente:
 * - operario    → Redirect a /campo
 * - propietario → PropietarioHub (Visión Estratégica)
 * - encargado   → AdministradorHub (Gestión + SINIGÁN)
 * - contador    → ContadorHub (Auditoría Financiera)
 * - superadmin  → Vista completa con tabs (modo desarrollo)
 * 
 * Los modales se mantienen en este nivel para ser compartidos por todos los Hubs.
 */
export default function DashboardPage() {
    const dashboard = useDashboardData();
    const user = useAuthStore((state) => state.user);
    const rol = user?.rol;
    const [showImportar, setShowImportar] = React.useState(false);

    // --- TRÁFICO: El operario va directo al campo ---
    if (rol === 'operario') {
        return <Navigate to="/campo" replace />;
    }

    // --- Tabs para superadmin (vista completa con todas las pestañas) ---
    const allTabs = [
        { id: 'resumen', label: 'Mi Resumen' },
        { id: 'analitica', label: 'Visión Estratégica' },
        { id: 'tierra', label: 'Mapeo de Tierra' },
        { id: 'lotes', label: 'Gestión de Lotes' },
        { id: 'nutricion', label: 'Nutrición' },
        { id: 'sanidad', label: 'Libreta de Vacunas' },
        { id: 'bodega', label: 'Bodega' }
    ];

    // Mapeo de título y subtítulo según el rol
    const rolConfig = {
        propietario: { titulo: 'Panel de Propietario', subtitulo: '📊 Visión Estratégica' },
        administrador: { titulo: 'Panel de Administración', subtitulo: '🏛️ Gestión & Cumplimiento' },
        contador:    { titulo: 'Panel Contable', subtitulo: '🧾 Auditoría de Inventarios' },
        superadmin:  { titulo: 'Panel de Control', subtitulo: '🛠️ Vista Completa (Dev)' },
    };
    const config = rolConfig[rol] || rolConfig.superadmin;

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#11261F] antialiased">
            {/* ════════════════════════════════════════════
                HEADER GLOBAL — Compartido por todos los Hubs
            ════════════════════════════════════════════ */}
            <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-slate-200 h-24 px-12 flex justify-between items-center shadow-sm">
                <img src={logo} alt="GeoGan" style={{ height: '140px', margin: '-30px 0' }} />
                <div className="flex gap-6 items-center">
                    {/* Badge Dev Mode para superadmin */}
                    {rol === 'superadmin' && (
                        <span className="bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-violet-200">
                            🛠️ Dev Mode
                        </span>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 hidden md:block">{user?.nombre}</span>
                        <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hidden md:block">{rol}</span>
                    </div>
                    <select value={dashboard.fincaSel} onChange={(e) => dashboard.setFincaSel(e.target.value)} className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl font-black text-sm outline-none cursor-pointer">
                        <option value="">-- SELECCIONAR UNA FINCA --</option>
                        {dashboard.fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre?.toUpperCase()}</option>)}
                    </select>
                    <button onClick={dashboard.logout} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-all">✕</button>
                </div>
            </header>

            {!dashboard.fincaSel ? (
                /* ════════ PANTALLA DE BIENVENIDA ════════ */
                <div className="flex flex-col items-center justify-center min-h-screen pt-24 text-center px-4">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-slate-200 text-4xl">👋</div>
                    <h2 className="text-3xl font-black uppercase tracking-tight mb-3 text-slate-800">Hola, te damos la bienvenida</h2>
                    <p className="text-slate-500 text-lg max-w-md leading-relaxed">
                        Para empezar a trabajar y ver cómo está tu ganado, por favor elige una de tus fincas en el menú de arriba.
                    </p>
                </div>
            ) : (
                <>
                    {/* Render Sidebar for superadmin */}
                    {rol === 'superadmin' && (
                        <Sidebar activeTab={dashboard.activeTab} setActiveTab={(tab) => { dashboard.setActiveTab(tab); dashboard.setSelectedLote(null); }} />
                    )}

                    <main className={`mt-24 pb-20 mx-auto w-full animate-in fade-in duration-500 ${rol === 'superadmin' ? 'ml-64 px-12 py-8 max-w-[calc(100%-16rem)]' : 'px-12 mt-32 max-w-[1600px]'}`}>

                    {/* ════════ TÍTULO DEL PANEL POR ROL ════════ */}
                    <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <p className="text-sm font-black text-[#8CB33E] uppercase tracking-widest mb-2">{config.subtitulo}</p>
                            <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-800">{dashboard.fincaActual?.nombre}</h2>
                        </div>
                        
                        <div className="flex gap-4 items-center">
                            {showImportar ? (
                                <button onClick={() => setShowImportar(false)} className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-[#11261F]">← Volver al Dashboard</button>
                            ) : (
                                <button onClick={() => setShowImportar(true)} className="bg-white border-2 border-slate-200 text-[#11261F] px-6 py-3.5 rounded-xl text-xs font-black uppercase shadow-sm hover:border-[#8CB33E] transition-all flex items-center gap-2">
                                    📥 Importar SINIGÁN (CSV)
                                </button>
                            )}
                        </div>

                        {/* Solo el superadmin ve el tab-bar completo (Deprecated: Usando Sidebar ahora, pero mantenemos por si el usuario achica la pantalla luego lo volvemos responsive) */}
                        {/* 
                        {rol === 'superadmin' && (
                            <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex-wrap">
                                {allTabs.map(tab => (
                                    <button key={tab.id} onClick={() => { dashboard.setActiveTab(tab.id); dashboard.setSelectedLote(null); }}
                                        className={`px-8 py-3.5 rounded-xl text-sm font-black uppercase transition-all ${dashboard.activeTab === tab.id ? 'bg-[#11261F] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        */}
                    </div>

                    {/* ════════ CONTENIDO POR ROL ════════ */}
                    {showImportar ? (
                        <ImportarGanado fincaSel={dashboard.fincaSel} />
                    ) : (
                        <>
                            {rol === 'propietario' && <PropietarioHub dashboard={dashboard} />}
                            {rol === 'administrador' && <AdministradorHub dashboard={dashboard} />}
                            {rol === 'contador'    && <ContadorHub dashboard={dashboard} />}

                            {/* Superadmin: vista con tabs completa (preservada del Sprint 1) */}
                            {rol === 'superadmin' && (
                                <>
                                    {dashboard.activeTab === 'resumen' && (
                                        <ResumenTab {...dashboard} />
                                    )}
                                    {dashboard.activeTab === 'analitica' && (
                                        <RoleGuard allowedRoles={['superadmin', 'propietario', 'administrador', 'contador']}>
                                            <AnaliticaTab 
                                                fincaActual={dashboard.fincaActual}
                                                allAnimales={dashboard.allAnimales}
                                                lotesReales={dashboard.lotesReales}
                                            />
                                        </RoleGuard>
                                    )}
                                    {dashboard.activeTab === 'tierra'    && <TierraTab {...dashboard} />}
                                    {dashboard.activeTab === 'lotes'     && <LotesTab {...dashboard} />}
                                    {dashboard.activeTab === 'nutricion' && <NutricionTab {...dashboard} />}
                                    {dashboard.activeTab === 'sanidad'   && <SanidadTab {...dashboard} />}
                                    {dashboard.activeTab === 'bodega'    && <BodegaTab {...dashboard} />}
                                </>
                            )}
                        </>
                    )}

                </main>
                </>
            )}

            {/* ════════════════════════════════════════════
                MODALES GLOBALES — Compartidos por todos los Hubs
                (Preservados íntegramente del Sprint 1)
            ════════════════════════════════════════════ */}

            <ModalOverlay isOpen={dashboard.showCompraModal} onClose={() => dashboard.setShowCompraModal(false)} title="REGISTRAR NUEVA COMPRA" maxWidth="md">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const payload = {
                        id_insumo: parseInt(formData.get('id_insumo')),
                        cantidad_bultos: parseFloat(formData.get('cantidad_bultos')),
                        medida_empaque_unidad: parseFloat(formData.get('medida_empaque_unidad')),
                        precio_bulto_neto: parseFloat(formData.get('precio_bulto_neto')),
                        costo_flete_total: parseFloat(formData.get('costo_flete_total')) || 0,
                    };
                    try {
                        await api.post('/insumos/compra', payload);
                        dashboard.notifySuccess("✅ ¡Compra registrada! El stock y el precio real por kilo se actualizaron automáticamente.");
                        dashboard.setShowCompraModal(false);
                        dashboard.loadInsumos();
                    } catch (error) {
                        dashboard.notifyError("Error al registrar compra. Revisa la pestaña Network.");
                    }
                }} className="space-y-6">

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Producto a Ingresar</label>
                        <select name="id_insumo" required className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                            <option value="">Seleccione del inventario...</option>
                            {dashboard.insumos.map(insumo => (
                                <option key={insumo.id_insumo} value={insumo.id_insumo}>
                                    {insumo.nombre_insumo} (Stock actual: {insumo.stock_actual_unidad || insumo.stock_actual_kg} {insumo.unidad_empaque || 'kg'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cant. de Empaques</label>
                            <input type="number" step="0.01" name="cantidad_bultos" required placeholder="Ej: 10" 
                                className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Contenido x Empaque (KG)</label>
                            <input type="number" step="0.01" name="medida_empaque_unidad" required placeholder="Ej: 40" 
                                className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#8CB33E] uppercase ml-2">Precio x Empaque ($)</label>
                            <input type="number" step="0.01" name="precio_bulto_neto" required placeholder="Ej: 85000" 
                                className="w-full bg-green-50 text-green-900 rounded-2xl p-4 text-sm font-black outline-none border-2 border-green-200 focus:border-[#8CB33E]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Flete Total ($)</label>
                            <input type="number" step="0.01" name="costo_flete_total" placeholder="Ej: 15000 (Opcional)" 
                                className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" />
                        </div>
                    </div>

                    <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin', 'encargado']}>
                        <button type="submit" className="w-full bg-[#11261F] text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#8CB33E] transition-all">
                            Ingresar a Bodega
                        </button>
                    </RoleGuard>
                </form>
            </ModalOverlay>

            {dashboard.showEditarInsumoModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-4 text-center">Editar Producto</h3>
                        <p className="text-center text-sm font-bold text-slate-500 mb-8 uppercase">{dashboard.insumoEditData.nombre}</p>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2">Cantidad Disponible</label>
                                <input type="number" min="0" value={dashboard.insumoEditData.cantidad} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2"
                                    onChange={(e) => dashboard.setInsumoEditData({ ...dashboard.insumoEditData, cantidad: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2">Costo Total ($)</label>
                                <input type="number" min="0" value={dashboard.insumoEditData.precio} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2"
                                    onChange={(e) => dashboard.setInsumoEditData({ ...dashboard.insumoEditData, precio: e.target.value })} />
                            </div>
                            <button onClick={dashboard.handleGuardarEdicionInsumo} className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase mt-4 hover:bg-[#7a9d35] transition-colors">Guardar Cambios</button>
                            <button onClick={() => dashboard.setShowEditarInsumoModal(false)} className="w-full text-sm font-black uppercase text-slate-500 mt-2">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {dashboard.showSuministroModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-8 text-center">Alimentar Lote</h3>
                        <div className="space-y-6">
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none" onChange={(e) => dashboard.setSuministroData({ ...dashboard.suministroData, id_lote: e.target.value })}>
                                <option value="">-- ¿A qué lote le darás comida? --</option>
                                {dashboard.lotesNombres.map(lote => <option key={lote} value={lote}>{lote}</option>)}
                            </select>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none" onChange={(e) => dashboard.setSuministroData({ ...dashboard.suministroData, id_insumo: e.target.value })}>
                                <option value="">-- ¿Qué producto de la bodega? --</option>
                                {dashboard.insumos.filter(ins => (ins.stock_actual_unidad || ins.stock_actual_kg) > 0).map(ins => (
                                    <option key={ins.id_insumo} value={ins.id_insumo}>{ins.nombre_insumo.toUpperCase()} ({(ins.stock_actual_unidad || ins.stock_actual_kg)} disp.)</option>
                                ))}
                            </select>
                            <input type="number" min="0" placeholder="Cantidad a repartir (Ej: 2 pacas, 5 dosis...)" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black text-center text-xl outline-none" onChange={(e) => dashboard.setSuministroData({ ...dashboard.suministroData, cantidad_kg: e.target.value })} />
                            <button onClick={dashboard.handleSuministro} className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase shadow-md hover:bg-[#7a9d35]">Registrar y Descontar</button>
                            <button onClick={() => dashboard.setShowSuministroModal(false)} className="w-full text-sm font-black uppercase text-slate-500 mt-2">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {dashboard.showNuevoLoteModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-8 text-center">Crear Nuevo Lote</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2">Nombre del Lote</label>
                                <input type="text" placeholder="Ej: Cebas 1, Levantes, Destete..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2 text-slate-800"
                                    value={dashboard.nuevoLoteData.nombre} onChange={(e) => dashboard.setNuevoLoteData({ ...dashboard.nuevoLoteData, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2">Tipo de Manejo</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2 text-slate-800"
                                    value={dashboard.nuevoLoteData.tipo_manejo} onChange={(e) => dashboard.setNuevoLoteData({ ...dashboard.nuevoLoteData, tipo_manejo: e.target.value })}>
                                    <option value="General">General</option>
                                    <option value="Ceba">Ceba (Engorde)</option>
                                    <option value="Levante">Levante</option>
                                    <option value="Cría">Cría</option>
                                    <option value="Lechería">Lechería</option>
                                    <option value="Enfermería">Enfermería / Cuarentena</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2 mb-2 block">Responsable(s) (Operario/Encargado)</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2">
                                    {dashboard.equipoActividad?.operarios?.length > 0 ? dashboard.equipoActividad.operarios.map(op => {
                                        const isSelected = dashboard.nuevoLoteData.responsables_ids?.includes(op.id_usuario);
                                        return (
                                            <label key={op.id_usuario} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-[#8CB33E] rounded border-gray-300"
                                                    checked={isSelected || false}
                                                    onChange={(e) => {
                                                        const currentIds = dashboard.nuevoLoteData.responsables_ids || [];
                                                        const newIds = e.target.checked 
                                                            ? [...currentIds, op.id_usuario] 
                                                            : currentIds.filter(id => id !== op.id_usuario);
                                                        dashboard.setNuevoLoteData({ ...dashboard.nuevoLoteData, responsables_ids: newIds });
                                                    }}
                                                />
                                                <div>
                                                    <p className="text-sm font-black text-[#11261F] leading-none">{op.nombre_completo}</p>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">{op.rol}</p>
                                                </div>
                                            </label>
                                        );
                                    }) : (
                                        <p className="text-xs text-gray-400 font-bold p-2 text-center">No hay operarios registrados en la finca.</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2">Meta de ganancia diaria 📈 (kg/día)</label>
                                <input type="number" step="0.01" placeholder="Ej: 0.6" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2 text-slate-800"
                                    value={dashboard.nuevoLoteData.gmd_meta} onChange={(e) => dashboard.setNuevoLoteData({ ...dashboard.nuevoLoteData, gmd_meta: e.target.value })} />
                            </div>
                            <button onClick={dashboard.handleCrearLote} className="w-full bg-[#11261F] text-white py-5 rounded-2xl font-black uppercase mt-4 shadow-md hover:bg-[#8CB33E] transition-colors">Guardar Lote</button>
                            <button onClick={() => dashboard.setShowNuevoLoteModal(false)} className="w-full text-sm font-black uppercase text-slate-500 mt-2 hover:underline">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {dashboard.showEditarLoteModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-8 text-center">Editar Lote</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2">Nombre del Lote</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2 text-slate-800"
                                    value={dashboard.loteEditData.nombre} onChange={(e) => dashboard.setLoteEditData({ ...dashboard.loteEditData, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2">Tipo de Manejo</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2 text-slate-800"
                                    value={dashboard.loteEditData.tipo_manejo} onChange={(e) => dashboard.setLoteEditData({ ...dashboard.loteEditData, tipo_manejo: e.target.value })}>
                                    <option value="General">General</option>
                                    <option value="Ceba">Ceba (Engorde)</option>
                                    <option value="Levante">Levante</option>
                                    <option value="Cría">Cría</option>
                                    <option value="Lechería">Lechería</option>
                                    <option value="Enfermería">Enfermería / Cuarentena</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2 mb-2 block">Responsable(s) (Operario/Encargado)</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2">
                                    {dashboard.equipoActividad?.operarios?.length > 0 ? dashboard.equipoActividad.operarios.map(op => {
                                        const isSelected = dashboard.loteEditData.responsables_ids?.includes(op.id_usuario);
                                        return (
                                            <label key={op.id_usuario} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-[#8CB33E] rounded border-gray-300"
                                                    checked={isSelected || false}
                                                    onChange={(e) => {
                                                        const currentIds = dashboard.loteEditData.responsables_ids || [];
                                                        const newIds = e.target.checked 
                                                            ? [...currentIds, op.id_usuario] 
                                                            : currentIds.filter(id => id !== op.id_usuario);
                                                        dashboard.setLoteEditData({ ...dashboard.loteEditData, responsables_ids: newIds });
                                                    }}
                                                />
                                                <div>
                                                    <p className="text-sm font-black text-[#11261F] leading-none">{op.nombre_completo}</p>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">{op.rol}</p>
                                                </div>
                                            </label>
                                        );
                                    }) : (
                                        <p className="text-xs text-gray-400 font-bold p-2 text-center">No hay operarios registrados en la finca.</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 ml-2">Meta de ganancia diaria 📈 (kg/día)</label>
                                <input type="number" step="0.01" placeholder="Ej: 0.6" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2 text-slate-800"
                                    value={dashboard.loteEditData.gmd_meta} onChange={(e) => dashboard.setLoteEditData({ ...dashboard.loteEditData, gmd_meta: e.target.value })} />
                            </div>
                            <button onClick={dashboard.handleGuardarEdicionLote} className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase mt-4 shadow-md hover:bg-[#7a9d35] transition-colors">Actualizar Cambios</button>
                            <button onClick={() => dashboard.setShowEditarLoteModal(false)} className="w-full text-sm font-black uppercase text-slate-500 mt-2 hover:underline">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {dashboard.showImportarModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-[#11261F] uppercase">Carga Masiva</h3>
                            <button onClick={() => { dashboard.setShowImportarModal(false); dashboard.setArchivoPesajes(null); }} className="text-slate-400 hover:text-red-500 font-bold text-xl">✕</button>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                            Sube el archivo CSV o Excel de tu báscula electrónica. Asegúrate de tener las columnas: <span className="font-black text-slate-800">Identificación</span>, <span className="font-black text-slate-800">Peso</span> y <span className="font-black text-slate-800">Fecha</span>.
                        </p>
                        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:bg-slate-50 transition-colors relative group">
                            <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={dashboard.handleArchivoSeleccionado} value="" />
                            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📊</div>
                            <div>
                                <p className="text-slate-800 font-black text-sm uppercase">Haz clic o arrastra tu archivo CSV aquí</p>
                                <p className="text-xs font-bold text-slate-400 mt-1">Soporta delimitadores por coma o punto y coma</p>
                            </div>
                        </div>
                        <div className="mt-8 space-y-3">
                            <button onClick={() => { dashboard.setShowImportarModal(false); dashboard.setArchivoPesajes(null); }} className="w-full text-xs font-black uppercase text-slate-400 hover:underline text-center">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {dashboard.showMapeoModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-[#11261F] uppercase">Confirmar Columnas</h3>
                            <button onClick={() => { dashboard.setShowMapeoModal(false); dashboard.setArchivoPesajes(null); dashboard.setColumnasCSV([]); dashboard.setDatosCSV([]); }} className="text-slate-400 hover:text-red-500 font-bold text-xl">✕</button>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                            Hemos leído tu archivo <span className="font-black text-[#8CB33E]">{dashboard.archivoPesajes?.name}</span>. Por favor confirma qué columna corresponde a cada dato:
                        </p>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Identificación (Obligatorio)</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-sm outline-none mt-2" value={dashboard.mapeo.id_excel} onChange={(e) => dashboard.setMapeo({ ...dashboard.mapeo, id_excel: e.target.value })}>
                                    <option value="">-- Selecciona la columna --</option>
                                    {dashboard.columnasCSV.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Peso en Kg (Obligatorio)</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-sm outline-none mt-2" value={dashboard.mapeo.peso} onChange={(e) => dashboard.setMapeo({ ...dashboard.mapeo, peso: e.target.value })}>
                                    <option value="">-- Selecciona la columna --</option>
                                    {dashboard.columnasCSV.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Fecha (Opcional)</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-sm outline-none mt-2" value={dashboard.mapeo.fecha} onChange={(e) => dashboard.setMapeo({ ...dashboard.mapeo, fecha: e.target.value })}>
                                    <option value="">-- Usa la fecha actual si está vacío --</option>
                                    {dashboard.columnasCSV.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="mt-8 space-y-3">
                                <button disabled={!dashboard.mapeo.id_excel || !dashboard.mapeo.peso || dashboard.isUploading} onClick={dashboard.handleImportarPesajesMasivos}
                                    className={`w-full py-5 rounded-2xl font-black uppercase shadow-md transition-all ${(!dashboard.mapeo.id_excel || !dashboard.mapeo.peso) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#11261F] text-white hover:bg-[#8CB33E]'}`}>
                                    {dashboard.isUploading ? 'Sincronizando...' : `Importar ${dashboard.datosCSV.length} Pesajes`}
                                </button>
                                <button onClick={() => { dashboard.setShowMapeoModal(false); dashboard.setShowImportarModal(true); }} className="w-full text-xs font-black uppercase text-slate-400 hover:underline text-center">Cancelar y Volver</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ModalAjustarPrecio
                isOpen={dashboard.showModalPrecio}
                onClose={() => dashboard.setShowModalPrecio(false)}
                precioActual={dashboard.precioKilo}
                idFinca={dashboard.cleanId}
                onActualizado={(nuevoValor) => dashboard.setPrecioKilo(nuevoValor)}
            />

            <ModalOverlay isOpen={dashboard.showNuevoProductoModal} onClose={() => dashboard.setShowNuevoProductoModal(false)} title="NUEVO PRODUCTO PARA TU FINCA" maxWidth="sm">
                <form onSubmit={dashboard.handleCrearInsumo} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre Comercial</label>
                        <input type="text" name="nombre_insumo" required placeholder="EJ: PURGANTE XYZ, SAL 12%..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2 uppercase" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo de Insumo</label>
                        <select name="tipo_insumo" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2">
                            <option value="">Seleccione...</option>
                            <option value="Nutrición">Nutrición (Sales, Concentrados)</option>
                            <option value="Sanidad">Sanidad (Medicamentos, Vacunas)</option>
                            <option value="Agroquímico">Agroquímico (Fertilizantes, Venenos)</option>
                            <option value="Herramienta">Materiales / Herramientas</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Unidad Base Comercial</label>
                        <select name="unidad_medida_base" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none mt-2">
                            <option value="">Seleccione...</option>
                            <option value="KG">Kilogramos (KG)</option>
                            <option value="LT">Litros (LT)</option>
                            <option value="UN">Unidades / Dosis (UN)</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase shadow-lg hover:bg-[#11261F] transition-all mt-4">Guardar Nuevo Producto</button>
                    <button type="button" onClick={() => dashboard.setShowNuevoProductoModal(false)} className="w-full text-xs font-black uppercase text-slate-400 mt-2">Cancelar</button>
                </form>
            </ModalOverlay>

            <ModalConsumo 
                isOpen={dashboard.showConsumoModal} 
                onClose={() => dashboard.setShowConsumoModal(false)} 
                insumosBodega={dashboard.insumos} 
                lotes={dashboard.lotesEnriquecidos}
                animalesActivos={dashboard.allAnimales.filter(a => a.estado === 'activo')}
                onGuardar={dashboard.handleRegistrarSalida} 
                preselectedLote={dashboard.selectedLote}
            />

            <ModalTratamientoGrupal
                isOpen={dashboard.showTratamientoGrupalModal}
                onClose={() => dashboard.setShowTratamientoGrupalModal(false)}
                loteActual={dashboard.lotesEnriquecidos.find(l => l.id_lote === dashboard.selectedLote) || { nombre: 'Selecciona un Lote', cabezas_reales: 0 }}
                animalesDelLote={dashboard.allAnimales.filter(a => a.id_lote === dashboard.selectedLote)}
                onGuardar={dashboard.handleGuardarTratamientoGrupal}
            />
        </div>
    );
}