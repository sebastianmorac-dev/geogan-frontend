import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';
import RoleGuard from '../components/auth/RoleGuard';
import ModalOverlay from '../components/modals/ModalOverlay';

export default function HojaDeVidaAnimal() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    const [loading, setLoading] = useState(true);
    const [historial, setHistorial] = useState([]);
    const [historialSanitario, setHistorialSanitario] = useState([]);
    const [animalData, setAnimalData] = useState(null);
    const [lotes, setLotes] = useState([]);
    const [loteAnimales, setLoteAnimales] = useState([]); // Animales del mismo lote (para GMD promedio)
    const [activeTab, setActiveTab] = useState('pesajes');
    const [showSanitaryModal, setShowSanitaryModal] = useState(false);
    const [showPesoModal, setShowPesoModal] = useState(false);
    const [editandoPesoId, setEditandoPesoId] = useState(null);

    const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm();
    const sanitaryForm = useForm();
    
    const [showTrazabilidadModal, setShowTrazabilidadModal] = useState(false);
    const trazabilidadForm = useForm();

    const [showSalidaModal, setShowSalidaModal] = useState(false);
    const salidaForm = useForm();

    const fromFinca = location.state?.fromFinca;
    const fromTab = location.state?.fromTab || 'lotes';
    const fromLote = location.state?.fromLote;
    const nombreFinca = location.state?.nombreFinca || 'Finca Activa';

    const handleVolver = () => {
        navigate('/dashboard', { state: { fromFinca, fromTab, fromLote } });
    };

    // =========================================================================
    // CARGA PARALELA (Promise.all — Mata el "Efecto Eco")
    // =========================================================================
    const fetchDatos = async () => {
        setLoading(true);
        try {
            const [resAnimal, resPesos, resSalud] = await Promise.all([
                api.get(`/animales/${id}`),
                api.get(`/animales/${id}/historial-pesos`),
                api.get(`/animales/${id}/salud`).catch(() => ({ data: [] }))
            ]);

            setAnimalData(resAnimal.data);
            const dataOrdenada = resPesos.data ? [...resPesos.data].sort((a, b) => new Date(a.fecha_pesaje) - new Date(b.fecha_pesaje)) : [];
            setHistorial(dataOrdenada);
            setHistorialSanitario(resSalud.data || []);

            reset({ peso: resAnimal.data.peso, observaciones: '' });

            // Stop blocking the UI
            setLoading(false);

            // Traer los lotes disponibles de la finca del animal (asincrono no bloqueante)
            if (resAnimal.data.id_finca) {
                try {
                    const resLotes = await api.get(`/lotes/finca/${resAnimal.data.id_finca}`);
                    setLotes(resLotes.data || []);
                } catch (e) { console.error("Error trayendo lotes:", e); }

                // 🧬 MOTOR DE RENTABILIDAD: Traer animales del mismo lote para comparar GMD
                if (resAnimal.data.id_lote) {
                    try {
                        const resAnimalesLote = await api.get(`/animales/?finca_id=${resAnimal.data.id_finca}`);
                        const companeros = (resAnimalesLote.data || []).filter(
                            a => a.id_lote === resAnimal.data.id_lote && a.estado === 'activo'
                        );
                        setLoteAnimales(companeros);
                    } catch (e) { console.warn("No se pudo cargar animales del lote", e); }
                }
            }

        } catch (err) {
            console.error(err);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const onTrazabilidadSubmit = async (data) => {
        try {
            const payload = {
                ...data,
                id_madre: data.id_madre ? Number(data.id_madre) : null
            };
            await api.put(`/animales/${id}`, payload);
            setShowTrazabilidadModal(false);
            fetchDatos();
        } catch (error) {
            console.error("Error al guardar trazabilidad:", error);
            alert("Error al guardar trazabilidad.");
        }
    };

    useEffect(() => {
        if (animalData) {
            trazabilidadForm.reset({
                registro_sinigan: animalData.registro_sinigan || '',
                guia_movilizacion_ingreso: animalData.guia_movilizacion_ingreso || '',
                proposito_productivo: animalData.proposito_productivo || '',
                padre_genetica: animalData.padre_genetica || '',
                id_madre: animalData.id_madre || ''
            });
        }
    }, [animalData, trazabilidadForm]);

    useEffect(() => { if (id) fetchDatos(); }, [id]);

    // =========================================================================
    // 🧮 CEREBRO FINANCIERO: Ganancia Media Diaria (GMD)
    // =========================================================================
    const calcularMetricas = (historialPesos, pesoMaestro) => {
        // Si no hay historial suficiente para trazar una curva (menos de 2 pesos)
        if (!historialPesos || historialPesos.length < 2) {
            // Tomamos el único peso del historial, o si está vacío, el peso maestro de la base
            const pesoActual = historialPesos?.length === 1 
                ? historialPesos[0].peso_kg 
                : (pesoMaestro || 0);
                
            return { 
                gmd: "0.000", 
                proyeccion30: Math.round(pesoActual), 
                pesoActual: pesoActual 
            };
        }

        // Ordenados del más reciente al más antiguo (Cero Suposiciones)
        const pesosOrdenados = [...historialPesos].sort((a, b) =>
            new Date(b.fecha_pesaje) - new Date(a.fecha_pesaje)
        );

        const pesoNuevo = pesosOrdenados[0];
        const pesoAnterior = pesosOrdenados[1];
        const kilosGanados = pesoNuevo.peso_kg - pesoAnterior.peso_kg;
        const diasTranscurridos = Math.max(1, (new Date(pesoNuevo.fecha_pesaje) - new Date(pesoAnterior.fecha_pesaje)) / (1000 * 60 * 60 * 24));

        const gmdCalc = kilosGanados / diasTranscurridos;
        const proyeccion = pesoNuevo.peso_kg + (gmdCalc * 30);

        return {
            gmd: gmdCalc.toFixed(3),
            proyeccion30: Math.round(proyeccion),
            pesoActual: pesoNuevo.peso_kg
        };
    };

    // Llamamos a la función inyectándole el historial Y el peso base del animal
    const metricas = calcularMetricas(historial, animalData?.peso);
    const gmdNum = parseFloat(metricas.gmd);
    const sugerenciaVenta = metricas.proyeccion30 >= 450;

    const registroActivo = historialSanitario?.length > 0 ? historialSanitario.find(s => {
        const fechaFin = new Date(s.fecha_aplicacion);
        fechaFin.setDate(fechaFin.getDate() + (s.dias_retiro || 0));
        return new Date() < fechaFin;
    }) : null;

    // =========================================================================
    // 🔒 MOTOR 1: CANDADO VISUAL (Motor Sanitario)
    // =========================================================================
    const estaEnRetiro = animalData ? (
        animalData.apto_para_consumo === false || registroActivo != null
    ) : false;

    // =========================================================================
    // 🐌 MOTOR 2: DETECTOR DE ZÁNGANOS (Motor de Rentabilidad)
    // =========================================================================
    // Calculamos el GMD promedio del lote con los compañeros
    const calcularGmdPromLote = () => {
        if (!loteAnimales || loteAnimales.length < 2) return 0.6; // Fallback estándar
        // Cada animal tiene peso actual y peso de ingreso; aproximamos GMD con peso / (días desde ingreso)
        // Pero como no tenemos historial de cada animal, usamos el peso promedio como referencia
        const pesosLote = loteAnimales.map(a => parseFloat(a.peso) || 0).filter(p => p > 0);
        if (pesosLote.length === 0) return 0.6;
        return pesosLote.reduce((sum, p) => sum + p, 0) / pesosLote.length / 500; // Aprox GMD normalizado
    };
    const gmdPromedioLote = animalData?.gmd_promedio_lote || calcularGmdPromLote();
    const rendimientoBajo = gmdNum > 0 && gmdNum < (gmdPromedioLote * 0.8);

    // =========================================================================
    // 🔮 MOTOR 3: EL ORÁCULO (Motor Financiero) — ARMADURA MATEMÁTICA
    // =========================================================================
    const pesoIdealVenta = 450;
    const pesoFaltante = pesoIdealVenta - metricas.pesoActual;
    let estadoProyeccion = 'calculando'; // 'listo', 'activo', 'estancado', 'inviable'
    let diasParaVenta = 0;
    let fechaEstimadaVenta = null;

    if (metricas.pesoActual >= pesoIdealVenta) {
        estadoProyeccion = 'listo'; // 🏆 ¡Ya es dinero en efectivo!
    } else if (gmdNum > 0) {
        diasParaVenta = Math.ceil(pesoFaltante / gmdNum);

        // Filtro de Horizonte: Si faltan más de 730 días (2 años), la estadística pierde valor
        if (diasParaVenta > 730) {
            estadoProyeccion = 'inviable';
        } else {
            estadoProyeccion = 'activo';
            fechaEstimadaVenta = new Date();
            fechaEstimadaVenta.setDate(fechaEstimadaVenta.getDate() + diasParaVenta);
        }
    } else {
        estadoProyeccion = 'estancado'; // GMD es 0 o negativa (perdió peso)
    }

    const chartData = historial.map(h => ({
        fecha: new Date(h.fecha_pesaje).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        peso_real: h.peso_kg,
        peso_proyectado: null
    }));

    if (historial.length > 0) {
        chartData[chartData.length - 1].peso_proyectado = chartData[chartData.length - 1].peso_real;
        chartData.push({
            fecha: '+ 30 Días',
            peso_real: null,
            peso_proyectado: metricas.proyeccion30
        });
    }

    // =========================================================================
    // CONTROLADORES DE CAMPO (Lectura + Pesaje + Sanidad)
    // =========================================================================
    const onPesoSubmit = async (data) => {
        try {
            const payload = {
                peso_kg: parseFloat(data.peso),
                fecha_pesaje: new Date().toISOString().split('T')[0],
                observaciones: data.observaciones,
                creado_por: user?.id_usuario
            };

            if (editandoPesoId) {
                await api.put(`/animales/pesaje/${editandoPesoId}`, payload);
            } else {
                await api.post(`/animales/${id}/pesaje`, { ...payload, id_animal: parseInt(id) });
            }

            setShowPesoModal(false);
            setEditandoPesoId(null);
            fetchDatos();
        } catch (err) { alert("Error al guardar el pesaje"); }
    };

    const onSanitarySubmit = async (data) => {
        try {
            await api.post(`/animales/${id}/salud`, {
                ...data,
                id_animal: parseInt(id),
                fecha_aplicacion: new Date().toISOString().split('T')[0]
            });
            setShowSanitaryModal(false);
            fetchDatos();
        } catch (err) { alert("Error al registrar sanidad"); }
    };

    const eliminarPeso = async (id_peso) => {
        if (!window.confirm("Alerta de Auditoría: ¿Estás seguro de eliminar este registro de campo?")) return;
        try {
            await api.delete(`/animales/pesaje/${id_peso}`);
            fetchDatos();
        } catch (error) { alert("El backend requiere habilitar la ruta DELETE para pesajes."); }
    };

    const editarPeso = (registro) => {
        setValue('peso', registro.peso_kg);
        setValue('observaciones', registro.observaciones || '');
        setEditandoPesoId(registro.id_peso);
        setShowPesoModal(true);
    };

    const onSalidaSubmit = async (data) => {
        if (!window.confirm(`¿Estás seguro de registrar la salida de este animal por motivo: ${data.estado}?`)) return;
        try {
            await api.patch(`/animales/${id}/dar-baja`, {
                estado: data.estado,
                fecha_salida: new Date().toISOString().split('T')[0],
                precio_venta: data.precio_venta ? parseFloat(data.precio_venta) : null,
                peso_salida: animalData?.peso ? parseFloat(animalData.peso) : null,
                detalle_salida: data.detalle_salida
            });
            setShowSalidaModal(false);
            fetchDatos();
        } catch (err) { alert(err.response?.data?.detail || "Error al registrar la salida"); }
    };



    if (loading) return (
        <div className="min-h-screen bg-[#F4F6F4] font-sans antialiased">
            <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-[#E6F4D7] h-24 px-12 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <img src={logo} alt="GeoGan" style={{ height: '140px', margin: '-30px 0' }} />
                    <div className="h-8 w-px bg-[#E6F4D7]"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
            </header>
            <main className="mt-32 px-12 pb-20 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-10 animate-pulse">
                {/* Esqueleto Sidebar */}
                <aside className="w-full lg:w-[450px] bg-white rounded-[40px] p-12 shadow-sm border border-[#E6F4D7] space-y-6">
                    <div className="h-6 bg-[#E6F4D7] rounded-lg w-1/3"></div>
                    <div className="h-12 bg-gray-200 rounded-xl w-2/3"></div>
                    <div className="space-y-3">
                        <div className="h-16 bg-[#F4F6F4] rounded-2xl"></div>
                        <div className="h-16 bg-[#F4F6F4] rounded-2xl"></div>
                        <div className="h-16 bg-[#F4F6F4] rounded-2xl"></div>
                    </div>
                    <div className="h-14 bg-[#8CB33E]/30 rounded-2xl mt-6"></div>
                </aside>
                {/* Esqueleto Contenido Principal */}
                <div className="flex-1 flex flex-col gap-10">
                    <div className="bg-white rounded-[40px] p-12 border border-[#E6F4D7] shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-5 bg-gray-200 rounded-lg w-1/3"></div>
                            <div className="flex gap-4">
                                <div className="h-20 w-40 bg-red-50 rounded-3xl"></div>
                                <div className="h-20 w-40 bg-[#11261F]/20 rounded-3xl"></div>
                                <div className="h-20 w-40 bg-[#E6F4D7] rounded-3xl"></div>
                            </div>
                        </div>
                        <div className="h-[300px] bg-[#F4F6F4] rounded-3xl"></div>
                    </div>
                    <div className="bg-white rounded-[40px] p-12 border border-[#E6F4D7] shadow-sm">
                        <div className="h-14 bg-[#F9FBFA] rounded-[20px] mb-8"></div>
                        <div className="space-y-4">
                            <div className="h-12 bg-[#F4F6F4] rounded-xl"></div>
                            <div className="h-12 bg-[#F4F6F4] rounded-xl"></div>
                            <div className="h-12 bg-[#F4F6F4] rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F4F6F4] font-sans text-[#11261F] antialiased">

            <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-[#E6F4D7] h-24 px-12 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <img src={logo} alt="GeoGan" style={{ height: '140px', margin: '-30px 0' }} />
                    <div className="h-8 w-px bg-[#E6F4D7]"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#8CB33E]">{nombreFinca}</p>
                </div>
                <button onClick={handleVolver} className="w-12 h-12 rounded-2xl bg-[#F9FBFA] border-2 border-[#E6F4D7] flex items-center justify-center hover:bg-red-50 transition-all text-xl">✕</button>
            </header>

            <main className="mt-32 px-12 pb-20 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-10">

                <aside className="w-full lg:w-[450px] bg-white rounded-[40px] p-12 shadow-sm border border-[#E6F4D7] lg:sticky lg:top-32 h-fit">
                    {/* 1. ENCABEZADO: ID y Sexo */}
                    <div className="mb-10 flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8CB33E] mb-2">Hoja de Vida</p>
                            <h2 className="text-5xl font-black tracking-tighter uppercase">{animalData?.codigo_identificacion || '---'}</h2>
                        </div>
                        <div className="bg-[#F9FBFA] border border-[#E6F4D7] px-4 py-2 rounded-2xl">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Sexo</p>
                            <p className="font-black text-[#11261F] text-sm text-center">{animalData?.sexo === 'M' ? '♂ MACHO' : '♀ HEMBRA'}</p>
                        </div>
                    </div>

                    {/* 🔒 CANDADO VISUAL: Etiqueta de Retiro */}
                    {estaEnRetiro && (
                        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                            <span className="text-2xl">🔒</span>
                            <div>
                                <p className="text-xs font-black text-red-600 uppercase tracking-widest">⚠️ EN RETIRO — NO VENDER</p>
                                <p className="text-[10px] font-bold text-red-500 mt-1">Este animal tiene tratamiento activo o no es apto para consumo humano.</p>
                            </div>
                        </div>
                    )}

                    {/* 2. DATOS BÁSICOS (Solo Lectura) */}
                    <div className="space-y-3 mb-10">
                        <div className="bg-[#F9FBFA] border border-[#E6F4D7] p-5 rounded-2xl flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lote Actual</span>
                            <span className="font-black text-[#11261F] text-sm uppercase">{lotes.find(l => l.id_lote === animalData?.id_lote)?.nombre || 'GENERAL'}</span>
                        </div>
                        <div className="bg-white border border-[#E6F4D7] p-5 rounded-2xl flex justify-between items-center shadow-sm">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Raza</span>
                            <span className="font-black text-[#11261F] text-sm uppercase">{animalData?.raza || 'Brahman'}</span>
                        </div>
                        <div className="bg-white border border-[#E6F4D7] p-5 rounded-2xl flex justify-between items-center shadow-sm">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</span>
                            <span className="font-black text-[#11261F] text-sm uppercase">{animalData?.estado || 'activo'}</span>
                        </div>
                        {/* Estado de Consumo */}
                        <div className={`p-5 rounded-2xl flex justify-between items-center shadow-sm border ${estaEnRetiro ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Apto para Venta</span>
                            <span className={`font-black text-sm uppercase ${estaEnRetiro ? 'text-red-600' : 'text-green-600'}`}>
                                {estaEnRetiro ? '❌ NO APTO' : '✅ HABILITADO'}
                            </span>
                        </div>
                    </div>

                    {/* NUEVA TARJETA: Trazabilidad y Genética */}
                    <div className="bg-white border border-[#E6F4D7] p-6 rounded-3xl shadow-sm mb-10">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-black uppercase text-[#11261F] tracking-widest">Trazabilidad y Genética</h4>
                            <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                                <button onClick={() => setShowTrazabilidadModal(true)} className="text-[#8CB33E] hover:text-[#11261F] text-[10px] font-black uppercase tracking-widest transition-colors">Editar</button>
                            </RoleGuard>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-dashed border-[#F4F6F4]">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reg. SINIGÁN</span>
                                <span className="font-black text-[#11261F] text-xs uppercase">{animalData?.registro_sinigan || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-dashed border-[#F4F6F4]">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Guía Movilización</span>
                                <span className="font-black text-[#11261F] text-xs uppercase">{animalData?.guia_movilizacion_ingreso || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-dashed border-[#F4F6F4]">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Propósito</span>
                                <span className="font-black text-[#11261F] text-xs uppercase">{animalData?.proposito_productivo || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-dashed border-[#F4F6F4]">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Padre</span>
                                <span className="font-black text-[#11261F] text-xs uppercase">{animalData?.padre_genetica || 'Desconocido'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Madre (Chapeta)</span>
                                <span className="font-black text-[#11261F] text-xs uppercase">{animalData?.id_madre || 'Desconocida'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. BOTONES DE ACCIÓN */}
                    <div className="space-y-4 mt-8 pt-8 border-t border-dashed border-[#E6F4D7]">
                        {/* Cualquier operario puede pesar al animal */}
                        <button
                            onClick={() => setShowPesoModal(true)}
                            className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#11261F] transition-all shadow-lg">
                            + Registrar Peso / Novedad
                        </button>

                        {/* RBAC: Solo Admins y Propietarios pueden acceder al formulario de edición y bajas */}
                        <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                            <button
                                onClick={() => navigate(`/animales/editar/${id}`, { state: { fromFinca, fromTab, fromLote, nombreFinca } })}
                                className="w-full bg-white border-2 border-[#E6F4D7] text-gray-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:border-[#8CB33E] hover:text-[#11261F] transition-all">
                                ⚙️ Editar Perfil Base
                            </button>
                            <button
                                onClick={() => setShowSalidaModal(true)}
                                className="w-full bg-white border-2 border-red-100 text-red-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:border-red-500 hover:text-white transition-all">
                                🚪 Registrar Salida / Baja
                            </button>
                        </RoleGuard>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col gap-10">

                    {/* 🐌 ALERTA DE RENTABILIDAD (Motor 2) */}
                    {rendimientoBajo && (
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-[32px] p-8 flex items-start gap-6 shadow-sm">
                            <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🐌</div>
                            <div>
                                <p className="text-sm font-black text-yellow-700 uppercase tracking-widest mb-2">⚠️ Alerta de Rentabilidad</p>
                                <p className="text-sm text-yellow-800 font-bold leading-relaxed">
                                    Este animal está ganando peso un <strong>20% por debajo</strong> del promedio de su lote 
                                    (GMD Individual: <strong>{metricas.gmd} KG/día</strong> vs. Promedio Lote: <strong>{gmdPromedioLote.toFixed(3)} KG/día</strong>).
                                </p>
                                <p className="text-xs font-black text-yellow-600 mt-3 uppercase tracking-widest">Sugerencia: Revisión clínica o evaluar descarte.</p>
                            </div>
                        </div>
                    )}

                    {/* 🔮 EL ORÁCULO: Proyección Financiera (Motor 3 — ARMADURA MATEMÁTICA) */}

                    {/* 🏆 ESTADO: LISTO — Ya alcanzó el peso ideal */}
                    {estadoProyeccion === 'listo' && (
                        <div className="bg-gradient-to-r from-green-600 to-[#8CB33E] rounded-[32px] p-8 flex items-center gap-6 shadow-xl">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em] mb-2">Animal Listo para Mercado</p>
                                <p className="text-xl font-black text-white">Este animal pesa {metricas.pesoActual} KG (meta: {pesoIdealVenta} KG). Evalúa la venta cuando el precio de mercado sea favorable.</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-4xl font-black text-yellow-300">💰</p>
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">¡Es dinero!</p>
                            </div>
                        </div>
                    )}

                    {/* ✅ ESTADO: ACTIVO — Proyección válida dentro de 2 años */}
                    {estadoProyeccion === 'activo' && (
                        <div className="bg-gradient-to-r from-[#11261F] to-[#1a3a2e] rounded-[32px] p-8 flex items-center justify-between shadow-xl">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">🔮</div>
                                <div>
                                    <p className="text-[10px] font-black text-[#8CB33E] uppercase tracking-[0.3em] mb-2">El Oráculo — Venta Estimada (a {pesoIdealVenta} KG)</p>
                                    <p className="text-2xl font-black text-white">
                                        {fechaEstimadaVenta.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faltan</p>
                                <p className="text-3xl font-black text-[#8CB33E] tabular-nums">{diasParaVenta}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">días</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Le faltan</p>
                                <p className="text-2xl font-black text-white tabular-nums">{pesoFaltante.toFixed(0)} KG</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">para {pesoIdealVenta} KG</p>
                            </div>
                        </div>
                    )}

                    {/* ⚠️ ESTADO: ESTANCADO — GMD es 0 o negativa */}
                    {estadoProyeccion === 'estancado' && (
                        <div className="bg-[#11261F] rounded-[32px] p-8 flex items-center gap-6 shadow-xl border-l-[6px] border-red-500">
                            <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">📉</div>
                            <div>
                                <p className="text-sm font-black text-red-400 uppercase tracking-widest mb-2">⚠️ Curva Estancada</p>
                                <p className="text-sm text-gray-300 font-bold leading-relaxed">
                                    El animal no está ganando peso (GMD: {metricas.gmd} KG/día). La proyección de venta está pausada hasta que se registre un incremento real.
                                </p>
                                <p className="text-[10px] font-black text-red-400/70 mt-3 uppercase tracking-widest">Acción sugerida: Revisar alimentación, parásitos o estado clínico.</p>
                            </div>
                        </div>
                    )}

                    {/* ⏳ ESTADO: INVIABLE — Más de 2 años para la meta */}
                    {estadoProyeccion === 'inviable' && (
                        <div className="bg-[#11261F] rounded-[32px] p-8 flex items-center gap-6 shadow-xl border-l-[6px] border-yellow-500">
                            <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">⏳</div>
                            <div>
                                <p className="text-sm font-black text-yellow-400 uppercase tracking-widest mb-2">Proyección a Largo Plazo</p>
                                <p className="text-sm text-gray-300 font-bold leading-relaxed">
                                    Con la ganancia actual ({metricas.gmd} KG/día), faltan más de 2 años para alcanzar los {pesoIdealVenta} KG. La proyección exacta se habilitará en la fase de ceba.
                                </p>
                                <p className="text-[10px] font-black text-yellow-400/70 mt-3 uppercase tracking-widest">Este dato mejorará automáticamente cuando el animal entre en ceba intensiva.</p>
                            </div>
                        </div>
                    )}

                    <section className="bg-white rounded-[40px] p-12 border border-[#E6F4D7] shadow-sm overflow-hidden">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-[#11261F] mb-4">Curva de Crecimiento & Proyección</h3>
                                {sugerenciaVenta && (
                                    <span className="bg-green-50 text-[#8CB33E] border border-[#8CB33E] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        ✓ Punto Óptimo de Venta Alcanzado
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <div className={`px-6 py-4 rounded-3xl text-right shadow-sm border ${gmdNum > 0.6 ? 'bg-[#F4F6F4] border-[#E6F4D7]' : 'bg-red-50 border-red-100'}`}>
                                    <p className={`text-[9px] font-black uppercase mb-1 tracking-widest ${gmdNum > 0.6 ? 'text-[#8CB33E]' : 'text-red-500'}`}>
                                        GMD (Ganancia Diaria)
                                    </p>
                                    <p className={`text-2xl font-black tabular-nums ${gmdNum > 0.6 ? 'text-[#11261F]' : 'text-red-700'}`}>
                                        {metricas.gmd} KG/Día
                                    </p>
                                </div>
                                <div className="bg-[#11261F] px-6 py-4 rounded-3xl text-right shadow-lg">
                                    <p className="text-[9px] font-black text-[#8CB33E] uppercase mb-1 tracking-widest">Proyección 30D</p>
                                    <p className="text-2xl font-black text-white tabular-nums">{metricas.proyeccion30} KG</p>
                                </div>
                                <div className="bg-[#E6F4D7] px-6 py-4 rounded-3xl text-right border border-[#8CB33E]/30">
                                    <p className="text-[9px] font-black text-[#11261F] uppercase mb-1 tracking-widest">Actual</p>
                                    <p className="text-2xl font-black text-[#11261F] tabular-nums">{metricas.pesoActual} KG</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorGeo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8CB33E" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8CB33E" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F6F4" />
                                    <XAxis dataKey="fecha" tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis orientation="right" tick={{ fill: '#11261F', fontSize: 13, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: '900' }} />

                                    <Area type="monotone" dataKey="peso_real" stroke="#11261F" strokeWidth={6} fill="url(#colorGeo)" />
                                    <Area type="monotone" dataKey="peso_proyectado" stroke="#8CB33E" strokeWidth={4} strokeDasharray="8 8" fill="none" />

                                    {chartData.length > 0 && <ReferenceDot x={chartData[chartData.length - 1].fecha} y={chartData[chartData.length - 1].peso_proyectado} r={6} fill="#8CB33E" stroke="white" strokeWidth={3} />}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="bg-white rounded-[40px] border border-[#E6F4D7] shadow-sm overflow-hidden">
                        <div className="flex bg-[#F9FBFA] border-b border-[#E6F4D7] p-3">
                            <button onClick={() => setActiveTab('pesajes')} className={`flex-1 py-5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'pesajes' ? 'bg-[#11261F] text-white shadow-lg' : 'text-gray-400'}`}>Control de Pesos</button>
                            <button onClick={() => setActiveTab('salud')} className={`flex-1 py-5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'salud' ? 'bg-[#11261F] text-white shadow-lg' : 'text-gray-400'}`}>Sanidad y Retiro</button>
                        </div>

                        <div className="p-12">
                            {activeTab === 'pesajes' && (
                                <table className="w-full text-left">
                                    <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b-2 border-[#F4F6F4]">
                                        <tr>
                                            <th className="pb-6">Fecha</th>
                                            <th className="pb-6 text-center">Peso (KG)</th>
                                            <th className="pb-6">Novedades</th>
                                            <th className="pb-6 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F4F6F4]">
                                        {[...historial].reverse().map((h, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-all">
                                                <td className="py-5 font-black text-sm text-gray-600 uppercase">{new Date(h.fecha_pesaje).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
                                                <td className="py-5 font-black text-xl text-center tabular-nums">{h.peso_kg} KG</td>
                                                <td className="py-5 font-bold text-sm text-gray-400 italic">{h.observaciones || '---'}</td>
                                                <td className="py-5 text-right flex justify-end">
                                                    <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin', 'encargado']}>
                                                        <button onClick={() => editarPeso(h)} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all mr-2">Editar</button>
                                                    </RoleGuard>
                                                    <RoleGuard allowedRoles={['superadmin', 'propietario', 'admin']}>
                                                        <button onClick={() => eliminarPeso(h.id_peso)} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-all">Eliminar</button>
                                                    </RoleGuard>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                                {activeTab === 'salud' && (
                                    <div className="space-y-8">
                                        {registroActivo && (
                                            <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[36px] flex items-center gap-8 animate-pulse">
                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-red-200">🛡️</div>
                                                <div>
                                                    <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Alerta: Retiro Activo</p>
                                                    <p className="text-lg font-bold text-[#11261F] leading-tight italic">Animal en tratamiento con {registroActivo.medicamento || registroActivo.producto}. NO APTO PARA VENTA.</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {historialSanitario.map((s, i) => (
                                                <div key={i} className="p-8 bg-white rounded-[32px] border border-[#E6F4D7] shadow-sm relative group hover:border-[#8CB33E] transition-all">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.fecha_aplicacion}</p>
                                                            <p className="text-sm font-black text-[#8CB33E] uppercase mt-1">{s.tipo_evento || 'Sanidad'}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${s.dias_retiro > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                            {s.dias_retiro > 0 ? `Retiro: ${s.dias_retiro}d` : 'Sin Retiro'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xl font-black text-[#11261F] mb-1">{s.medicamento || s.producto}</p>
                                                    <div className="flex gap-4 mt-4 mb-4">
                                                        <div className="bg-[#F4F6F4] px-4 py-2 rounded-xl">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dosis</p>
                                                            <p className="font-bold text-sm text-[#11261F]">{s.dosis || s.dosis_ml || 'N/A'}</p>
                                                        </div>
                                                        <div className="bg-[#F4F6F4] px-4 py-2 rounded-xl">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vía</p>
                                                            <p className="font-bold text-sm text-[#11261F]">{s.via_aplicacion || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    {s.observaciones && (
                                                        <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                                                            <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-1">Observaciones</p>
                                                            <p className="text-sm font-medium text-gray-600 italic">{s.observaciones}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => setShowSanitaryModal(true)} className="w-full border-2 border-dashed border-[#E6F4D7] py-8 rounded-[24px] text-gray-400 font-black uppercase text-xs tracking-widest hover:border-[#8CB33E] hover:text-[#8CB33E] transition-all bg-[#F9FBFA]">+ Registrar Evento Clínico</button>
                                    </div>
                                )}
                        </div>
                    </section>
                </div>
            </main>

            {/* ========================================================================= */}
            {/* 🩺 MODAL: APLICACIÓN SANITARIA                                             */}
            {/* ========================================================================= */}
            {showSanitaryModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#11261F]/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-[650px] rounded-[48px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-[#11261F]">Certificar Aplicación</h3>
                            <button onClick={() => setShowSanitaryModal(false)} className="text-gray-400 hover:text-red-500 text-2xl">✕</button>
                        </div>
                        <form onSubmit={sanitaryForm.handleSubmit(onSanitarySubmit)} className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Medicamento</label>
                                    <input {...sanitaryForm.register('medicamento')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: Ivermectina" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Días de Retiro</label>
                                    <input type="number" {...sanitaryForm.register('dias_retiro')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: 28" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Vía de Aplicación</label>
                                    <select {...sanitaryForm.register('via_aplicacion')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                                        <option value="Subcutánea">Subcutánea</option>
                                        <option value="Intramuscular">Intramuscular</option>
                                        <option value="Oral">Oral</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Motivo</label>
                                    <input {...sanitaryForm.register('motivo')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: Control de parásitos" required />
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-[#11261F] text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-widest hover:bg-[#8CB33E] transition-all shadow-xl disabled:bg-gray-300">
                                {isSubmitting ? 'Registrando...' : 'Confirmar y Guardar Registro'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🧬 MODAL: TRAZABILIDAD Y GENÉTICA                                        */}
            {/* ========================================================================= */}
            <ModalOverlay isOpen={showTrazabilidadModal} onClose={() => setShowTrazabilidadModal(false)} title="EDITAR TRAZABILIDAD" maxWidth="md">
                <form onSubmit={trazabilidadForm.handleSubmit(onTrazabilidadSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Registro SINIGÁN</label>
                        <input {...trazabilidadForm.register('registro_sinigan')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: 992384729" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Guía de Movilización (Ingreso)</label>
                        <input {...trazabilidadForm.register('guia_movilizacion_ingreso')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: GM-2023-001" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Propósito Productivo</label>
                        <select {...trazabilidadForm.register('proposito_productivo')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                            <option value="">-- Seleccionar --</option>
                            <option value="CRIA">Cría</option>
                            <option value="CEBA">Ceba</option>
                            <option value="DOBLE_PROPOSITO">Doble Propósito</option>
                            <option value="LECHERIA">Lechería Especializada</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Padre (Genética/Nombre)</label>
                            <input {...trazabilidadForm.register('padre_genetica')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: Toro Blanco" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Madre (Chapeta Numérica)</label>
                            <input type="number" {...trazabilidadForm.register('id_madre')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: 304" />
                        </div>
                    </div>
                    <button type="submit" disabled={trazabilidadForm.formState.isSubmitting} className="w-full bg-[#11261F] text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-widest hover:bg-[#8CB33E] transition-all shadow-xl">
                        {trazabilidadForm.formState.isSubmitting ? 'Guardando...' : 'Guardar Trazabilidad'}
                    </button>
                </form>
            </ModalOverlay>

            {/* ========================================================================= */}
            {/* ⚖️ MODAL: REGISTRAR PESO / NOVEDAD                                        */}
            {/* ========================================================================= */}
            <ModalOverlay
                isOpen={showPesoModal}
                onClose={() => { setShowPesoModal(false); setEditandoPesoId(null); reset(); }}
                title={editandoPesoId ? "CORREGIR REGISTRO DE PESO" : "NUEVO PESAJE DE CAMPO"}
                maxWidth="sm"
            >
                <form onSubmit={handleSubmit(async (data) => {
                    await onPesoSubmit(data);
                })} className="space-y-6">

                    <div className="bg-[#F4F6F4] rounded-[32px] p-8 text-center border-2 border-[#E6F4D7] focus-within:border-[#8CB33E] transition-all">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Peso en Báscula (KG)</label>
                        <input
                            type="number" step="0.01"
                            {...register('peso', { required: true })}
                            className="w-full bg-transparent border-none p-0 text-6xl font-black text-[#11261F] focus:ring-0 outline-none tabular-nums text-center"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-gray-500 ml-2 tracking-widest">Observaciones en Corral</label>
                        <textarea
                            {...register('observaciones')}
                            rows="3"
                            className="w-full bg-[#F4F6F4] border-2 border-[#E6F4D7] rounded-[24px] p-5 text-sm font-bold text-[#11261F] outline-none focus:border-[#8CB33E] resize-none"
                            placeholder="Ej: Animal con leve cojera, o sin apetito..."
                        ></textarea>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#8CB33E] text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#11261F] transition-all active:scale-95">
                        {isSubmitting ? 'Guardando...' : 'Guardar Pesaje'}
                    </button>
                </form>
            </ModalOverlay>
            {/* ========================================================================= */}
            {/* 🚪 MODAL: REGISTRAR SALIDA / BAJA                                         */}
            {/* ========================================================================= */}
            <ModalOverlay isOpen={showSalidaModal} onClose={() => setShowSalidaModal(false)} title="REGISTRAR SALIDA" maxWidth="md">
                <form onSubmit={salidaForm.handleSubmit(onSalidaSubmit)} className="space-y-6">
                    <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl mb-4">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest text-center">Auditoría de Inventario</p>
                        <p className="text-xs text-red-800 text-center mt-1 font-bold">Esta acción retirará al animal del potrero activo pero conservará su historia contable.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Motivo de Salida</label>
                        <select {...salidaForm.register('estado')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                            <option value="vendido">Vendido / Comercio</option>
                            <option value="muerto">Muerto / Baja</option>
                            <option value="robo">Robo / Pérdida</option>
                            <option value="consumo">Consumo Interno</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Valor de Venta ($) (Opcional)</label>
                            <input type="number" {...salidaForm.register('precio_venta')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: 3500000" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Detalles Adicionales</label>
                            <input {...salidaForm.register('detalle_salida')} className="w-full bg-[#F4F6F4] rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]" placeholder="Ej: Comprador X, o causa de muerte" />
                        </div>
                    </div>

                    <button type="submit" disabled={salidaForm.formState.isSubmitting} className="w-full bg-red-600 text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-xl">
                        {salidaForm.formState.isSubmitting ? 'Registrando Salida...' : 'Confirmar Salida Definitiva'}
                    </button>
                </form>
            </ModalOverlay>
        </div>
    );
}
