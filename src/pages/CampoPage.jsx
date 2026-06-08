// src/pages/CampoPage.jsx
// TERMINAL DE CAMPO: Interfaz táctil ultra-simplificada para operarios
// Diseño TPV (Punto de Venta) con alto contraste para uso bajo el sol.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import { notifySuccess, notifyError, notifyWarning } from '../utils/notify';
import { Scale, ArrowRightLeft, Stethoscope, PlusCircle, CheckCircle, Loader2, Wheat, AlertTriangle, Bluetooth, BluetoothConnected, Barcode, UploadCloud, Baby, ClipboardPlus } from 'lucide-react';
import ImportPesajeModal from '../components/modals/ImportPesajeModal';
import MoverGanadoPage from './MoverGanadoPage';
import { FlujoSanidad, FlujoNutricion } from './CampoComponents';
import logo from '../assets/logo_geogan.png';
import { saveOfflinePesaje, getPendingSyncCount, getOfflinePesajes, clearOfflinePesajes, deleteOfflinePesaje } from '../db/offlineStore';

/**
 * CampoPage — Terminal de Campo para el Operario
 * 
 * Interfaz aislada del dashboard web. Diseñada para pantallas pequeñas (celular),
 * con botones gigantes y teclado decimal nativo.
 * 
 * Ruta: /campo
 * Roles permitidos: operario, superadmin
 */
export default function CampoPage() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    // --- Estados ---
    const [fincas, setFincas] = useState([]);
    const [fincaSel, setFincaSel] = useState('');
    const [fincaActual, setFincaActual] = useState(null);
    const [animales, setAnimales] = useState([]);
    const [vista, setVista] = useState('menu'); // 'menu' | 'pesaje' | 'nacimiento' | 'vacuna' | 'consumo'
    const [cargando, setCargando] = useState(false);

    // Estados del flujo de pesaje
    const [pesajeData, setPesajeData] = useState({ id_animal: '', peso: '' });
    const [enviando, setEnviando] = useState(false);
    
    // Estado Offline
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [pendingSync, setPendingSync] = useState(0);

    // Detección de Red
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Cargar conteo pendiente al montar o cambiar red
    const checkPending = async () => {
        try {
            const count = await getPendingSyncCount();
            setPendingSync(count);
        } catch(e) {}
    };

    useEffect(() => {
        checkPending();
    }, [vista, isOffline]);

    // Sincronización automática
    const handleSync = async () => {
        if (isOffline) return;
        try {
            const pesajesPendientes = await getOfflinePesajes();
            if (pesajesPendientes.length === 0) return;
            
            notifyWarning(`Sincronizando ${pesajesPendientes.length} registros pendientes...`);
            let exito = 0;
            for (let p of pesajesPendientes) {
                try {
                    await api.post(`/animales/${p.id_animal}/pesaje`, {
                        peso_kg: p.peso,
                        fecha_pesaje: p.fecha_pesaje,
                        origen_dato: p.origen_dato
                    });
                    if (p.id_lote) {
                        await api.put(`/animales/${p.id_animal}/lote`, { id_lote: parseInt(p.id_lote) });
                    }
                    await deleteOfflinePesaje(p.id);
                    exito++;
                } catch(e) {
                    console.error("Error sincronizando:", e);
                }
            }
            if (exito > 0) notifySuccess(`✅ Sincronizados ${exito} registros.`);
            checkPending();
            cargarAnimales();
        } catch(e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (!isOffline && pendingSync > 0) {
            handleSync();
        }
    }, [isOffline, pendingSync]);

    // --- Carga de Fincas ---
    useEffect(() => {
        const cargarFincas = async () => {
            try {
                const res = await api.get('/fincas/');
                setFincas(res.data || []);
                // Si solo tiene una finca, auto-seleccionarla
                if (res.data?.length === 1) {
                    setFincaSel(res.data[0].id_finca);
                    setFincaActual(res.data[0]);
                }
            } catch (error) {
                console.error("Error cargando fincas:", error);
            }
        };
        cargarFincas();
    }, []);

    // --- Auto-selección sincronizada ---
    useEffect(() => {
        if (fincaSel && fincas.length > 0) {
            setFincaActual(fincas.find(f => String(f.id_finca) === String(fincaSel)));
        }
    }, [fincaSel, fincas]);

    // --- Carga de Animales al seleccionar finca ---
    const cargarAnimales = useCallback(async () => {
        if (!fincaSel) return;
        setCargando(true);
        try {
            const res = await api.get(`/animales/?finca_id=${fincaSel}`);
            setAnimales((res.data || []).filter(a => a.estado?.toUpperCase() === 'ACTIVO'));
        } catch (error) {
            console.error("Error cargando animales:", error);
        } finally {
            setCargando(false);
        }
    }, [fincaSel]);

    useEffect(() => {
        cargarAnimales();
    }, [cargarAnimales]);

    // --- Envío de Pesaje ---
    const handleEnviarPesaje = async () => {
        if (!pesajeData.id_animal || !pesajeData.peso) {
            notifyWarning("Selecciona un animal y escribe el peso.");
            return;
        }

        setEnviando(true);
        try {
            await api.post('/pesajes/', {
                id_animal: parseInt(pesajeData.id_animal),
                peso_kg: parseFloat(pesajeData.peso),
                fecha_pesaje: new Date().toISOString().split('T')[0],
                origen_dato: 'MANUAL_CAMPO'
            });

            notifySuccess("✅ ¡Peso registrado! Ya puedes pesar el siguiente.");
            setPesajeData({ id_animal: '', peso: '' });
            cargarAnimales(); // Recargar para actualizar pesos
        } catch (error) {
            console.error("Error registrando pesaje:", error);
            notifyError("❌ Error al guardar. Verifica tu conexión.");
        } finally {
            setEnviando(false);
        }
    };

    // --- UI: Selector de Finca (siempre visible en el header del campo) ---
    const HeaderCampo = () => {
        return (
            <header className="bg-white border-b border-slate-200 h-20 px-4 md:px-6 flex justify-between items-center shadow-sm">
                <img src={logo} alt="GeoGan" style={{ height: '100px', margin: '-20px 0' }} className="object-contain" />
                
                {/* Información de Finca con manejo de estado y botones */}
                <div className="flex items-center gap-4">
                    {pendingSync > 0 && (
                        <button onClick={handleSync} className="hidden md:flex bg-amber-100 text-amber-700 border border-amber-300 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-amber-200 transition-colors gap-2 items-center">
                            <UploadCloud className="w-4 h-4"/> Sync ({pendingSync})
                        </button>
                    )}
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 justify-end">
                            {isOffline ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> : <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                            {isOffline ? 'Modo Offline' : 'Finca Activa'}
                        </p>
                        <p className="text-slate-800 font-black text-sm truncate max-w-[150px]">
                            {fincaActual?.nombre || "Sin Finca"}
                        </p>
                    </div>
                    {user?.rol === 'superadmin' && (
                        <button onClick={() => navigate('/dashboard')} className="bg-violet-100 text-violet-700 border border-violet-200 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-violet-200 transition-colors">
                            🛠️ Dash
                        </button>
                    )}
                    <button onClick={logout} className="text-red-500 bg-red-50 border border-red-100 w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">✕</button>
                </div>
            </header>
        );
    };

    // --- UI: Menú Principal (Botones Dinámicos) ---
    const MenuPrincipal = () => {
        const botones = [
            { label: "Pesaje Rápido", icon: Scale, accion: () => fincaSel ? setVista('pesaje') : notifyWarning("Seleccione una finca primero") },
            { label: "Mover Ganado", icon: ArrowRightLeft, accion: () => fincaSel ? setVista('mover') : notifyWarning("Seleccione una finca primero") },
            { label: "Sanidad", icon: Stethoscope, accion: () => fincaSel ? setVista('vacuna') : notifyWarning("Seleccione una finca primero") },
            { label: "Ingreso de Animales", icon: ClipboardPlus, accion: () => fincaSel ? setVista('nacimiento') : notifyWarning("Seleccione una finca primero") },
            { label: "Dar Alimento", icon: Wheat, accion: () => fincaSel ? setVista('consumo') : notifyWarning("Seleccione una finca primero") },
            { label: "Registrar Baja", icon: AlertTriangle, danger: true, accion: () => notifyWarning("🚧 Módulo de Bajas en desarrollo.") }
        ];

        return (
            <div className="flex-1 p-4 flex flex-col items-center w-full max-w-5xl mx-auto">
                {/* Selector de Finca si hay varias */}
                {fincas.length > 1 && (
                    <div className="w-full mb-6">
                        <select 
                            value={fincaSel} 
                            onChange={(e) => setFincaSel(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 font-bold text-slate-800 outline-none shadow-sm focus:border-[#8CB33E] transition-colors"
                        >
                            <option value="">-- Seleccione Finca --</option>
                            {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre?.toUpperCase()}</option>)}
                        </select>
                    </div>
                )}

                {/* Grid Responsive - Estructura proporcionada por el usuario */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                    {botones.map((item, i) => (
                        <button 
                            key={i}
                            onClick={item.accion}
                            className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center transition-all hover:shadow-md active:scale-95 cursor-pointer aspect-square"
                        >
                            <item.icon className={`w-12 h-12 md:w-16 md:h-16 mb-3 ${item.danger ? 'text-red-600' : 'text-[#064E3B]'}`} strokeWidth={1.5} />
                            <span className={`font-bold md:text-lg text-center leading-tight ${item.danger ? 'text-red-700' : 'text-slate-800'}`}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // --- UI: Flujo de Pesaje Rápido ---
    const FlujoPesaje = () => {
        const [lotes, setLotes] = useState([]);
        const [loteSel, setLoteSel] = useState('');
        
        const [chapetaInput, setChapetaInput] = useState('');
        const [pesoInput, setPesoInput] = useState('');
        const [isBluetooth, setIsBluetooth] = useState(false);
        const [animalFound, setAnimalFound] = useState(null);
        const [showImportModal, setShowImportModal] = useState(false);
        
        const chapetaRef = React.useRef(null);
        const pesoRef = React.useRef(null);

        // Fetch de Lotes para el Selector
        useEffect(() => {
            const cargarLotes = async () => {
                if (!fincaSel) return;
                try {
                    const res = await api.get(`/lotes/finca/${fincaSel}`);
                    setLotes(res.data || []);
                } catch (error) {
                    console.error("Error cargando lotes:", error);
                }
            };
            cargarLotes();
        }, []);

        // Auto-focus en el escáner de chapeta al entrar
        useEffect(() => {
            if (chapetaRef.current) chapetaRef.current.focus();
        }, []);

        // Búsqueda en tiempo real del animal
        useEffect(() => {
            if (chapetaInput.trim().length >= 2) {
                const found = animales.find(a => 
                    a.codigo_identificacion.toLowerCase() === chapetaInput.toLowerCase().trim()
                );
                setAnimalFound(found || null);
            } else {
                setAnimalFound(null);
            }
        }, [chapetaInput, animales]);

        const handleSimularBluetooth = () => {
            if (!isBluetooth) return;
            const pesoRandom = (Math.random() * 100 + 300).toFixed(1); 
            setPesoInput(pesoRandom);
        };

        const handleChapetaKeyDown = (e) => {
            if (e.key === 'Enter') {
                if (!animalFound && chapetaInput.trim().length > 0) {
                    notifyWarning("⚠️ Chapeta no encontrada. Verifique el código.");
                    setChapetaInput('');
                    return;
                }
                if (isBluetooth) {
                    handleSimularBluetooth();
                } else if (pesoRef.current) {
                    pesoRef.current.focus();
                }
            }
        };

        const handleGuardar = async () => {
            if (!animalFound) {
                notifyError("❌ Animal no encontrado. Escanea la chapeta primero.");
                setChapetaInput('');
                if (chapetaRef.current) chapetaRef.current.focus();
                return;
            }
            const peso = parseFloat(pesoInput);
            if (!peso || peso <= 0) {
                notifyWarning("⚠️ Ingresa un peso válido.");
                if (pesoRef.current) pesoRef.current.focus();
                return;
            }
            
            // Regla Inquebrantable: Sanity Check de Peso
            if (peso < 10 || peso > 1500) {
                if (!window.confirm(`⚠️ ¿Peso correcto? ${peso} kg parece un valor inusual para un bovino. ¿Deseas guardar de todos modos?`)) {
                    if (pesoRef.current) pesoRef.current.focus();
                    return;
                }
            }

            setEnviando(true);
            try {
                if (isOffline) {
                    await saveOfflinePesaje({
                        id_animal: animalFound.id_animal,
                        peso: peso,
                        fecha_pesaje: new Date().toISOString().split('T')[0],
                        origen_dato: isBluetooth ? 'BLUETOOTH' : 'MANUAL_CAMPO',
                        id_lote: loteSel || null
                    });
                    notifySuccess(`💾 ${animalFound.codigo_identificacion} pesó ${peso} kg (Guardado Offline).`);
                    checkPending();
                } else {
                    // 1. Enviar el registro al backend
                    await api.post(`/animales/${animalFound.id_animal}/pesaje`, {
                        peso_kg: peso,
                        fecha_pesaje: new Date().toISOString().split('T')[0],
                        origen_dato: isBluetooth ? 'BLUETOOTH' : 'MANUAL_CAMPO'
                    });

                    // 2. Si hay lote seleccionado y es distinto al actual, actualizamos el lote
                    if (loteSel && animalFound.id_lote !== parseInt(loteSel)) {
                        await api.put(`/animales/${animalFound.id_animal}/lote`, { id_lote: parseInt(loteSel) });
                    }
                    notifySuccess(`✅ ${animalFound.codigo_identificacion} pesó ${peso} kg.`);
                }

                // 3. Regla Inquebrantable: Guardado Continuo sin tocar pantalla
                setChapetaInput('');
                setPesoInput('');
                setAnimalFound(null);
                
                if (!isOffline) cargarAnimales(); 
                
                setTimeout(() => {
                    if (chapetaRef.current) chapetaRef.current.focus();
                }, 50);
            } catch (error) {
                console.error("Error registrando pesaje:", error);
                notifyError("❌ Error al guardar en el servidor.");
            } finally {
                setEnviando(false);
            }
        };

        return (
            <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header: Volver y Bluetooth Toggle */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => { setVista('menu'); setChapetaInput(''); setPesoInput(''); }}
                        className="text-sm font-black text-[#8CB33E] uppercase tracking-widest flex items-center gap-2"
                    >
                        ← Volver
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-2 px-4 py-2 md:py-3 rounded-xl font-bold transition-all shadow-sm border-2 border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 bg-white"
                        >
                            <UploadCloud className="w-5 h-5"/>
                            <span className="hidden md:inline">Cargar Archivo</span>
                            <span className="md:hidden">CSV</span>
                        </button>

                        <button 
                            onClick={() => setIsBluetooth(!isBluetooth)}
                            className={`flex items-center gap-2 px-4 py-2 md:py-3 rounded-xl font-bold transition-all shadow-sm ${
                                isBluetooth ? 'bg-blue-600 text-white shadow-blue-500/40 ring-4 ring-blue-600/20' : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                            {isBluetooth ? <BluetoothConnected className="w-5 h-5"/> : <Bluetooth className="w-5 h-5"/>}
                            <span className="hidden md:inline">{isBluetooth ? 'Báscula BT Conectada' : 'Conectar Báscula BT'}</span>
                            <span className="md:hidden">{isBluetooth ? 'BT ON' : 'BT OFF'}</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border-2 border-slate-100 flex-1 flex flex-col gap-6 relative overflow-hidden">
                    {/* Efecto de escaneo BT */}
                    {isBluetooth && <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/20 overflow-hidden"><div className="w-1/3 h-full bg-blue-500 animate-pulse rounded-full"></div></div>}

                    {/* Selector de Lote Persistente */}
                    <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border-2 border-slate-100 transition-colors focus-within:border-[#064E3B]/20">
                        <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                            Ubicación Destino / Lote de Trabajo
                        </label>
                        <select
                            value={loteSel}
                            onChange={(e) => setLoteSel(e.target.value)}
                            className="w-full bg-transparent text-sm md:text-base font-bold text-slate-800 outline-none"
                        >
                            <option value="">-- Sin Lote Asignado --</option>
                            {lotes.map(l => (
                                <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-6">
                        {/* Hub Input: Chapeta / Scanner */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                                    Escáner de Chapeta / Código
                                </label>
                                {animalFound && (
                                    <span className="text-[10px] md:text-xs font-black text-[#8CB33E] uppercase bg-[#8CB33E]/10 px-2 py-1 rounded-md">
                                        Lote actual: {lotes.find(l => l.id_lote === animalFound.id_lote)?.nombre || 'General'}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    ref={chapetaRef}
                                    type="text"
                                    placeholder="Escanea el código..."
                                    value={chapetaInput}
                                    onChange={(e) => setChapetaInput(e.target.value)}
                                    onKeyDown={handleChapetaKeyDown}
                                    className={`w-full bg-slate-50 border-2 rounded-2xl p-5 md:p-6 text-2xl md:text-4xl font-black outline-none transition-colors uppercase ${
                                        chapetaInput.length > 0 
                                            ? animalFound ? 'border-[#8CB33E] text-[#064E3B] bg-lime-50/30' : 'border-red-400 text-red-600 bg-red-50/30'
                                            : 'border-slate-200 text-slate-800 focus:border-[#064E3B]'
                                    }`}
                                />
                                <div className={`absolute right-6 top-1/2 -translate-y-1/2 transition-colors ${chapetaInput.length > 0 ? (animalFound ? 'text-[#8CB33E]' : 'text-red-400') : 'text-slate-300'}`}>
                                    <Barcode className="w-8 h-8 md:w-10 md:h-10" />
                                </div>
                            </div>
                            {chapetaInput.length > 0 && !animalFound && (
                                <p className="text-red-600 text-xs md:text-sm font-bold mt-2 ml-1 flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4"/> Animal no encontrado. Borra y vuelve a escanear.
                                </p>
                            )}
                            {animalFound && (
                                <p className="text-[#064E3B] text-xs md:text-sm font-bold mt-2 ml-1 flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4"/> {animalFound.raza || 'Bovino'} — Peso anterior: {animalFound.peso || 'N/A'} kg
                                </p>
                            )}
                        </div>

                        {/* Hub Input: Peso */}
                        <div className="relative">
                            <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                                Peso en la báscula (KG)
                            </label>
                            <input
                                ref={pesoRef}
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                placeholder={isBluetooth ? "Esperando a la báscula..." : "0.0"}
                                value={pesoInput}
                                onChange={(e) => setPesoInput(e.target.value)}
                                disabled={isBluetooth}
                                onKeyDown={(e) => e.key === 'Enter' && handleGuardar()}
                                className={`w-full border-2 rounded-2xl p-6 md:p-8 text-center text-6xl md:text-8xl font-black outline-none transition-colors tabular-nums ${
                                    isBluetooth 
                                        ? 'bg-blue-50/50 border-blue-200 text-blue-900 cursor-not-allowed placeholder:text-blue-300/50 placeholder:text-3xl' 
                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#8CB33E] focus:bg-white'
                                }`}
                            />
                            {/* Panel de Simulación Bluetooth (Solo para Dev) */}
                            {isBluetooth && (
                                <button 
                                    onClick={handleSimularBluetooth}
                                    className="absolute right-4 bottom-4 bg-blue-600/10 text-blue-700 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-colors border border-blue-200"
                                >
                                    Inyectar Test BT
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Botón Guardar - Masivo y Reactivo */}
                    <button
                        onClick={handleGuardar}
                        disabled={enviando || !animalFound || !pesoInput}
                        className={`w-full h-20 md:h-24 rounded-2xl text-xl md:text-2xl font-black uppercase tracking-wider shadow-lg transition-all mt-auto flex items-center justify-center gap-3 ${
                            enviando || !animalFound || !pesoInput 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200' 
                                : 'bg-[#8CB33E] hover:bg-lime-600 active:scale-[0.98] text-white shadow-lime-600/30 ring-4 ring-lime-600/10'
                        }`}
                    >
                        {enviando ? (
                            <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-6 h-6 animate-spin"/> Procesando...</span>
                        ) : (
                            <><CheckCircle className="w-6 h-6 md:w-8 md:h-8"/> Registrar Peso</>
                        )}
                    </button>
                </div>

                {/* Modal de Importación Masiva */}
                <ImportPesajeModal 
                    isOpen={showImportModal} 
                    onClose={() => setShowImportModal(false)} 
                    fincaSel={fincaSel}
                    onImportSuccess={() => cargarAnimales()}
                />
            </div>
        );
    };

    // --- UI: Flujo de Registro de Animal (Nació Cría / Compra) ---
    const FlujoNacimiento = () => {
        const [lotes, setLotes] = useState([]);
        const [origen, setOrigen] = useState('NACIMIENTO');
        const [formData, setFormData] = useState({
            codigo_visual: '',
            sexo: '',
            raza: '',
            peso: '',
            id_lote: '',
            observaciones: ''
        });
        const [animalEnTransito, setAnimalEnTransito] = useState(null);
        const [guardando, setGuardando] = useState(false);
        const [animalesCache, setAnimalesCache] = useState([]);
        const codigoRef = React.useRef(null);

        const razas = ['Brahman', 'Holstein', 'Jersey', 'Normando', 'Angus', 'Gyr', 'Simmental', 'Charolais', 'Cebú', 'Pardo Suizo', 'Senepol', 'Mestizo'];

        useEffect(() => {
            const cargarLotes = async () => {
                if (!fincaSel) return;
                try {
                    const res = await api.get(`/lotes/finca/${fincaSel}`);
                    setLotes(res.data || []);
                } catch (error) {
                    console.error("Error cargando lotes:", error);
                }
            };
            cargarLotes();
        }, []);

        useEffect(() => {
            if (codigoRef.current) codigoRef.current.focus();
        }, []);

        useEffect(() => {
            const cargarAnimalesCache = async () => {
                if (!fincaSel) return;
                try {
                    const res = await api.get(`/animales/?finca_id=${fincaSel}&estado=en_transito`);
                    setAnimalesCache(res.data || []);
                } catch (error) {
                    console.error("Error cargando animales cache:", error);
                }
            };
            cargarAnimalesCache();
        }, [fincaSel]);

        useEffect(() => {
            const valorInput = formData.codigo_visual.trim();
            if (valorInput.length > 0) {
                const match = animalesCache.find(a => 
                    String(a.codigo_identificacion).trim() === String(valorInput) && 
                    String(a.estado).toLowerCase() === 'en_transito'
                );
                setAnimalEnTransito(match || null);
            } else {
                setAnimalEnTransito(null);
            }
        }, [formData.codigo_visual, animalesCache]);

        const handleChange = (field, value) => {
            setFormData(prev => ({ ...prev, [field]: value }));
        };

        const handleGuardarAnimal = async () => {
            if (!formData.codigo_visual.trim()) {
                notifyWarning("Debes escribir un código de chapeta.");
                if (codigoRef.current) codigoRef.current.focus();
                return;
            }
            if (!animalEnTransito && !formData.sexo) {
                notifyWarning("Selecciona el sexo del animal.");
                return;
            }

            setGuardando(true);
            try {
                const chapeta = formData.codigo_visual.trim().toUpperCase();
                const pesoFloat = formData.peso ? parseFloat(formData.peso) : null;
                const idLoteInt = formData.id_lote ? parseInt(formData.id_lote) : null;

                if (animalEnTransito) {
                    await api.put(`/animales/${animalEnTransito.id_animal}`, {
                        peso: pesoFloat,
                        id_lote: idLoteInt,
                        estado: 'activo'
                    });
                    notifySuccess(`✅ ¡Triage Exitoso! ${chapeta} ingresó al potrero.`);
                } else {
                    const payload = {
                        id_finca: parseInt(fincaSel),
                        codigo_identificacion: chapeta,
                        codigo_visual: chapeta,
                        sexo: formData.sexo,
                        raza: formData.raza || null,
                        peso: pesoFloat,
                        origen: origen,
                        fecha_nacimiento: origen === 'NACIMIENTO' ? new Date().toISOString().split('T')[0] : null,
                        fecha_ingreso: new Date().toISOString().split('T')[0],
                        id_lote: (origen === 'NACIMIENTO' && formData.id_lote) ? idLoteInt : null,
                        observaciones: formData.observaciones || null
                    };

                    await api.post('/animales/', payload);
                    notifySuccess(`✅ ${chapeta} registrado como ${origen === 'NACIMIENTO' ? 'nueva cría' : 'compra externa'}.`);
                }

                // Reset para siguiente registro
                setFormData({ codigo_visual: '', sexo: '', raza: '', peso: '', id_lote: '', observaciones: '' });
                cargarAnimales();
                setTimeout(() => { if (codigoRef.current) codigoRef.current.focus(); }, 50);
            } catch (error) {
                console.error("Error registrando animal:", error);
                const detail = error.response?.data?.detail || "Error al guardar en el servidor.";
                notifyError(`❌ ${detail}`);
            } finally {
                setGuardando(false);
            }
        };

        return (
            <div className="flex-1 flex flex-col p-4 md:p-6 gap-4">
                <button
                    onClick={() => setVista('menu')}
                    className="text-sm font-black text-[#8CB33E] uppercase tracking-widest flex items-center gap-2"
                >
                    ← Volver
                </button>

                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border-2 border-slate-100 flex-1 flex flex-col gap-6">
                    <h2 className="text-xl md:text-2xl font-black uppercase text-slate-800 flex justify-center items-center gap-3">
                        <Baby className="w-7 h-7 md:w-8 md:h-8 text-[#064E3B]" /> Registrar Animal
                    </h2>

                    {/* Banner de Triage (Animal en Tránsito) */}
                    {animalEnTransito && (
                        <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-900 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2 shadow-sm">
                            <span className="text-3xl">📢</span>
                            <div>
                                <p className="font-black text-sm uppercase tracking-widest text-emerald-800">¡Animal del manifiesto detectado!</p>
                                <p className="text-xs font-bold text-emerald-700 mt-1">Raza: {animalEnTransito.raza || 'N/A'} | Sexo: {animalEnTransito.sexo || 'N/A'}</p>
                            </div>
                        </div>
                    )}

                    {/* Selector de Origen */}
                    {!animalEnTransito && (
                        <div>
                            <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest block mb-3">Origen de Ingreso</label>
                            <div className="flex gap-3">
                                <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer font-bold transition-all ${
                                    origen === 'NACIMIENTO' ? 'border-[#064E3B] bg-emerald-50 text-[#064E3B] ring-4 ring-[#064E3B]/10' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                }`}>
                                    <input type="radio" name="origen" value="NACIMIENTO" checked={origen === 'NACIMIENTO'} onChange={(e) => setOrigen(e.target.value)} className="hidden" />
                                    <Baby className="w-5 h-5" /> Nacimiento
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer font-bold transition-all ${
                                    origen === 'COMPRA' ? 'border-[#064E3B] bg-emerald-50 text-[#064E3B] ring-4 ring-[#064E3B]/10' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                }`}>
                                    <input type="radio" name="origen" value="COMPRA" checked={origen === 'COMPRA'} onChange={(e) => setOrigen(e.target.value)} className="hidden" />
                                    <ArrowRightLeft className="w-5 h-5" /> Compra
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Potrero de Nacimiento (CONDICIONAL) */}
                    {(origen === 'NACIMIENTO' || animalEnTransito) && (
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border-2 border-emerald-100">
                            <label className="text-[10px] md:text-xs font-black text-[#064E3B] uppercase tracking-widest block mb-2">
                                {animalEnTransito ? 'Potrero de Destino' : 'Potrero de Nacimiento'}
                            </label>
                            <select
                                value={formData.id_lote}
                                onChange={(e) => handleChange('id_lote', e.target.value)}
                                className="w-full bg-white border-2 border-emerald-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-[#064E3B]"
                            >
                                <option value="">-- Seleccione el potrero --</option>
                                {lotes.map(l => <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {/* Chapeta / Código (CAMPO ÚNICO) */}
                        <div className="col-span-2">
                            <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Código / Chapeta</label>
                            <input
                                ref={codigoRef}
                                type="number"
                                placeholder="Ej: 4592"
                                value={formData.codigo_visual}
                                onChange={(e) => handleChange('codigo_visual', e.target.value)}
                                className={`w-full bg-slate-50 border-2 rounded-xl p-4 text-xl md:text-2xl font-black outline-none transition-colors uppercase ${
                                    animalEnTransito ? 'border-[#8CB33E] text-[#064E3B]' : 'border-slate-200 text-slate-800 focus:border-[#064E3B]'
                                }`}
                            />
                        </div>

                        {/* Sexo y Raza (Ocultos si es Triage) */}
                        {!animalEnTransito && (
                            <>
                                <div>
                                    <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Sexo</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleChange('sexo', 'M')}
                                            className={`flex-1 p-3 rounded-xl font-black text-sm border-2 transition-all ${
                                                formData.sexo === 'M' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'
                                            }`}
                                        >♂ Macho</button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('sexo', 'H')}
                                            className={`flex-1 p-3 rounded-xl font-black text-sm border-2 transition-all ${
                                                formData.sexo === 'H' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-500'
                                            }`}
                                        >♀ Hembra</button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Raza</label>
                                    <select
                                        value={formData.raza}
                                        onChange={(e) => handleChange('raza', e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-[#064E3B]"
                                    >
                                        <option value="">Selecciona...</option>
                                        {razas.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Peso al nacer / Peso de compra */}
                        <div>
                            <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                                {origen === 'NACIMIENTO' ? 'Peso al Nacer (kg)' : 'Peso de Ingreso (kg)'}
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                placeholder="0.0"
                                value={formData.peso}
                                onChange={(e) => handleChange('peso', e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xl font-black text-center text-slate-800 outline-none focus:border-[#8CB33E] tabular-nums"
                            />
                        </div>


                        {/* Observaciones */}
                        <div className="col-span-2">
                            <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Observaciones</label>
                            <textarea
                                placeholder="Color, marcas, madre, etc."
                                value={formData.observaciones}
                                onChange={(e) => handleChange('observaciones', e.target.value)}
                                rows={2}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-[#064E3B] resize-none"
                            />
                        </div>
                    </div>

                    {/* Botón Guardar */}
                    <button
                        onClick={handleGuardarAnimal}
                        disabled={guardando || !formData.codigo_visual || !formData.sexo}
                        className={`w-full h-16 md:h-20 rounded-2xl text-lg md:text-xl font-black uppercase tracking-wider shadow-lg transition-all mt-auto flex items-center justify-center gap-3 ${
                            guardando || !formData.codigo_visual || !formData.sexo
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200'
                                : 'bg-[#064E3B] hover:bg-emerald-800 active:scale-[0.98] text-white shadow-emerald-900/30'
                        }`}
                    >
                        {guardando ? (
                            <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-6 h-6 animate-spin"/> Guardando...</span>
                        ) : (
                            <><PlusCircle className="w-6 h-6"/> {origen === 'NACIMIENTO' ? 'Registrar Cría' : 'Registrar Compra'}</>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
            <HeaderCampo />
            
            {cargando ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-16 h-16 text-[#064E3B] animate-spin mx-auto mb-4" />
                        <p className="font-black text-slate-500 uppercase tracking-widest text-sm">Cargando ganado...</p>
                    </div>
                </div>
            ) : (
                <>
                    {vista === 'menu' && <MenuPrincipal />}
                    {vista === 'pesaje' && <FlujoPesaje />}
                    {vista === 'nacimiento' && <FlujoNacimiento />}
                    {vista === 'mover' && <MoverGanadoPage fincaSel={fincaSel} onVolver={() => setVista('menu')} />}
                    {vista === 'vacuna' && <FlujoSanidad fincaSel={fincaSel} animales={animales} setVista={setVista} />}
                    {vista === 'consumo' && <FlujoNutricion fincaSel={fincaSel} setVista={setVista} />}
                </>
            )}
        </div>
    );
}
