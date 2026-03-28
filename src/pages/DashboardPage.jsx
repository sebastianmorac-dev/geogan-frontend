import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';
import ModalAjustarPrecio from '../components/modals/ModalAjustarPrecio';
import ModalOverlay from '../components/modals/ModalOverlay';
import ModalConsumo from '../components/modals/ModalConsumo';
import ModalTratamientoGrupal from '../components/modals/ModalTratamientoGrupal';
import RoleGuard from '../components/auth/RoleGuard';

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
    const [showConsumoModal, setShowConsumoModal] = useState(false);
    const [showTratamientoGrupalModal, setShowTratamientoGrupalModal] = useState(false);

    const [showNuevoLoteModal, setShowNuevoLoteModal] = useState(false);
    const [nuevoLoteData, setNuevoLoteData] = useState({ nombre: '', tipo_manejo: 'General' });

    const [showEditarLoteModal, setShowEditarLoteModal] = useState(false);
    const [loteEditData, setLoteEditData] = useState({ id_lote: '', nombre: '', tipo_manejo: '' });

    // ESTADOS PARA EDITAR BODEGA
    const [showEditarInsumoModal, setShowEditarInsumoModal] = useState(false);
    const [insumoEditData, setInsumoEditData] = useState({ id_insumo: '', nombre: '', cantidad: '', precio: '' });

    const [compraData, setCompraData] = useState({
        selection_id: '',
        cantidad_unidades: '', // Ej: 10 (bultos)
        peso_volumen_x_unidad: '', // Ej: 40 (kg) o 500 (ml)
        unidad_medida: 'Kg', // UdM final: Kg, Gr, L, ml, Dosis
        precio_unidad_neto: '', // Ej: 85000
        costo_flete_total: '' // Opcional
    });
    const [suministroData, setSuministroData] = useState({ id_insumo: '', cantidad_kg: '', id_lote: '' });

    // ESTADOS PARA NUEVO PRODUCTO EN CATÁLOGO
    const [showNuevoProductoModal, setShowNuevoProductoModal] = useState(false);
    const [nuevoProductoData, setNuevoProductoData] = useState({ nombre: '', categoria: 'Nutrición' });

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

    // --- EL NUEVO MOTOR MODULAR ---
    const cleanId = fincaSel ? String(fincaSel).split(':')[0] : null;

    // 🐮 1. Carga exclusiva de Animales
    const loadAnimales = useCallback(async () => {
        if (!cleanId) return;
        try {
            const res = await api.get(`/animales/?finca_id=${cleanId}`);
            setAllAnimales(res.data || []);
        } catch (error) {
            console.error("Error cargando animales:", error);
        }
    }, [cleanId]);

    // 📦 2. Carga exclusiva de Bodega e Insumos
    const loadInsumos = useCallback(async () => {
        if (!cleanId) return;
        try {
            const [resBodega, resSugeridos] = await Promise.all([
                api.get(`/insumos/?finca_id=${cleanId}`),
                api.get(`/insumos/catalogo-sugerido?finca_id=${cleanId}`)
            ]);
            setInsumos(resBodega.data || []);
            setCatalogoMaestro(resSugeridos.data || []);
        } catch (error) {
            console.error("Error cargando insumos:", error);
        }
    }, [cleanId]);

    // 🏞️ 3. Carga exclusiva de Lotes
    const loadLotes = useCallback(async () => {
        if (!cleanId) return;
        try {
            const res = await api.get(`/lotes/?finca_id=${cleanId}`);
            setLotesBackend(res.data || []);
        } catch (error) {
            console.error("Error cargando lotes:", error);
        }
    }, [cleanId]);

    // 💰 4. Carga exclusiva de Parámetros de Finca (Precio)
    const loadParametros = useCallback(async () => {
        if (!cleanId) return;
        try {
            const res = await api.get(`/fincas/${cleanId}/parametros`);
            if (res.data && res.data.precio_base_venta_kg) {
                setPrecioKilo(res.data.precio_base_venta_kg);
            }
        } catch (err) {
            // 405 = el backend aún no tiene GET para parámetros (solo PUT).
            // Silenciamos para no romper el Promise.all del arranque.
            console.warn("⚠️ /parametros no disponible (GET). Usando precio por defecto.", err?.response?.status);
        }
    }, [cleanId]);

    // 🌍 5. El "Big Bang" (Arranque Inicial)
    const loadAllData = useCallback(async () => {
        if (!cleanId) return;
        await Promise.all([loadAnimales(), loadInsumos(), loadLotes(), loadParametros()]);
    }, [cleanId, loadAnimales, loadInsumos, loadLotes, loadParametros]);

    // ✨ Efecto Mágico: Calcula Métricas Reactivamente
    useEffect(() => {
        if (!allAnimales || !insumos) return;

        // 1. Alertas
        const hoy = new Date();
        let nuevasAlertas = [];

        const pendientes = allAnimales.filter(a => a.fecha_proximo_pesaje && new Date(a.fecha_proximo_pesaje) <= hoy);
        if (pendientes.length > 0) {
            nuevasAlertas.push({ tipo: 'pesaje', titulo: 'Pesajes Atrasados', desc: `Tienes ${pendientes.length} animales que necesitan ir a la báscula.`, accion: 'Ir a registrar pesos' });
        }

        const insumosBajos = insumos.filter(i => i.stock_actual_kg <= 50);
        if (insumosBajos.length > 0) {
            nuevasAlertas.push({ tipo: 'bodega', titulo: 'Comida Escasa', desc: `Hay ${insumosBajos.length} productos a punto de agotarse.`, accion: 'Revisar mi bodega' });
        }

        nuevasAlertas.push({ tipo: 'salud', titulo: 'Vacunación', desc: 'El Lote General requiere purga en los próximos 5 días.', accion: 'Preparar medicamentos' });

        setAlertasInteligentes(nuevasAlertas);

        // 2. Stats
        const sumaPesos = allAnimales.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);
        setStats(prev => ({
            ...prev,
            total: allAnimales.length,
            promedioPeso: allAnimales.length > 0 ? (sumaPesos / allAnimales.length).toFixed(1) : 0,
            alertas: nuevasAlertas.length,
            valorLote: (sumaPesos * precioKilo).toLocaleString('es-CO')
        }));
    }, [allAnimales, insumos, precioKilo]);

    useEffect(() => {
        api.get('/fincas/').then(res => setFincas(res.data || [])).catch(err => setFincas([]));
    }, []);

    useEffect(() => { loadAllData(); }, [loadAllData]);

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
        try { await api.delete(`/animales/${id}`); loadAnimales(); } catch (err) { alert("Error al eliminar."); }
    };

    const handleEliminarInsumo = async (id, nombre) => {
        if (!window.confirm(`¿Seguro que deseas eliminar ${nombre}?`)) return;

        try {
            await api.delete(`/insumos/${id}`);
            alert("✅ Producto eliminado permanentemente.");
            loadInsumos();
        } catch (error) {
            // Capturamos el HTTP 400 de Sebas
            if (error.response?.status === 400) {
                alert("⚠️ Este producto tiene historial contable y no puede ser destruido. En breve habilitaremos la opción de 'Archivarlo'.");
                // Cuando Sebas termine el PUT /estado, lo llamaremos aquí automáticamente.
            } else {
                alert("❌ Error al eliminar el producto.");
            }
        }
    };

    const handleRegistrarCompra = async () => {
        // Validación básica de Empatía UX
        if (!compraData.selection_id || !compraData.cantidad_unidades || !compraData.peso_volumen_x_unidad || !compraData.precio_unidad_neto) {
            alert("⚠️ Por favor, completa todos los campos.");
            return;
        }

        const cleanId = String(fincaSel).split(':')[0]; // ID de la finca seleccionada

        try {
            // 1. Separamos el Origen ('cat' o 'bod') y el ID numérico
            const [origen, idString] = compraData.selection_id.split('_');
            const idOriginal = parseInt(idString);
            
            let idInsumoBodega = idOriginal; // Por defecto, asumimos que ya está en bodega

            // 2. EL CAMINO A (Si viene del Catálogo Global)
            if (origen === 'cat') {
                // Buscamos el producto en nuestro estado local del catálogo para sacar su nombre y categoría
                const productoCatalogo = catalogoMaestro.find(c => c.id_catalogo === idOriginal);
                
                if (!productoCatalogo) throw new Error("Producto no encontrado en el catálogo maestro.");

                // Disparo 1: Creamos el "espacio" en la bodega de esta finca (Kardex en 0)
                const payloadCreacion = {
                    nombre_insumo: productoCatalogo.nombre,
                    tipo_insumo: productoCatalogo.categoria, // o productoCatalogo.tipo según como lo llames
                    unidad_empaque: `${compraData.peso_volumen_x_unidad} ${compraData.unidad_medida}`, // Ej: "500 ml" o "40 Kg"
                    id_finca: cleanId // El ID de la finca seleccionada actualmente
                };

                // Hacemos el POST (¡Asegúrate de que la ruta tenga el slash final si Sebas lo exige!)
                const resCreacion = await api.post('/insumos/', payloadCreacion);
                
                // Capturamos el nuevo ID local que nos devuelve Sebas
                idInsumoBodega = resCreacion.data.id_insumo; 
            }

            // 3. LA INYECCIÓN FINANCIERA (Para todos los casos)
            // Este es el payload exacto que auditamos con Sebas
            const payloadCompra = {
                id_insumo: idInsumoBodega, // Usamos el ID de la bodega (sea viejo o recién creado)
                cantidad_bultos: parseInt(compraData.cantidad_unidades),
                peso_bulto_kg: parseFloat(compraData.peso_volumen_x_unidad),
                precio_bulto_neto: parseFloat(compraData.precio_unidad_neto),
                costo_flete_total: parseFloat(compraData.costo_flete_total) || 0
            };

            // Disparo 2: Guardamos la factura y el stock
            await api.post('/insumos/compra/', payloadCompra);
            
            // 4. ÉXITO TOTAL: Limpiamos y recargamos
            alert("✅ ¡Compra registrada en bodega exitosamente!");
            setShowCompraModal(false);
            setCompraData({ selection_id: '', cantidad_unidades: '', peso_volumen_x_unidad: '', unidad_medida: 'Kg', precio_unidad_neto: '', costo_flete_total: '' });
            loadInsumos(); // Refresca el inventario
            
        } catch (error) {
            console.error("Error al registrar la compra:", error);
            // Empatía Ganadera: No cerramos el modal si falla
            alert("❌ Hubo un error al guardar. Revisa la pestaña Network.");
        }
    };

    const handleRegistrarSalida = async (datosConsumo) => {
        if (!datosConsumo.id_insumo || !datosConsumo.cantidad || !datosConsumo.id_destino) {
            alert("⚠️ Por favor, completa los campos básicos.");
            return;
        }

        try {
            // 1. INTELIGENCIA DE DATOS: Identificamos qué insumo es y si es medicina
            const insumoUsado = insumos.find(i => i.id_insumo === parseInt(datosConsumo.id_insumo));
            const nombreInsumo = insumoUsado?.nombre_insumo || "Tratamiento";
            
            // Sabemos que es medicina si el modal nos envió la vía de aplicación
            const esMedicina = datosConsumo.via_aplicacion && datosConsumo.via_aplicacion !== '';

            // 2. AUDITORÍA CONTABLE: ¿A qué lote le cobramos?
            let loteParaCobro = parseInt(datosConsumo.id_destino) || null;
            
            if (datosConsumo.destino_tipo === 'animal') {
                // Si es un animal individual, buscamos en qué lote vive para cobrarle a ese grupo
                const animalTratado = allAnimales.find(a => a.id_animal === parseInt(datosConsumo.id_destino));
                loteParaCobro = animalTratado?.id_lote || null; // Fallback de seguridad
            }

            // --- 🎯 DISPARO 1: BODEGA Y FINANZAS (Siempre se ejecuta) ---
            const payloadBodega = {
                id_insumo: parseInt(datosConsumo.id_insumo),
                cantidad_usada: parseFloat(datosConsumo.cantidad),
                id_lote: loteParaCobro
            };
            await api.post('/insumos/suministro-lote', payloadBodega);

            // --- 🩺 DISPARO 2: HISTORIAL CLÍNICO (Solo si es medicina) ---
            if (esMedicina) {
                const payloadClinico = {
                    medicamento: nombreInsumo, // Sebas pide el nombre en texto
                    dias_retiro: parseInt(datosConsumo.dias_retiro) || 0,
                    via_aplicacion: datosConsumo.via_aplicacion,
                    motivo: datosConsumo.motivo || "Tratamiento de rutina"
                };

                if (datosConsumo.destino_tipo === 'animal') {
                    // Expediente de un solo animal
                    await api.post(`/animales/${datosConsumo.id_destino}/salud`, payloadClinico);
                } else {
                    // Vacunación masiva de todo el lote
                    payloadClinico.id_lote = loteParaCobro;
                    await api.post('/animales/salud-lote', payloadClinico);
                }
            }

            // --- 🎉 VICTORIA Y RECARGA SELECTIVA ---
            alert(esMedicina 
                ? "✅ ¡Bodega descontada y Tratamiento registrado en el historial clínico!" 
                : "✅ ¡Consumo registrado y stock de bodega actualizado!");
            
            setShowConsumoModal(false);
            
            // Nuestros recargadores "Fórmula 1" en acción
            loadInsumos(); // Siempre recargamos la bodega porque el stock bajó
            if (esMedicina) loadAnimales(); // Recargamos animales para que salten las banderas rojas de "Retiro"

        } catch (error) {
            console.error("Error en el doble disparo:", error);
            alert("❌ Hubo un error de sincronización. Revisa la pestaña Network.");
        }
    };

    const handleCrearInsumo = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const cleanId = String(fincaSel).split(':')[0];
        
        // El payload exacto que pide Sebas hoy
        const payload = {
            id_finca: parseInt(cleanId), // Tu estado de finca seleccionada
            nombre_insumo: formData.get('nombre_insumo'),
            tipo_insumo: formData.get('tipo_insumo'),
            unidad_empaque: formData.get('unidad_medida_base') // Enviamos si es KG o LT
        };

        try {
            await api.post('/insumos/', payload);
            alert("✅ Producto creado en el Catálogo de la Finca.");
            setShowNuevoProductoModal(false);
            loadInsumos(); 
        } catch (error) {
            alert("❌ Error al crear el insumo.");
        }
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
            loadLotes();
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
            loadLotes();
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
            loadLotes();
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
            loadInsumos();
            loadLotes();
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
            loadInsumos();
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
            loadAnimales();

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

    // =========================================================================
    // 🩺 TRATAMIENTO GRUPAL (NUEVO ENDPOINT MASIVO)
    // =========================================================================
    const handleGuardarTratamientoGrupal = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Encontramos el lote actual para obtener su id_lote real
        const loteActual = lotesEnriquecidos.find(l => l.id_lote === selectedLote) || null;
        if (!loteActual || loteActual.id_lote === 'general') {
            alert("⚠️ Por favor selecciona un lote válido (no el Inventario General) para aplicar un tratamiento grupal.");
            return;
        }

        // Armamos el Payload estricto que pide el backend
        const payload = {
            id_lote: loteActual.id_lote,
            medicamento: formData.get('medicamento'),
            dosis_por_animal: formData.get('dosis'),
            dias_retiro: parseInt(formData.get('dias_retiro')) || 0,
            via_aplicacion: formData.get('via_aplicacion'),
            tipo_evento: formData.get('tipo_evento') || "Tratamiento Médico",
            observaciones: formData.get('observaciones') || "Aplicación grupal desde Dashboard"
        };

        try {
            const response = await api.post('/sanidad/tratamiento-grupal', payload);
            
            alert(`✅ Éxito: ${response.data.animales_tratados} animales fueron tratados y su historial clínico ha sido actualizado.`);
            
            setShowTratamientoGrupalModal(false);
            loadAnimales();

        } catch (error) {
            console.error("Error en tratamiento masivo:", error);
            alert("❌ Hubo un error al registrar el tratamiento. Verifica tu conexión.");
        }
    };

    // =========================================================================
    // 🧮 MOTOR DE INTELIGENCIA DE LOTES (BIOMASA Y PROMEDIOS)
    // =========================================================================

    // 1. EL LOTE VIRTUAL (INVENTARIO GENERAL): Animales que tienen id_lote en null o undefined
    const animalesSueltos = allAnimales.filter(a => !a.id_lote && a.estado === 'activo');
    const biomasaGeneral = animalesSueltos.reduce((suma, a) => suma + (parseFloat(a.peso) || 0), 0);

    const loteGeneralVirtual = {
        id_lote: 'general', // ID falso para que React no se queje con el 'key'
        nombre: 'INVENTARIO GENERAL',
        tipo_manejo: 'Recepción y Cuarentena',
        cabezas_reales: animalesSueltos.length,
        biomasa_total: biomasaGeneral,
        peso_promedio: animalesSueltos.length > 0 ? (biomasaGeneral / animalesSueltos.length) : 0
    };

    // 2. LOS LOTES FÍSICOS (Base de Datos): Mapeamos los que vienen del backend
    const lotesReales = (lotesBackend || []).map(lote => {
        const animalesEnPotrero = allAnimales.filter(a => a.id_lote === lote.id_lote && a.estado === 'activo');
        const biomasaTotal = animalesEnPotrero.reduce((suma, animal) => suma + (parseFloat(animal.peso) || 0), 0);
        
        return {
            ...lote,
            cabezas_reales: animalesEnPotrero.length,
            biomasa_total: biomasaTotal,
            peso_promedio: animalesEnPotrero.length > 0 ? (biomasaTotal / animalesEnPotrero.length) : 0
        };
    });

    // 3. LA FUSIÓN: Juntamos el virtual con los reales
    const lotesEnriquecidos = [loteGeneralVirtual, ...lotesReales];

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
                                        <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
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
                                        </RoleGuard>
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
                                                            <h3 className="text-2xl font-black text-[#11261F] uppercase tracking-tighter">{lote.nombre || 'LOTE GENERAL'}</h3>
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

                                                    {/* Acciones de Gestión */}
                                                    <div className="mt-6 flex gap-2">
                                                        <button onClick={() => setSelectedLote(lote.id_lote || 'general')} className="flex-1 bg-[#F4F6F4] text-[#11261F] py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#8CB33E] hover:text-white transition-all">
                                                            Ver Animales
                                                        </button>
                                                        <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                                                            <button onClick={() => {
                                                                setLoteEditData({ id_lote: lote.id_lote, nombre: lote.nombre, tipo_manejo: lote.tipo_manejo || 'General' });
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
                                                                    return a.id_lote === selectedLote || a.lote === selectedLote;
                                                                }).length}
                                                            </p>
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
                                                {allAnimales.filter(a => {
                                                    if (selectedLote === 'general' || selectedLote === 'INVENTARIO GENERAL') return !a.id_lote;
                                                    return a.id_lote === selectedLote || a.lote === selectedLote;
                                                }).map((a) => (
                                                    <tr key={a.id_animal} onClick={() => navigate(`/animales/detalle/${a.id_animal}`, { state: { fromFinca: fincaSel, fromTab: 'lotes', fromLote: selectedLote } })} className="cursor-pointer hover:bg-[#F4F6F4]/50 transition-all text-[#11261F] border-b border-gray-100">
                                                        <td className="px-12 py-6 font-black uppercase text-lg">{a.codigo_identificacion}</td>
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
                                        <button onClick={() => setShowTratamientoGrupalModal(true)} className="bg-[#8CB33E] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-[#7a9d35]">+ Registrar Tratamiento</button>
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
                                <div className="flex gap-4">
                                    <button onClick={() => setShowNuevoProductoModal(true)} className="bg-white border-2 border-[#E6F4D7] text-[#11261F] px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-sm hover:border-[#8CB33E] transition-colors">+ Crear Producto</button>
                                    <button onClick={() => setShowCompraModal(true)} className="bg-[#11261F] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-lg">+ Registrar Nueva Compra</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {insumos.map((ins) => {
                                    // Adaptamos a las unidades agnósticas (Backend actualizado)
                                    const stockActual = parseFloat(ins.stock_actual_unidad ?? ins.stock_actual_kg ?? 0);
                                    const puntoCritico = parseFloat(ins.punto_critico_unidad ?? 50); // Fallback si no existe en la BD antigua
                                    const esCritico = stockActual <= puntoCritico;
                                    const costoPromedio = ins.costo_promedio_unidad || ins.costo_promedio_kg || 0;
                                    const unidad = ins.unidad_empaque || 'UN';

                                    return (
                                        <div key={ins.id_insumo} className={`p-6 rounded-[32px] border-2 flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${esCritico ? 'border-red-500 bg-red-50/50' : 'border-[#E6F4D7] bg-white'}`}>
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="font-black text-[#11261F] text-lg uppercase leading-tight pr-4">{ins.nombre_insumo}</h4>
                                                    {esCritico && <span className="text-[9px] bg-red-500 text-white px-3 py-1.5 rounded-xl animate-pulse font-black uppercase tracking-widest text-center whitespace-nowrap shadow-sm">CRÍTICO</span>}
                                                </div>
                                                
                                                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Stock Disponible</p>
                                                <p className={`text-4xl font-black tabular-nums tracking-tighter ${esCritico ? 'text-red-600' : 'text-[#8CB33E]'}`}>
                                                    {stockActual} <span className="text-sm font-bold text-gray-500 tracking-normal ml-1">{unidad}</span>
                                                </p>

                                                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mt-6 mb-1">Costo Promedio (CPP)</p>
                                                <p className="text-xl font-black text-[#11261F]">$ {Number(costoPromedio).toLocaleString('es-CO')} <span className="text-[10px] text-gray-400">/{unidad}</span></p>
                                            </div>

                                            <div className="flex justify-between items-center mt-8 pt-6 border-t border-dashed border-black/5">
                                                <button
                                                    onClick={() => {
                                                        setInsumoEditData({ id_insumo: ins.id_insumo, nombre: ins.nombre_insumo, cantidad: stockActual, precio: costoPromedio });
                                                        setShowEditarInsumoModal(true);
                                                    }}
                                                    className="text-[10px] font-black uppercase text-gray-500 hover:text-[#8CB33E] tracking-widest transition-colors flex gap-2 items-center"
                                                >
                                                    ⚙️ Editar
                                                </button>
                                                <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                                                    <button
                                                        onClick={() => handleEliminarInsumo(ins.id_insumo, ins.nombre_insumo)}
                                                        className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 tracking-widest transition-colors flex gap-2 items-center"
                                                    >
                                                        🗑️ Eliminar
                                                    </button>
                                                </RoleGuard>
                                            </div>
                                        </div>
                                    );
                                })}
                                {insumos.length === 0 && (
                                    <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-[#E6F4D7]">
                                        <p className="text-gray-500 font-bold text-lg">Tu bodega está vacía.</p>
                                        <p className="text-sm text-gray-400 mt-2">Registra compras para alimentar tu inventario inteligente.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            )}

            {/* --- MODALES CONSERVADOS --- */}
            {/* ========================================================================= */}
            {/* 💰 MODAL DE COMPRAS (ABASTECIMIENTO DE BODEGA)                            */}
            {/* ========================================================================= */}
            <ModalOverlay isOpen={showCompraModal} onClose={() => setShowCompraModal(false)} title="REGISTRAR NUEVA COMPRA" maxWidth="md">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    
                    // Payload estricto según el contrato de Sebas
                    const payload = {
                        id_insumo: parseInt(formData.get('id_insumo')),
                        cantidad_bultos: parseFloat(formData.get('cantidad_bultos')),
                        peso_bulto_kg: parseFloat(formData.get('peso_bulto_kg')),
                        precio_bulto_neto: parseFloat(formData.get('precio_bulto_neto')),
                        costo_flete_total: parseFloat(formData.get('costo_flete_total')) || 0,
                        // La fecha de compra es opcional, dejaremos que el backend asigne 'hoy'
                    };

                    try {
                        await api.post('/insumos/compra', payload);
                        alert("✅ Compra registrada. Stock y Costo Promedio (CPP) actualizados automáticamente.");
                        setShowCompraModal(false);
                        loadInsumos(); // Recargador selectivo Fórmula 1
                    } catch (error) {
                        console.error("Error en la compra:", error);
                        alert("❌ Error al registrar compra. Revisa la pestaña Network.");
                    }
                }} className="space-y-6">

                    {/* 1. SELECCIÓN AI-READY (Catálogo Cerrado) */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Producto a Ingresar</label>
                        <select name="id_insumo" required className="w-full bg-[#F4F6F4] rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                            <option value="">Seleccione del inventario...</option>
                            {/* Asumo que 'insumos' es tu estado que carga la bodega actual */}
                            {insumos.map(insumo => (
                                <option key={insumo.id_insumo} value={insumo.id_insumo}>
                                    {insumo.nombre_insumo} (Stock actual: {insumo.cantidad_kg || insumo.stock_actual_kg} kg)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 2. REALIDAD GANADERA (Cantidades Físicas) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Cant. de Empaques</label>
                            <input type="number" step="0.01" name="cantidad_bultos" required placeholder="Ej: 10" 
                                className="w-full bg-[#F4F6F4] rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Peso x Empaque (KG)</label>
                            <input type="number" step="0.01" name="peso_bulto_kg" required placeholder="Ej: 40" 
                                className="w-full bg-[#F4F6F4] rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" />
                        </div>
                    </div>

                    {/* 3. FINANZAS Y FLETE (El Costo Real) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#8CB33E] uppercase ml-2">Precio x Empaque ($)</label>
                            <input type="number" step="0.01" name="precio_bulto_neto" required placeholder="Ej: 85000" 
                                className="w-full bg-green-50 text-green-900 rounded-2xl p-4 text-sm font-black outline-none border-2 border-green-200 focus:border-[#8CB33E]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Flete Total ($)</label>
                            <input type="number" step="0.01" name="costo_flete_total" placeholder="Ej: 15000 (Opcional)" 
                                className="w-full bg-[#F4F6F4] rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" />
                        </div>
                    </div>

                    {/* SEGURIDAD RBAC EN LA ACCIÓN DE COMPRA */}
                    <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin', 'encargado']}>
                        <button type="submit" className="w-full bg-[#11261F] text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#8CB33E] transition-all">
                            Ingresar a Bodega
                        </button>
                    </RoleGuard>
                </form>
            </ModalOverlay>

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

            {/* Modal: Nuevo Insumo Global */}
            <ModalOverlay isOpen={showNuevoProductoModal} onClose={() => setShowNuevoProductoModal(false)} title="NUEVO PRODUCTO PARA TU FINCA" maxWidth="sm">
                <form onSubmit={handleCrearInsumo} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nombre Comercial</label>
                        <input type="text" name="nombre_insumo" required placeholder="EJ: PURGANTE XYZ, SAL 12%..."
                            className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2 uppercase" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Tipo de Insumo</label>
                        <select name="tipo_insumo" required className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2">
                            <option value="">Seleccione...</option>
                            <option value="Nutrición">Nutrición (Sales, Concentrados)</option>
                            <option value="Sanidad">Sanidad (Medicamentos, Vacunas)</option>
                            <option value="Agroquímico">Agroquímico (Fertilizantes, Venenos)</option>
                            <option value="Herramienta">Materiales / Herramientas</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Unidad Base Comercial</label>
                        <select name="unidad_medida_base" required className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-5 font-black outline-none mt-2">
                            <option value="">Seleccione...</option>
                            <option value="KG">Kilogramos (KG)</option>
                            <option value="LT">Litros (LT)</option>
                            <option value="UN">Unidades / Dosis (UN)</option>
                        </select>
                    </div>
                    
                    <button type="submit" className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase shadow-lg hover:bg-[#11261F] transition-all mt-4">Guardar Nuevo Producto</button>
                    <button type="button" onClick={() => setShowNuevoProductoModal(false)} className="w-full text-xs font-black uppercase text-gray-400 mt-2">Cancelar</button>
                </form>
            </ModalOverlay>

            {/* Modal: Consumo / Salida de Bodega (Nutrición + Sanidad) */}
            <ModalConsumo 
                isOpen={showConsumoModal} 
                onClose={() => setShowConsumoModal(false)} 
                insumosBodega={insumos} 
                lotes={lotesEnriquecidos}
                onGuardar={handleRegistrarSalida} 
                preselectedLote={selectedLote}
            />

            {/* Modal: Tratamiento Grupal (Sanidad Masiva) */}
            <ModalTratamientoGrupal
                isOpen={showTratamientoGrupalModal}
                onClose={() => setShowTratamientoGrupalModal(false)}
                loteActual={lotesEnriquecidos.find(l => l.id_lote === selectedLote) || { nombre: 'Selecciona un Lote', cabezas_reales: 0 }}
                onGuardar={handleGuardarTratamientoGrupal}
            />
        </div>
    );
}