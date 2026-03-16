import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';
import ModalAjustarPrecio from '../components/modals/ModalAjustarPrecio';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const location = useLocation();

    // --- ESTADOS BASE ---
    const [fincas, setFincas] = useState([]);
    const [fincaSel, setFincaSel] = useState('');
    const [allAnimales, setAllAnimales] = useState([]);
    const [lotesBackend, setLotesBackend] = useState([]); // Base de datos real
    const [insumos, setInsumos] = useState([]);
    const [catalogoMaestro, setCatalogoMaestro] = useState([]);
    const [stats, setStats] = useState({ total: 0, promedioPeso: 0, alertas: 0, valorLote: "0", gastoHoy: 0 });

    // --- ESTADOS DE LAS NUEVAS FUNCIONALIDADES ---
    const [alertasInteligentes, setAlertasInteligentes] = useState([]);
    const [historialNutricion, setHistorialNutricion] = useState([]);
    const [lotesSeleccionadosMasivo, setLotesSeleccionadosMasivo] = useState([]);
    const [precioKilo, setPrecioKilo] = useState(8500); // <-- Precio dinámico por kg
    const [showModalPrecio, setShowModalPrecio] = useState(false);

    // --- PESTAÑAS Y MODALES ---
    const [activeTab, setActiveTab] = useState('resumen');
    const [selectedLote, setSelectedLote] = useState(null);

    const [showCompraModal, setShowCompraModal] = useState(false);
    const [showSuministroModal, setShowSuministroModal] = useState(false);

    const [showNuevoLoteModal, setShowNuevoLoteModal] = useState(false);
    const [nuevoLoteData, setNuevoLoteData] = useState({ nombre: '', tipo_manejo: 'General' });

    const [showEditarLoteModal, setShowEditarLoteModal] = useState(false);
    const [loteEditData, setLoteEditData] = useState({ id_lote: '', nombre: '', tipo_manejo: '' });

    // ESTADOS PARA EDITAR BODEGA
    const [showEditarInsumoModal, setShowEditarInsumoModal] = useState(false);
    const [insumoEditData, setInsumoEditData] = useState({ id_insumo: '', nombre: '', cantidad: '', precio: '' });

    const [compraData, setCompraData] = useState({ selection_id: '', cantidad_bultos: '', precio_bulto_neto: '', unidad: 'Kg' });
    const [suministroData, setSuministroData] = useState({ id_insumo: '', cantidad_kg: '', id_lote: '' });

    const fincaActual = fincas.find(f => String(f.id_finca).split(':')[0] === String(fincaSel).split(':')[0]);

    // UNIMOS LOS LOTES OFICIALES CON LOS DE LOS ANIMALES
    const nombresExtraidos = allAnimales.map(a => a.lote).filter(Boolean);
    const nombresOficiales = lotesBackend.map(l => l.nombre);
    const lotesNombres = Array.from(new Set(['General', ...nombresOficiales, ...nombresExtraidos]));
    // --- ESTADOS PARA CARGA MASIVA ---
    const [showImportarModal, setShowImportarModal] = useState(false);
    const [archivoPesajes, setArchivoPesajes] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // --- ESTADOS PARA MAPEO CSV ---
    const [columnasCSV, setColumnasCSV] = useState([]);
    const [datosCSV, setDatosCSV] = useState([]);
    const [mapeo, setMapeo] = useState({ id_excel: '', peso: '', fecha: '' });
    const [showMapeoModal, setShowMapeoModal] = useState(false);

    // --- EL MOTOR ORIGINAL ---
    const loadData = useCallback(async () => {
        if (!fincaSel) return;
        const cleanId = String(fincaSel).split(':')[0];
        try {
            const [resAnimales, resBodega, resSugeridos, resLotes] = await Promise.all([
                api.get(`/animales/?finca_id=${cleanId}`),
                api.get(`/insumos/?finca_id=${cleanId}`),
                api.get(`/insumos/catalogo-sugerido?finca_id=${cleanId}`),
                api.get(`/lotes/?finca_id=${cleanId}`).catch(() => ({ data: [] }))
            ]);

            const data = resAnimales.data || [];
            const bodega = resBodega.data || [];
            setAllAnimales(data);
            setInsumos(bodega);
            setCatalogoMaestro(resSugeridos.data || []);
            setLotesBackend(resLotes.data || []);
            
            // Tratamos de obtener el precio base de la finca si el endpoint existe, o dejamos el default
            try {
                const resPrecio = await api.get(`/fincas/${cleanId}/parametros`);
                if (resPrecio.data && resPrecio.data.precio_base_venta_kg) {
                    setPrecioKilo(resPrecio.data.precio_base_venta_kg);
                }
            } catch (err) {
                // Silencioso, simplemente usamos el estado actual (8500)
            }

            // MAQUETACIÓN DE ALERTAS GLOBALES
            const hoy = new Date();
            let nuevasAlertas = [];

            const pendientes = data.filter(a => a.fecha_proximo_pesaje && new Date(a.fecha_proximo_pesaje) <= hoy);
            if (pendientes.length > 0) {
                nuevasAlertas.push({
                    tipo: 'pesaje',
                    titulo: 'Pesajes Atrasados',
                    desc: `Tienes ${pendientes.length} animales que necesitan ir a la báscula.`,
                    accion: 'Ir a registrar pesos'
                });
            }

            const insumosBajos = bodega.filter(i => i.stock_actual_kg <= 50);
            if (insumosBajos.length > 0) {
                nuevasAlertas.push({
                    tipo: 'bodega',
                    titulo: 'Comida Escasa',
                    desc: `Hay ${insumosBajos.length} productos a punto de agotarse.`,
                    accion: 'Revisar mi bodega'
                });
            }

            nuevasAlertas.push({
                tipo: 'salud',
                titulo: 'Vacunación',
                desc: 'El Lote General requiere purga en los próximos 5 días.',
                accion: 'Preparar medicamentos'
            });

            setAlertasInteligentes(nuevasAlertas);

            // Pasamos el precioKilo actual dependiente del estado pero garantizado a reflejarse en la dependencia
            const sumaPesos = data.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);
            setStats({
                total: data.length,
                promedioPeso: data.length > 0 ? (sumaPesos / data.length).toFixed(1) : 0,
                alertas: nuevasAlertas.length,
                valorLote: (sumaPesos * precioKilo).toLocaleString('es-CO'),
                gastoHoy: stats.gastoHoy
            });
        } catch (err) { console.error("Error cargando datos:", err); }
    }, [fincaSel, precioKilo]);

    useEffect(() => {
        api.get('/fincas/').then(res => setFincas(res.data || [])).catch(err => setFincas([]));
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (location.state?.fromFinca) {
            setFincaSel(location.state.fromFinca);
            if (location.state.fromTab) setActiveTab(location.state.fromTab);
            if (location.state.fromLote) setSelectedLote(location.state.fromLote);
        }
    }, [location.state]);

    // --- ACCIONES FUNCIONALES ---
    const handleEliminarAnimal = async (id) => {
        if (!window.confirm("¿Confirma la eliminación de este registro?")) return;
        try { await api.delete(`/animales/${id}`); loadData(); } catch (err) { alert("Error al eliminar."); }
    };

    const handleCrearLote = async () => {
        if (!nuevoLoteData.nombre) {
            alert("El nombre del lote es obligatorio.");
            return;
        }
        try {
            await api.post('/lotes/', {
                id_finca: Number(String(fincaSel).split(':')[0]),
                nombre: nuevoLoteData.nombre,
                tipo_manejo: nuevoLoteData.tipo_manejo
            });
            setShowNuevoLoteModal(false);
            setNuevoLoteData({ nombre: '', tipo_manejo: 'General' });
            loadData();
        } catch (err) {
            alert("Error al crear el lote.");
        }
    };

    const handleEliminarLote = async (loteId, cantidadAnimales) => {
        if (cantidadAnimales > 0) {
            alert("⚠️ ACCIÓN BLOQUEADA: No puedes eliminar un lote que tiene animales adentro. Primero debes moverlos.");
            return;
        }
        if (!window.confirm("¿Estás segura de que deseas eliminar este lote vacío?")) return;
        try {
            await api.delete(`/lotes/${loteId}`);
            loadData();
        } catch (err) {
            alert("Error al eliminar el lote.");
        }
    };

    const handleGuardarEdicionLote = async () => {
        if (!loteEditData.nombre) return;
        try {
            await api.put(`/lotes/${loteEditData.id_lote}`, {
                nombre: loteEditData.nombre,
                tipo_manejo: loteEditData.tipo_manejo
            });
            setShowEditarLoteModal(false);
            loadData();
        } catch (err) {
            alert("Error al actualizar el lote.");
        }
    };

    const handleSuministro = async () => {
        if (!suministroData.id_insumo || !suministroData.cantidad_kg || !suministroData.id_lote) {
            alert("Por favor selecciona el Lote, el Producto y la Cantidad.");
            return;
        }
        try {
            await api.post('/insumos/suministro-lote', {
                id_insumo: Number(suministroData.id_insumo),
                cantidad_kg: Number(suministroData.cantidad_kg),
                id_lote: suministroData.id_lote,
                id_finca: Number(String(fincaSel).split(':')[0]),
                id_usuario: user?.id_usuario
            });
            setShowSuministroModal(false);
            loadData();
        } catch (err) { alert("Stock insuficiente o error en el servidor."); }
    };

    const toggleLoteMasivo = (lote) => {
        setLotesSeleccionadosMasivo(prev => prev.includes(lote) ? prev.filter(l => l !== lote) : [...prev, lote]);
    };

    const handleGuardarEdicionInsumo = async () => {
        if (!insumoEditData.cantidad || !insumoEditData.precio) return;
        try {
            await api.put(`/insumos/${insumoEditData.id_insumo}`, {
                stock_actual_kg: parseFloat(insumoEditData.cantidad),
                costo_promedio_kg: parseFloat(insumoEditData.precio)
            });
            setShowEditarInsumoModal(false);
            loadData();
        } catch (err) { alert("Error al actualizar el producto."); }
    };
    const handleArchivoSeleccionado = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setArchivoPesajes(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            // Separamos por líneas y detectamos si usa coma o punto y coma
            const lineas = text.split('\n').filter(line => line.trim() !== '');
            const separador = lineas[0].includes(';') ? ';' : ',';
            const headers = lineas[0].split(separador).map(h => h.trim());

            setColumnasCSV(headers);
            setDatosCSV(lineas.slice(1).map(linea => linea.split(separador)));

            // Auto-detección inteligente (Empatía UX)
            const autoMap = { id_excel: '', peso: '', fecha: '' };
            headers.forEach(h => {
                const hLower = h.toLowerCase();
                // Acentos o palabras comunes
                if (hLower.includes('arete') || hLower.includes('id') || hLower.includes('chapa') || hLower.includes('identifica')) autoMap.id_excel = h;
                if (hLower.includes('peso') || hLower.includes('kg')) autoMap.peso = h;
                if (hLower.includes('fecha')) autoMap.fecha = h;
            });

            setMapeo(autoMap);
            setShowImportarModal(false);
            setShowMapeoModal(true); // Abrimos el modal para que el ganadero confirme
        };
        reader.readAsText(file);
    };

    const handleImportarPesajesMasivos = async () => {
        if (!user?.usuario_id) {
            alert("⚠️ Error de sesión: No podemos identificar tu usuario. Por favor, recarga la página o vuelve a iniciar sesión.");
            return;
        }

        if (!mapeo.id_excel || !mapeo.peso) {
            alert("Debes seleccionar al menos las columnas de Identificación y Peso.");
            return;
        }

        setIsUploading(true);

        try {
            const indexId = columnasCSV.indexOf(mapeo.id_excel);
            const indexPeso = columnasCSV.indexOf(mapeo.peso);
            const indexFecha = mapeo.fecha ? columnasCSV.indexOf(mapeo.fecha) : -1;

            const registrosLimpios = [];

            datosCSV.forEach(fila => {
                // fila en este caso ya es un array de columnas porque se separó al leer el archivo.
                // Usamos la variable 'fila' directamente que representa las columnas extraídas
                const columnas = fila;

                // Validamos que la fila tenga suficientes columnas
                if (columnas.length > Math.max(indexId, indexPeso)) {
                    // Validamos que exista un peso válido y chapeta
                    const chapeta = columnas[indexId] ? String(columnas[indexId]).trim() : "";
                    const pesoVal = parseFloat(columnas[indexPeso]);

                    if (chapeta && !isNaN(pesoVal) && pesoVal > 0) {
                        registrosLimpios.push({
                            id_excel: chapeta,
                            peso: pesoVal,
                            fecha: indexFecha !== -1 && columnas[indexFecha] ? String(columnas[indexFecha]).trim() : new Date().toISOString().split('T')[0]
                        });
                    }
                }
            });

            if (registrosLimpios.length === 0) {
                alert("No se encontraron registros válidos para importar.");
                setIsUploading(false);
                return;
            }

            const payload = {
                id_finca: parseInt(String(fincaSel).split(':')[0]),
                id_usuario: user.usuario_id, // <-- Limpio y seguro
                fuente: "ARCHIVO_PLANO",
                registros: registrosLimpios
            };

            const res = await api.post('/animales/pesaje-lote', payload);
            const { procesados, no_encontrados } = res.data;

            // 1. OBLIGATORIO: Recargar el Dashboard para que el "Valor Estimado" suba en tiempo real
            loadData();

            // 2. Limpiar estados y cerrar modales
            setShowMapeoModal(false);
            setArchivoPesajes(null);
            setDatosCSV([]);
            setColumnasCSV([]);

            // 3. Alerta Inteligente (Empatia Ganadera)
            if (no_encontrados && no_encontrados.length > 0) {
                alert(
                    `¡Pesaje procesado!\n\n` +
                    `✅ Se actualizaron: ${procesados} animales.\n` +
                    `⚠️ Atención: Las siguientes chapetas no existen en la finca o ya fueron vendidas: ${no_encontrados.join(', ')}`
                );
            } else {
                alert(`¡Éxito total! Se actualizaron los pesos de ${procesados} animales.`);
            }

        } catch (error) {
            console.error("Error en la importación masiva:", error);
            alert("Hubo un error al intentar subir los pesajes. Revisa tu conexión.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F6F4] font-sans text-[#11261F] antialiased">
            {/* HEADER */}
            <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-[#E6F4D7] h-24 px-12 flex justify-between items-center shadow-sm">
                <img src={logo} alt="GeoGan" style={{ height: '140px', margin: '-30px 0' }} />
                <div className="flex gap-6 items-center">
                    <select value={fincaSel} onChange={(e) => setFincaSel(e.target.value)} className="bg-[#F9FBFA] border border-[#E6F4D7] px-6 py-3 rounded-2xl font-black text-sm outline-none cursor-pointer">
                        <option value="">-- SELECCIONAR UNA FINCA --</option>
                        {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre?.toUpperCase()}</option>)}
                    </select>
                    <button onClick={logout} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-all">✕</button>
                </div>
            </header>

            {!fincaSel ? (
                /* PANTALLA DE INICIO */
                <div className="flex flex-col items-center justify-center min-h-screen pt-24 text-center px-4">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-[#E6F4D7] text-4xl">👋</div>
                    <h2 className="text-3xl font-black uppercase tracking-tight mb-3 text-[#11261F]">Hola, te damos la bienvenida</h2>
                    <p className="text-gray-500 text-lg max-w-md leading-relaxed">
                        Para empezar a trabajar y ver cómo está tu ganado, por favor elige una de tus fincas en el menú de arriba.
                    </p>
                </div>
            ) : (
                <main className="mt-32 px-12 pb-20 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">

                    {/* TÍTULO Y NAVEGACIÓN */}
                    <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <p className="text-sm font-black text-[#8CB33E] uppercase tracking-widest mb-2">Panel de Control</p>
                            <h2 className="text-5xl font-black uppercase tracking-tighter text-[#11261F]">{fincaActual?.nombre}</h2>
                        </div>
                        <div className="flex gap-2 bg-white p-2 rounded-2xl border border-[#E6F4D7] shadow-sm">
                            {[
                                { id: 'resumen', label: 'Mi Resumen' },
                                { id: 'lotes', label: 'Gestión de Lotes' },
                                { id: 'nutricion', label: 'Nutrición' },
                                { id: 'sanidad', label: 'Sanidad' },
                                { id: 'bodega', label: 'Bodega' }
                            ].map(tab => (
                                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedLote(null); }}
                                    className={`px-8 py-3.5 rounded-xl text-sm font-black uppercase transition-all ${activeTab === tab.id ? 'bg-[#11261F] text-white shadow-md' : 'text-gray-400 hover:bg-[#F4F6F4]'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- PESTAÑA: RESUMEN --- */}
                    {activeTab === 'resumen' && (
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
                                <div className="lg:col-span-8 bg-[#11261F] rounded-[40px] p-10 text-white shadow-2xl flex flex-col justify-center">
                                    <div className="flex justify-between items-start mb-6">
                                        <p className="text-sm font-black uppercase tracking-widest text-[#8CB33E]">Valor Estimado de tus Animales</p>
                                        {/* ESCUDO DE ROLES: Solo admin/propietario ve el botón para editar */}
                                        {(user?.rol === 'admin' || user?.rol === 'propietario' || user?.rol === 'superadmin') && (
                                            <button 
                                                onClick={() => {
                                                    alert("Próximamente: Modal para actualizar el `precio_base_venta_kg` en la DB.");
                                                    setShowModalPrecio(true); // Preparado para tu modal
                                                }}
                                                className="bg-white/10 p-2 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                                                title="Ajustar precio de mercado por KG"
                                            >
                                                ✏️<span className="sr-only">Editar Precio</span>
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="text-6xl font-black italic tracking-tighter mb-10">$ {stats.valorLote}</h3>
                                    <div className="flex gap-6">
                                        <div className="bg-white/10 px-6 py-4 rounded-2xl"><p className="text-xs uppercase font-bold text-gray-300">Peso Promedio</p><p className="text-2xl font-black italic">{stats.promedioPeso} kg</p></div>
                                        <div className="bg-white/10 px-6 py-4 rounded-2xl"><p className="text-xs uppercase font-bold text-gray-300">Población Total</p><p className="text-2xl font-black italic">{stats.total} cabezas</p></div>
                                    </div>
                                </div>

                                <div className="lg:col-span-4 bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                                    <h4 className="text-base font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span> Atiende hoy ({stats.alertas})
                                    </h4>
                                    <div className="space-y-4">
                                        {alertasInteligentes.map((alerta, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    if (alerta.tipo === 'pesaje') setActiveTab('lotes');
                                                    if (alerta.tipo === 'bodega') setActiveTab('bodega');
                                                    if (alerta.tipo === 'salud') setActiveTab('sanidad');
                                                }}
                                                className="p-5 bg-[#F4F6F4] rounded-2xl border-l-4 border-[#8CB33E] cursor-pointer hover:bg-white hover:shadow-md transition-all group"
                                            >
                                                <p className="text-sm font-black uppercase text-[#11261F] mb-1">{alerta.titulo}</p>
                                                <p className="text-xs text-gray-600 font-medium mb-3">{alerta.desc}</p>
                                                <p className="text-[10px] font-black text-[#8CB33E] uppercase group-hover:underline">{alerta.accion} ➡️</p>
                                            </div>
                                        ))}
                                        {stats.alertas === 0 && <p className="text-gray-400 italic font-medium">Todo está al día.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PESTAÑA: GESTIÓN DE LOTES --- */}
                    {activeTab === 'lotes' && (
                        <div className="animate-in slide-in-from-left-4 duration-500">
                            {!selectedLote ? (
                                <>
                                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                                        <h4 className="text-lg font-black uppercase text-[#11261F]">Tus Lotes Actuales ({lotesNombres.length})</h4>
                                        <div className="flex gap-4">
                                            <button onClick={() => setShowImportarModal(true)} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors">Importar Pesajes</button>
                                            <button onClick={() => setShowNuevoLoteModal(true)} className="bg-[#11261F] text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg">+ Crear Nuevo Lote</button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {lotesNombres.map(lote => {
                                            const animalesDelLote = allAnimales.filter(a => (a.lote || 'General') === lote);
                                            const sumaPesosLote = animalesDelLote.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);
                                            const promedioLote = animalesDelLote.length > 0 ? (sumaPesosLote / animalesDelLote.length).toFixed(1) : 0;
                                            const valorLoteCalculado = (sumaPesosLote * precioKilo).toLocaleString('es-CO');
                                            const loteDb = lotesBackend.find(l => l.nombre === lote);

                                            return (
                                                <div key={lote} className="bg-white p-8 rounded-[32px] border border-[#E6F4D7] shadow-sm relative group hover:shadow-md transition-all">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" className="w-5 h-5 accent-[#11261F] rounded-md cursor-pointer"
                                                                checked={lotesSeleccionadosMasivo.includes(lote)} onChange={() => toggleLoteMasivo(lote)} />
                                                            <h5 className="text-2xl font-black uppercase text-[#11261F] tracking-tight">{lote}</h5>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-green-100 mr-1" title="Todos los animales están sanos">
                                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Sanos
                                                            </span>

                                                            {lote !== 'General' && loteDb && (
                                                                <>
                                                                    <button onClick={() => {
                                                                        setLoteEditData({ id_lote: loteDb.id_lote, nombre: loteDb.nombre, tipo_manejo: loteDb.tipo_manejo || 'General' });
                                                                        setShowEditarLoteModal(true);
                                                                    }} className="p-2 text-gray-400 hover:text-[#11261F] bg-gray-50 rounded-lg transition-colors" title="Editar Lote">✏️</button>
                                                                    <button onClick={() => handleEliminarLote(loteDb.id_lote, animalesDelLote.length)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg transition-colors" title="Eliminar Lote">🗑️</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-6xl font-black text-[#8CB33E] mb-1">{animalesDelLote.length}</p>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Cabezas en lote</p>

                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="bg-[#F4F6F4] p-3 rounded-xl"><p className="text-[10px] uppercase text-gray-500 font-bold">Peso Promedio</p><p className="font-black text-sm">{promedioLote} kg</p></div>
                                                        <div className="bg-[#F4F6F4] p-3 rounded-xl"><p className="text-[10px] uppercase text-gray-500 font-bold">% Ganancia Mes</p><p className="font-black text-sm text-[#8CB33E]">+12.5 %</p></div>
                                                    </div>

                                                    <div className="bg-[#FFF8F0] border border-[#FFE4C4] p-3 rounded-xl mb-6 flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[10px] uppercase text-gray-500 font-bold">Ubicación</p>
                                                            <p className="font-black text-sm text-[#11261F]">Potrero 3 (Estrella)</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase text-orange-500 font-bold">Rotación</p>
                                                            <p className="font-black text-sm text-orange-600">En 2 días ⏳</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-6 border-t border-[#F4F6F4]">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Valor Estimado</p>
                                                            <p className="font-black text-lg text-[#11261F]">$ {valorLoteCalculado}</p>
                                                        </div>
                                                        <button onClick={() => setSelectedLote(lote)} className="text-xs font-black uppercase text-[#8CB33E] hover:underline tracking-widest">Ver Lote →</button>
                                                    </div>
                                                </div>
                                            )
                                        })}
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
                                                    <h3 className="text-4xl font-black uppercase italic tracking-tighter text-[#11261F]">Lote: {selectedLote}</h3>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={() => alert("Próximamente: Acción sanitaria masiva para este lote")} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors">Tratamiento Grupal</button>
                                                    <button onClick={() => navigate('/registrar-animal', { state: { fromFinca: fincaSel, fromTab: 'lotes', fromLote: selectedLote } })}
                                                        className="bg-[#11261F] text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg">+ Nuevo Animal</button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="bg-white p-6 rounded-[24px] border border-[#E6F4D7] shadow-sm flex flex-col justify-center">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Rendimiento Actual</p>
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <p className="text-3xl font-black text-[#11261F]">{allAnimales.filter(a => (a.lote || 'General') === selectedLote).length}</p>
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Cabezas</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xl font-black text-[#8CB33E]">+12.5%</p>
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Ganancia</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-[#11261F] p-6 rounded-[24px] text-white shadow-md flex flex-col justify-center">
                                                    <p className="text-[10px] font-black text-[#8CB33E] uppercase tracking-widest mb-4">Sanidad del Grupo</p>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                                            <span className="text-[10px] font-bold text-gray-300">Última acción</span>
                                                            <span className="text-[10px] font-black uppercase text-white">Hace 20 días (Purga)</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-bold text-gray-300">Próxima acción</span>
                                                            <span className="text-[10px] font-black uppercase text-[#8CB33E]">Aftosa (En 10 días)</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-red-50 border border-red-100 p-6 rounded-[24px] flex flex-col justify-center shadow-sm">
                                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Alerta de Retiro
                                                    </p>
                                                    <p className="text-xs font-black text-red-900 leading-relaxed uppercase">2 animales en tiempo de retiro por antibióticos.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* TABLA ORIGINAL DE ANIMALES */}
                                        <table className="w-full text-left">
                                            <thead className="bg-[#F4F6F4] border-b border-[#E6F4D7] text-xs font-black uppercase text-gray-500">
                                                <tr><th className="px-12 py-6">Identificación</th><th className="px-6 py-6 text-center">Raza</th><th className="px-12 py-6 text-right">Peso Actual</th><th className="px-12 py-6 text-right">Acciones</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E6F4D7]">
                                                {allAnimales.filter(a => (a.lote || 'General') === selectedLote).map((a) => (
                                                    <tr key={a.id_animal} className="hover:bg-[#F4F6F4]/50 transition-all text-[#11261F]">
                                                        <td className="px-12 py-6 font-black uppercase text-lg">{a.codigo_identificacion}</td>
                                                        <td className="px-6 py-6 text-center text-sm font-bold text-gray-500 uppercase">{a.raza || 'Brahman'}</td>
                                                        <td className="px-12 py-6 text-right font-black text-2xl">{a.peso} <span className="text-sm font-normal">kg</span></td>
                                                        <td className="px-12 py-6 text-right">
                                                            <button onClick={() => navigate(`/editar-animal/${a.id_animal}`, { state: { fromFinca: fincaSel, fromTab: 'lotes', fromLote: selectedLote } })} className="text-xs font-black text-[#8CB33E] mr-6">EDITAR</button>
                                                            <button onClick={() => handleEliminarAnimal(a.id_animal)} className="text-xs font-black text-red-500">ELIMINAR</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </section>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- PESTAÑA: NUTRICIÓN --- */}
                    {activeTab === 'nutricion' && (
                        <div className="animate-in slide-in-from-right-4 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* EXPLICACIÓN Y GRÁFICO (COLUMNA 1) */}
                                <div className="lg:col-span-1 flex flex-col gap-8">
                                    <div className="bg-[#11261F] rounded-[40px] p-10 text-white shadow-xl">
                                        <h5 className="text-2xl font-black uppercase mb-4 text-[#8CB33E]">Inversión Nutricional</h5>
                                        <p className="text-sm text-white/80 leading-relaxed mb-6 font-medium">
                                            Esto es lo que has invertido en comida para que tus animales ganen peso. Si el número es verde y el ganado sube de peso, vas por buen camino.
                                        </p>
                                        <div className="bg-white/10 p-6 rounded-3xl border border-white/5">
                                            <p className="text-xs font-bold text-gray-300 uppercase mb-2">Costo promedio por kilo ganado</p>
                                            <p className="text-4xl font-black italic text-[#8CB33E]">$4,200</p>
                                        </div>
                                    </div>

                                    {/* Gráfico de Ganancia (Maquetación) */}
                                    <div className="bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                                        <h5 className="text-sm font-black uppercase tracking-widest mb-6">Tendencia de Ganancia de Peso</h5>
                                        <div className="h-40 border-b-2 border-l-2 border-[#E6F4D7] flex items-end justify-between px-4 pb-2 relative">
                                            <div className="absolute top-1/2 w-full border-t border-dashed border-gray-300"></div> {/* Línea base */}
                                            {/* Barras simuladas */}
                                            <div className="w-8 bg-[#8CB33E] h-[80%] rounded-t-sm"></div>
                                            <div className="w-8 bg-[#8CB33E] h-[60%] rounded-t-sm"></div>
                                            <div className="w-8 bg-red-400 h-[30%] rounded-t-sm" title="Pérdida de peso"></div>
                                            <div className="w-8 bg-[#8CB33E] h-[90%] rounded-t-sm"></div>
                                        </div>
                                        <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-400 uppercase">
                                            <span>Semana 1</span><span>Semana 4</span>
                                        </div>
                                    </div>
                                </div>

                                {/* HISTORIAL DE SUMINISTRO (COLUMNA 2 y 3) */}
                                <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="text-xl font-black uppercase text-[#11261F]">Historial de Alimento Suministrado</h4>
                                        <button onClick={() => setShowSuministroModal(true)} className="bg-[#8CB33E] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-[#7a9d35]">Repartir Alimento Ahora</button>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-[#F4F6F4] text-xs font-black uppercase text-gray-500">
                                            <tr><th className="px-6 py-4 rounded-tl-2xl">Fecha</th><th className="px-6 py-4">Lote Destino</th><th className="px-6 py-4">Producto (Solo Alimentos)</th><th className="px-6 py-4">Cantidad</th><th className="px-6 py-4 rounded-tr-2xl text-right">Acciones</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E6F4D7]">
                                            {/* Fila de maquetación */}
                                            <tr className="hover:bg-[#F4F6F4]/50 transition-all">
                                                <td className="px-6 py-5 font-bold text-sm">Hoy, 08:00 AM</td>
                                                <td className="px-6 py-5 font-black uppercase text-sm">Cebas Lote 1</td>
                                                <td className="px-6 py-5 font-bold text-sm text-[#8CB33E]">Sal Mineralizada 8%</td>
                                                <td className="px-6 py-5 font-black text-lg">25 Kg</td>
                                                <td className="px-6 py-5 text-right">
                                                    <button className="text-xs font-black text-gray-400 hover:text-[#11261F] mr-4">CORREGIR</button>
                                                    <button className="text-xs font-black text-red-400 hover:text-red-600">ELIMINAR</button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- PESTAÑA: SANIDAD (PLAN SANITARIO) --- */}
                    {activeTab === 'sanidad' && (
                        <div className="animate-in slide-in-from-right-4 duration-500 mb-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* EXPLICACIÓN Y MÉTRICAS (COLUMNA 1) */}
                                <div className="lg:col-span-1 flex flex-col gap-8">
                                    <div className="bg-[#11261F] rounded-[40px] p-10 text-white shadow-xl">
                                        <h5 className="text-2xl font-black uppercase mb-4 text-[#8CB33E]">Plan Sanitario</h5>
                                        <p className="text-sm text-white/80 leading-relaxed mb-6 font-medium">
                                            Lleva el control de vacunas, purgas y tratamientos. Un animal sano gana peso más rápido, aprovecha mejor la comida y evita pérdidas de dinero.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/10 p-6 rounded-3xl border border-white/5">
                                                <p className="text-[10px] font-bold text-gray-300 uppercase mb-2">Próxima Tarea</p>
                                                <p className="text-lg font-black italic text-[#8CB33E] leading-tight">Purga Lote 1</p>
                                                <p className="text-xs font-bold text-white mt-2">En 5 días</p>
                                            </div>
                                            <div className="bg-red-500/20 p-6 rounded-3xl border border-red-500/30 flex flex-col justify-center">
                                                <p className="text-[10px] font-bold text-red-200 uppercase mb-1">Enfermería</p>
                                                <p className="text-3xl font-black italic text-red-400">2</p>
                                                <p className="text-[10px] font-bold text-red-200 mt-1 uppercase">Animales en Tx</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* HISTORIAL CLÍNICO (COLUMNA 2 y 3) */}
                                <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="text-xl font-black uppercase text-[#11261F]">Historial Médico</h4>
                                        <button onClick={() => alert("Próximamente: Modal para registrar vacunas/purgas")} className="bg-[#8CB33E] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-[#7a9d35]">+ Registrar Tratamiento</button>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-[#F4F6F4] text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4 rounded-tl-2xl">Fecha</th>
                                                <th className="px-6 py-4">Destino</th>
                                                <th className="px-6 py-4">Motivo / Diagnóstico</th>
                                                <th className="px-6 py-4">Tratamiento y Dosis</th>
                                                <th className="px-6 py-4">Retiro 🚨</th>
                                                <th className="px-6 py-4 rounded-tr-2xl text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E6F4D7]">
                                            {/* Ejemplo 1: Tratamiento Individual (Enfermedad) */}
                                            <tr className="hover:bg-[#F4F6F4]/50 transition-all">
                                                <td className="px-6 py-5 font-bold text-xs text-gray-500">Hoy</td>
                                                <td className="px-6 py-5">
                                                    <span className="bg-[#11261F] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">INDIVIDUAL</span>
                                                    <p className="text-sm font-black mt-2">ID: V-045</p>
                                                </td>
                                                <td className="px-6 py-5 font-bold text-xs text-red-500 uppercase">Infección de Pezuña</td>
                                                <td className="px-6 py-5">
                                                    <p className="font-bold text-xs text-[#8CB33E] uppercase">Oxitetraciclina</p>
                                                    <p className="text-[10px] text-gray-500 font-bold mt-1">15 ml (Intramuscular)</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 w-fit">
                                                        ⏳ Faltan 14 Días
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button className="text-[10px] font-black text-gray-400 hover:text-[#11261F] hover:underline uppercase">Corregir</button>
                                                </td>
                                            </tr>
                                            {/* Ejemplo 2: Tratamiento Masivo (Prevención Lote) */}
                                            <tr className="hover:bg-[#F4F6F4]/50 transition-all">
                                                <td className="px-6 py-5 font-bold text-xs text-gray-500">Hace 1 mes</td>
                                                <td className="px-6 py-5">
                                                    <span className="bg-[#8CB33E] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">LOTE COMPLETO</span>
                                                    <p className="text-sm font-black mt-2">Lote Cebas</p>
                                                </td>
                                                <td className="px-6 py-5 font-bold text-xs text-gray-500 uppercase">Prevención (Ciclo)</td>
                                                <td className="px-6 py-5">
                                                    <p className="font-bold text-xs text-[#8CB33E] uppercase">Vacuna Aftosa</p>
                                                    <p className="text-[10px] text-gray-500 font-bold mt-1">2 ml / Animal (Subcutánea)</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="bg-green-50 border border-green-200 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 w-fit">
                                                        ✅ Libre
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button className="text-[10px] font-black text-gray-400 hover:text-[#11261F] hover:underline uppercase">Corregir</button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- PESTAÑA: BODEGA (GESTIÓN DE INVENTARIO) --- */}
                    {activeTab === 'bodega' && (
                        <div className="animate-in slide-in-from-right-4 duration-500">
                            <div className="flex justify-between items-center mb-10 px-4">
                                <h4 className="text-xl font-black uppercase text-[#11261F]">Inventario General de la Finca</h4>
                                <button onClick={() => setShowCompraModal(true)} className="bg-[#11261F] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-lg">+ Registrar Nueva Compra</button>
                            </div>
                            <div className="bg-white rounded-[40px] border border-[#E6F4D7] overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-[#F4F6F4] text-xs font-black uppercase text-gray-500">
                                        <tr><th className="px-10 py-6">Producto en Bodega</th><th className="px-10 py-6 text-center">Disponible</th><th className="px-10 py-6 text-right">Costo Promedio (KG)</th><th className="px-10 py-6 text-center">Gestión</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E6F4D7]">
                                        {insumos.map((ins) => (
                                            <tr key={ins.id_insumo} className="hover:bg-[#F4F6F4]/50 transition-all">
                                                <td className="px-10 py-6 font-black uppercase text-lg">{ins.nombre_insumo}</td>
                                                <td className="px-10 py-6 text-center">
                                                    <span className={`text-3xl font-black ${ins.stock_actual_kg < 50 ? 'text-red-500' : 'text-[#11261F]'}`}>{ins.stock_actual_kg}</span>
                                                    <span className="text-sm font-bold text-gray-400 ml-1">KG</span>
                                                </td>
                                                <td className="px-10 py-6 text-right font-black text-xl text-[#8CB33E]">$ {Number(ins.costo_promedio_kg).toLocaleString('es-CO')}</td>
                                                <td className="px-10 py-6">
                                                    <div className="flex justify-center gap-6">
                                                        <button
                                                            onClick={() => {
                                                                setInsumoEditData({ id_insumo: ins.id_insumo, nombre: ins.nombre_insumo, cantidad: ins.stock_actual_kg, precio: ins.costo_promedio_kg });
                                                                setShowEditarInsumoModal(true);
                                                            }}
                                                            className="text-xs font-black uppercase text-[#8CB33E] hover:underline tracking-tighter"
                                                        >
                                                            Editar
                                                        </button>
                                                        {user?.rol !== 'encargado' && (
                                                            <button
                                                                onClick={() => api.delete(`/insumos/${ins.id_insumo}`).then(() => loadData())}
                                                                className="text-xs font-black uppercase text-red-500 hover:text-red-700 tracking-tighter"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {insumos.length === 0 && <tr><td colSpan="4" className="py-16 text-center text-gray-500 font-bold text-lg">Tu bodega está vacía. Registra compras para empezar.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            )}

            {/* --- MODALES CONSERVADOS --- */}
            {/* Modal: Comprar Insumo (Bodega) */}
            {showCompraModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-8 text-center">Registrar Compra</h3>
                        <div className="space-y-6">
                            <select className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black text-sm outline-none" value={compraData.selection_id} onChange={(e) => setCompraData({ ...compraData, selection_id: e.target.value })}>
                                <option value="">-- Elige qué compraste --</option>
                                <optgroup label="EN BODEGA">{insumos.map(i => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre_insumo.toUpperCase()}</option>)}</optgroup>
                                <optgroup label="CATÁLOGO GENERAL">{catalogoMaestro.map(c => <option key={c.id_catalogo} value={`cat_${c.id_catalogo}`}>{c.nombre.toUpperCase()}</option>)}</optgroup>
                            </select>
                            <div className="grid grid-cols-3 gap-4">
                                <input type="number" min="0" placeholder="Cantidad" className="bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none" onChange={(e) => setCompraData({ ...compraData, cantidad_bultos: e.target.value })} />
                                <select className="bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none text-[#11261F]" value={compraData.unidad} onChange={(e) => setCompraData({ ...compraData, unidad: e.target.value })}>
                                    <option value="Kg">Kilos (Kg)</option>
                                    <option value="L">Litros (L)</option>
                                    <option value="ml">Mililitros (ml)</option>
                                    <option value="Bultos">Bultos</option>
                                    <option value="Pacas">Pacas</option>
                                    <option value="Dosis">Dosis</option>
                                    <option value="Und">Unidades</option>
                                </select>
                                <input type="number" min="0" placeholder="Precio Total ($)" className="bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none" onChange={(e) => setCompraData({ ...compraData, precio_bulto_neto: e.target.value })} />
                            </div>
                            <button onClick={() => setShowCompraModal(false)} className="w-full bg-[#11261F] text-white py-5 rounded-2xl font-black uppercase mt-4 hover:bg-[#8CB33E] transition-colors">Guardar en Bodega</button>
                            <button onClick={() => setShowCompraModal(false)} className="w-full text-sm font-black uppercase text-gray-500 mt-2">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar Insumo (Bodega) */}
            {showEditarInsumoModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-4 text-center">Editar Producto</h3>
                        <p className="text-center text-sm font-bold text-gray-500 mb-8 uppercase">{insumoEditData.nombre}</p>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 ml-2">Cantidad Disponible</label>
                                <input type="number" min="0" value={insumoEditData.cantidad} className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2"
                                    onChange={(e) => setInsumoEditData({ ...insumoEditData, cantidad: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 ml-2">Costo Total ($)</label>
                                <input type="number" min="0" value={insumoEditData.precio} className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2"
                                    onChange={(e) => setInsumoEditData({ ...insumoEditData, precio: e.target.value })} />
                            </div>
                            <button onClick={handleGuardarEdicionInsumo} className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase mt-4 hover:bg-[#7a9d35] transition-colors">Guardar Cambios</button>
                            <button onClick={() => setShowEditarInsumoModal(false)} className="w-full text-sm font-black uppercase text-gray-500 mt-2">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Repartir Alimento (Nutrición) */}
            {showSuministroModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-8 text-center">Alimentar Lote</h3>
                        <div className="space-y-6">
                            <select className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none" onChange={(e) => setSuministroData({ ...suministroData, id_lote: e.target.value })}>
                                <option value="">-- ¿A qué lote le darás comida? --</option>
                                {lotesNombres.map(lote => <option key={lote} value={lote}>{lote}</option>)}
                            </select>
                            <select className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none" onChange={(e) => setSuministroData({ ...suministroData, id_insumo: e.target.value })}>
                                <option value="">-- ¿Qué producto de la bodega? --</option>
                                {insumos.filter(ins => ins.stock_actual_kg > 0).map(ins => (
                                    <option key={ins.id_insumo} value={ins.id_insumo}>{ins.nombre_insumo.toUpperCase()} ({ins.stock_actual_kg}kg disp.)</option>
                                ))}
                            </select>
                            <input type="number" min="0" placeholder="Cantidad a repartir (Ej: 2 pacas, 5 dosis...)" className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black text-center text-xl outline-none" onChange={(e) => setSuministroData({ ...suministroData, cantidad_kg: e.target.value })} />
                            <button onClick={handleSuministro} className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase shadow-md hover:bg-[#7a9d35]">Registrar y Descontar</button>
                            <button onClick={() => setShowSuministroModal(false)} className="w-full text-sm font-black uppercase text-gray-500 mt-2">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Crear Nuevo Lote */}
            {showNuevoLoteModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-8 text-center">Crear Nuevo Lote</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 ml-2">Nombre del Lote</label>
                                <input type="text" placeholder="Ej: Cebas 1, Levantes, Destete..." className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2 text-[#11261F]"
                                    value={nuevoLoteData.nombre} onChange={(e) => setNuevoLoteData({ ...nuevoLoteData, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 ml-2">Tipo de Manejo</label>
                                <select className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2 text-[#11261F]"
                                    value={nuevoLoteData.tipo_manejo} onChange={(e) => setNuevoLoteData({ ...nuevoLoteData, tipo_manejo: e.target.value })}>
                                    <option value="General">General</option>
                                    <option value="Ceba">Ceba (Engorde)</option>
                                    <option value="Levante">Levante</option>
                                    <option value="Cría">Cría</option>
                                    <option value="Lechería">Lechería</option>
                                    <option value="Enfermería">Enfermería / Cuarentena</option>
                                </select>
                            </div>
                            <button onClick={handleCrearLote} className="w-full bg-[#11261F] text-white py-5 rounded-2xl font-black uppercase mt-4 shadow-md hover:bg-[#8CB33E] transition-colors">Guardar Lote</button>
                            <button onClick={() => setShowNuevoLoteModal(false)} className="w-full text-sm font-black uppercase text-gray-500 mt-2 hover:underline">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar Lote */}
            {showEditarLoteModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] p-12 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#11261F] uppercase mb-8 text-center">Editar Lote</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 ml-2">Nombre del Lote</label>
                                <input type="text" className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2 text-[#11261F]"
                                    value={loteEditData.nombre} onChange={(e) => setLoteEditData({ ...loteEditData, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 ml-2">Tipo de Manejo</label>
                                <select className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2 text-[#11261F]"
                                    value={loteEditData.tipo_manejo} onChange={(e) => setLoteEditData({ ...loteEditData, tipo_manejo: e.target.value })}>
                                    <option value="General">General</option>
                                    <option value="Ceba">Ceba (Engorde)</option>
                                    <option value="Levante">Levante</option>
                                    <option value="Cría">Cría</option>
                                    <option value="Lechería">Lechería</option>
                                    <option value="Enfermería">Enfermería / Cuarentena</option>
                                </select>
                            </div>
                            <button onClick={handleGuardarEdicionLote} className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase mt-4 shadow-md hover:bg-[#7a9d35] transition-colors">Actualizar Cambios</button>
                            <button onClick={() => setShowEditarLoteModal(false)} className="w-full text-sm font-black uppercase text-gray-500 mt-2 hover:underline">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal: Importar Pesajes Masivos */}
            {showImportarModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-[#11261F] uppercase">Carga Masiva</h3>
                            <button onClick={() => { setShowImportarModal(false); setArchivoPesajes(null); }} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
                        </div>

                        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                            Sube el archivo CSV o Excel de tu báscula electrónica. Asegúrate de tener las columnas: <span className="font-black text-[#11261F]">Identificación</span>, <span className="font-black text-[#11261F]">Peso</span> y <span className="font-black text-[#11261F]">Fecha</span>.
                        </p>

                        <div className="border-2 border-dashed border-[#E6F4D7] rounded-3xl p-10 text-center hover:bg-[#F4F6F4] transition-colors relative group">
                            <input
                                type="file"
                                accept=".csv"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleArchivoSeleccionado}
                                value=""
                            />
                            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📊</div>
                            <div>
                                <p className="text-[#11261F] font-black text-sm uppercase">Haz clic o arrastra tu archivo CSV aquí</p>
                                <p className="text-xs font-bold text-gray-400 mt-1">Soporta delimitadores por coma o punto y coma</p>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <button onClick={() => { setShowImportarModal(false); setArchivoPesajes(null); }} className="w-full text-xs font-black uppercase text-gray-400 hover:underline text-center">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Mapeo de Columnas CSV */}
            {showMapeoModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-[#11261F] uppercase">Confirmar Columnas</h3>
                            <button onClick={() => { setShowMapeoModal(false); setArchivoPesajes(null); setColumnasCSV([]); setDatosCSV([]); }} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
                        </div>

                        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                            Hemos leído tu archivo <span className="font-black text-[#8CB33E]">{archivoPesajes?.name}</span>. Por favor confirma qué columna corresponde a cada dato:
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Identificación (Obligatorio)</label>
                                <select
                                    className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-4 font-black text-sm outline-none mt-2"
                                    value={mapeo.id_excel}
                                    onChange={(e) => setMapeo({ ...mapeo, id_excel: e.target.value })}
                                >
                                    <option value="">-- Selecciona la columna --</option>
                                    {columnasCSV.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Peso en Kg (Obligatorio)</label>
                                <select
                                    className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-4 font-black text-sm outline-none mt-2"
                                    value={mapeo.peso}
                                    onChange={(e) => setMapeo({ ...mapeo, peso: e.target.value })}
                                >
                                    <option value="">-- Selecciona la columna --</option>
                                    {columnasCSV.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Fecha (Opcional)</label>
                                <select
                                    className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-4 font-black text-sm outline-none mt-2"
                                    value={mapeo.fecha}
                                    onChange={(e) => setMapeo({ ...mapeo, fecha: e.target.value })}
                                >
                                    <option value="">-- Usa la fecha actual si está vacío --</option>
                                    {columnasCSV.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="mt-8 space-y-3">
                                <button
                                    disabled={!mapeo.id_excel || !mapeo.peso || isUploading}
                                    onClick={handleImportarPesajesMasivos}
                                    className={`w-full py-5 rounded-2xl font-black uppercase shadow-md transition-all ${(!mapeo.id_excel || !mapeo.peso) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#11261F] text-white hover:bg-[#8CB33E]'}`}
                                >
                                    {isUploading ? 'Sincronizando...' : `Importar ${datosCSV.length} Pesajes`}
                                </button>
                                <button onClick={() => { setShowMapeoModal(false); setShowImportarModal(true); }} className="w-full text-xs font-black uppercase text-gray-400 hover:underline text-center">
                                    Cancelar y Volver
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ModalAjustarPrecio 
                isOpen={showModalPrecio}
                onClose={() => setShowModalPrecio(false)}
                precioActual={precioKilo}
                idFinca={String(fincaSel).split(':')[0]}
                onActualizado={(nuevoValor) => setPrecioKilo(nuevoValor)}
            />
        </div>
    );
}