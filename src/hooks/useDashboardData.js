import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import { notifySuccess, notifyError, notifyWarning } from '../utils/notify';

export default function useDashboardData() {
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
    const [nuevoLoteData, setNuevoLoteData] = useState({ nombre: '', tipo_manejo: 'General', gmd_meta: '' });

    const [showEditarLoteModal, setShowEditarLoteModal] = useState(false);
    const [loteEditData, setLoteEditData] = useState({ id_lote: '', nombre: '', tipo_manejo: '', gmd_meta: '' });

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

    // 🧠 5. El Cerebro (Analíticas)
    const fetchAnalytics = useCallback(async () => {
        if (!cleanId) return;
        try {
            const res = await api.get(`/api/v1/analytics/finca/${cleanId}/`);
            setAlertasInteligentes(res.data.alertas_activas || []);
        } catch (error) {
            console.error("Error cargando analíticas:", error);
        }
    }, [cleanId]);

    // 🌍 6. El "Big Bang" (Arranque Inicial)
    const loadAllData = useCallback(async () => {
        if (!cleanId) return;
        await Promise.all([loadAnimales(), loadInsumos(), loadLotes(), loadParametros(), fetchAnalytics()]);
    }, [cleanId, loadAnimales, loadInsumos, loadLotes, loadParametros, fetchAnalytics]);

    // ✨ Efecto Mágico: Calcula Stats Reactivamente
    useEffect(() => {
        if (!allAnimales || !insumos) return;

        const sumaPesos = allAnimales.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);
        setStats(prev => ({
            ...prev,
            total: allAnimales.length,
            promedioPeso: allAnimales.length > 0 ? (sumaPesos / allAnimales.length).toFixed(1) : 0,
            alertas: alertasInteligentes.length,
            valorLote: (sumaPesos * precioKilo).toLocaleString('es-CO')
        }));
    }, [allAnimales, insumos, precioKilo, alertasInteligentes]);

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
        try { await api.delete(`/animales/${id}`); loadAnimales(); } catch (err) { notifyError("Error al eliminar."); }
    };

    const handleEliminarInsumo = async (id, nombre) => {
        if (!window.confirm(`¿Seguro que deseas eliminar ${nombre}?`)) return;

        try {
            await api.delete(`/insumos/${id}`);
            notifySuccess("✅ Producto eliminado permanentemente.");
            loadInsumos();
        } catch (error) {
            // Capturamos el HTTP 400 de Sebas
            if (error.response?.status === 400) {
                notifyWarning("⚠️ Este producto tiene historial contable y no puede ser destruido. En breve habilitaremos la opción de 'Archivarlo'.");
                // Cuando Sebas termine el PUT /estado, lo llamaremos aquí automáticamente.
            } else {
                notifyError("❌ Error al eliminar el producto.");
            }
        }
    };

    const handleRegistrarCompra = async () => {
        // Validación básica de Empatía UX
        if (!compraData.selection_id || !compraData.cantidad_unidades || !compraData.peso_volumen_x_unidad || !compraData.precio_unidad_neto) {
            notifyWarning("⚠️ Por favor, completa todos los campos.");
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
            notifySuccess("✅ ¡Compra registrada en bodega exitosamente!");
            setShowCompraModal(false);
            setCompraData({ selection_id: '', cantidad_unidades: '', peso_volumen_x_unidad: '', unidad_medida: 'Kg', precio_unidad_neto: '', costo_flete_total: '' });
            loadInsumos(); // Refresca el inventario
            
        } catch (error) {
            console.error("Error al registrar la compra:", error);
            // Empatía Ganadera: No cerramos el modal si falla
            notifyError("❌ Hubo un error al guardar. Revisa la pestaña Network.");
        }
    };

    const handleRegistrarSalida = async (datosConsumo) => {
        if (!datosConsumo.id_insumo || !datosConsumo.cantidad || !datosConsumo.id_destino) {
            notifyWarning("⚠️ Por favor, completa los campos básicos.");
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
            notifySuccess(esMedicina 
                ? "✅ ¡Bodega descontada y Tratamiento registrado en el historial clínico!" 
                : "✅ ¡Consumo registrado y stock de bodega actualizado!");
            
            setShowConsumoModal(false);
            
            // Nuestros recargadores "Fórmula 1" en acción
            loadInsumos(); // Siempre recargamos la bodega porque el stock bajó
            if (esMedicina) loadAnimales(); // Recargamos animales para que salten las banderas rojas de "Retiro"

        } catch (error) {
            console.error("Error en el doble disparo:", error);
            notifyError("❌ Hubo un error de sincronización. Revisa la pestaña Network.");
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
            notifySuccess("✅ Producto creado en el Catálogo de la Finca.");
            setShowNuevoProductoModal(false);
            loadInsumos(); 
        } catch (error) {
            notifyError("❌ Error al crear el insumo.");
        }
    };

    const handleCrearLote = async () => {
        if (!nuevoLoteData.nombre) {
            notifyWarning("El nombre del lote es obligatorio.");
            return;
        }
        try {
            await api.post('/lotes/', {
                id_finca: Number(String(fincaSel).split(':')[0]),
                nombre: nuevoLoteData.nombre,
                tipo_manejo: nuevoLoteData.tipo_manejo,
                gmd_meta: nuevoLoteData.gmd_meta ? parseFloat(nuevoLoteData.gmd_meta) : null
            });
            setShowNuevoLoteModal(false);
            setNuevoLoteData({ nombre: '', tipo_manejo: 'General', gmd_meta: '' });
            loadLotes();
        } catch (err) {
            notifyError("Error al crear el lote.");
        }
    };

    const handleEliminarLote = async (loteId, cantidadAnimales) => {
        if (cantidadAnimales > 0) {
            notifyWarning("⚠️ ACCIÓN BLOQUEADA: No puedes eliminar un lote que tiene animales adentro. Primero debes moverlos.");
            return;
        }
        if (!window.confirm("¿Estás segura de que deseas eliminar este lote vacío?")) return;
        try {
            await api.delete(`/lotes/${loteId}`);
            loadLotes();
        } catch (err) {
            notifyError("Error al eliminar el lote.");
        }
    };

    const handleGuardarEdicionLote = async () => {
        if (!loteEditData.nombre) return;
        try {
            await api.put(`/lotes/${loteEditData.id_lote}`, {
                nombre: loteEditData.nombre,
                tipo_manejo: loteEditData.tipo_manejo,
                gmd_meta: loteEditData.gmd_meta ? parseFloat(loteEditData.gmd_meta) : null
            });
            setShowEditarLoteModal(false);
            loadLotes();
        } catch (err) {
            notifyError("Error al actualizar el lote.");
        }
    };

    const handleSuministro = async () => {
        if (!suministroData.id_insumo || !suministroData.cantidad_kg || !suministroData.id_lote) {
            notifyWarning("Por favor selecciona el Lote, el Producto y la Cantidad.");
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
        } catch (err) { notifyError("Stock insuficiente o error en el servidor."); }
    };

    const toggleLoteMasivo = (lote) => {
        setLotesSeleccionadosMasivo(prev => prev.includes(lote) ? prev.filter(l => l !== lote) : [...prev, lote]);
    };

    const handleGuardarEdicionInsumo = async () => {
        if (!insumoEditData.cantidad || !insumoEditData.precio) return;
        try {
            await api.put(`/insumos/${insumoEditData.id_insumo}`, {
                stock_actual_unidad: parseFloat(insumoEditData.cantidad),
                costo_promedio_unidad: parseFloat(insumoEditData.precio)
            });
            setShowEditarInsumoModal(false);
            loadInsumos();
        } catch (err) { notifyError("Error al actualizar el producto."); }
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
            notifyWarning("⚠️ Error de sesión: No podemos identificar tu usuario. Por favor, recarga la página o vuelve a iniciar sesión.");
            return;
        }

        if (!mapeo.id_excel || !mapeo.peso) {
            notifyWarning("Debes seleccionar al menos las columnas de Identificación y Peso.");
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
                notifyWarning("No se encontraron registros válidos para importar.");
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
                notifyWarning(
                    `¡Pesaje procesado!\n\n` +
                    `✅ Se actualizaron: ${procesados} animales.\n` +
                    `⚠️ Atención: Las siguientes chapetas no existen en la finca o ya fueron vendidas: ${no_encontrados.join(', ')}`
                );
            } else {
                notifySuccess(`¡Éxito total! Se actualizaron los pesos de ${procesados} animales.`);
            }

        } catch (error) {
            console.error("Error en la importación masiva:", error);
            notifyError("Hubo un error al intentar subir los pesajes. Revisa tu conexión.");
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
            notifyWarning("⚠️ Por favor selecciona un lote válido (no el Inventario General) para aplicar un tratamiento grupal.");
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
            
            notifySuccess(`✅ Éxito: ${response.data.animales_tratados} animales fueron tratados y su historial clínico ha sido actualizado.`);
            
            setShowTratamientoGrupalModal(false);
            loadAnimales();

        } catch (error) {
            console.error("Error en tratamiento masivo:", error);
            notifyError("❌ Hubo un error al registrar el tratamiento. Verifica tu conexión.");
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


    return {
        user, logout, navigate, location,
        fincas, setFincas, fincaSel, setFincaSel, allAnimales, setAllAnimales,
        lotesBackend, setLotesBackend, insumos, setInsumos, catalogoMaestro, setCatalogoMaestro,
        stats, setStats, alertasInteligentes, setAlertasInteligentes,
        historialNutricion, setHistorialNutricion, lotesSeleccionadosMasivo, setLotesSeleccionadosMasivo,
        precioKilo, setPrecioKilo, showModalPrecio, setShowModalPrecio,
        activeTab, setActiveTab, selectedLote, setSelectedLote,
        showCompraModal, setShowCompraModal, showSuministroModal, setShowSuministroModal,
        showConsumoModal, setShowConsumoModal, showTratamientoGrupalModal, setShowTratamientoGrupalModal,
        showNuevoLoteModal, setShowNuevoLoteModal, nuevoLoteData, setNuevoLoteData,
        showEditarLoteModal, setShowEditarLoteModal, loteEditData, setLoteEditData,
        showEditarInsumoModal, setShowEditarInsumoModal, insumoEditData, setInsumoEditData,
        compraData, setCompraData, suministroData, setSuministroData,
        showNuevoProductoModal, setShowNuevoProductoModal, nuevoProductoData, setNuevoProductoData,
        fincaActual, nombresExtraidos, nombresOficiales, lotesNombres,
        showImportarModal, setShowImportarModal, archivoPesajes, setArchivoPesajes,
        isUploading, setIsUploading, columnasCSV, setColumnasCSV, datosCSV, setDatosCSV,
        mapeo, setMapeo, showMapeoModal, setShowMapeoModal, cleanId,
        loadAnimales, loadInsumos, loadLotes, loadParametros, loadAllData,
        handleEliminarAnimal, handleEliminarInsumo, handleRegistrarCompra,
        handleRegistrarSalida, handleCrearInsumo, handleCrearLote, handleEliminarLote,
        handleGuardarEdicionLote, handleSuministro, toggleLoteMasivo,
        handleGuardarEdicionInsumo, handleArchivoSeleccionado, handleImportarPesajesMasivos,
        handleGuardarTratamientoGrupal, animalesSueltos, biomasaGeneral,
        loteGeneralVirtual, lotesReales, lotesEnriquecidos, fetchAnalytics
    };
}
