import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRightLeft, UserCircle2, Loader2, CheckCircle } from 'lucide-react';
import api from '../api/client';
import useDashboardData from '../hooks/useDashboardData';

export default function MoverGanadoPage({ fincaSel, onVolver }) {
    const [activeTab, setActiveTab] = useState('masiva'); // 'masiva' | 'individual'
    
    // Data
    const { lotes, allAnimales, loading: loadingData } = useDashboardData(fincaSel);
    
    // Estado Masiva
    const [origenSel, setOrigenSel] = useState('');
    const [destinoSel, setDestinoSel] = useState('');
    const [enviandoMasivo, setEnviandoMasivo] = useState(false);
    
    // Estado Individual
    const [chapetaInput, setChapetaInput] = useState('');
    const [destinoIndSel, setDestinoIndSel] = useState('');
    const [animalFound, setAnimalFound] = useState(null);
    const [enviandoInd, setEnviandoInd] = useState(false);

    // Derived states
    const animalesEnOrigen = origenSel ? allAnimales.filter(a => Number(a.id_lote) === Number(origenSel)) : [];

    useEffect(() => {
        if (chapetaInput.trim().length >= 1) {
            const found = allAnimales.find(a => 
                a.codigo_identificacion.toLowerCase() === chapetaInput.toLowerCase().trim()
            );
            setAnimalFound(found || null);
        } else {
            setAnimalFound(null);
        }
    }, [chapetaInput, allAnimales]);

    const handleRotarMasivo = async () => {
        if (!origenSel || !destinoSel) {
            alert("Seleccione potrero origen y destino.");
            return;
        }
        if (Number(origenSel) === Number(destinoSel)) {
            alert("El origen y destino no pueden ser el mismo.");
            return;
        }
        if (animalesEnOrigen.length === 0) {
            alert("No hay animales en el potrero de origen.");
            return;
        }

        setEnviandoMasivo(true);
        try {
            await api.put(`/animales/mover-lote/`, {
                id_finca: fincaSel,
                id_lote_origen: Number(origenSel),
                id_lote_destino: Number(destinoSel)
            });
            alert("Lote rotado con éxito.");
            setOrigenSel('');
            setDestinoSel('');
        } catch (error) {
            console.error(error);
            alert("Error al rotar lote. El endpoint podría no estar listo.");
        } finally {
            setEnviandoMasivo(false);
        }
    };

    const handleMoverIndividual = async () => {
        if (!animalFound || !destinoIndSel) {
            alert("Ingrese chapeta válida y seleccione destino.");
            return;
        }

        setEnviandoInd(true);
        try {
            await api.put(`/animales/${animalFound.id_animal}/lote`, {
                id_lote: Number(destinoIndSel)
            });
            alert("Animal movido con éxito.");
            setChapetaInput('');
            setDestinoIndSel('');
            setAnimalFound(null);
        } catch (error) {
            console.error(error);
            alert("Error al mover animal.");
        } finally {
            setEnviandoInd(false);
        }
    };

    if (loadingData) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-[#064E3B] animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header / Volver */}
            <div className="flex justify-between items-center mb-6">
                <button 
                    onClick={onVolver}
                    className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-xs md:text-sm hover:text-[#064E3B] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Volver al Menú
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('masiva')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'masiva' 
                                ? 'bg-[#064E3B] text-white shadow-md' 
                                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                    >
                        Rotación Masiva
                    </button>
                    <button 
                        onClick={() => setActiveTab('individual')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'individual' 
                                ? 'bg-[#064E3B] text-white shadow-md' 
                                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                    >
                        Rezagados (Individual)
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 md:p-10 shadow-sm border border-slate-200 flex-1 flex flex-col justify-between">
                
                {/* --- PESTAÑA: ROTACIÓN MASIVA --- */}
                {activeTab === 'masiva' && (
                    <div className="flex flex-col h-full space-y-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Rotación de Lotes</h2>
                            <p className="text-slate-500 font-bold text-sm">Mueve todos los animales de un potrero a otro en un solo click.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                            {/* Origen */}
                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Potrero Origen</label>
                                <select 
                                    value={origenSel}
                                    onChange={(e) => setOrigenSel(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-xl font-black text-slate-800 outline-none focus:border-[#064E3B] appearance-none"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {lotes.map(l => (
                                        <option key={l.id_lote} value={l.id_lote}>{l.nombre.toUpperCase()}</option>
                                    ))}
                                </select>
                                
                                {origenSel && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                                        <span className="text-xs font-bold text-emerald-800 uppercase">Animales detectados</span>
                                        <span className="bg-[#064E3B] text-white px-3 py-1 rounded-full text-sm font-black tabular-nums">
                                            {animalesEnOrigen.length}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Destino */}
                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Potrero Destino</label>
                                <select 
                                    value={destinoSel}
                                    onChange={(e) => setDestinoSel(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-xl font-black text-slate-800 outline-none focus:border-[#064E3B] appearance-none"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {lotes.map(l => (
                                        <option key={l.id_lote} value={l.id_lote}>{l.nombre.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Botón Masivo */}
                        <button
                            onClick={handleRotarMasivo}
                            disabled={enviandoMasivo || !origenSel || !destinoSel || animalesEnOrigen.length === 0}
                            className={`w-full h-24 rounded-2xl text-2xl font-black uppercase tracking-wider shadow-lg transition-all mt-auto flex items-center justify-center gap-3 ${
                                enviandoMasivo || !origenSel || !destinoSel || animalesEnOrigen.length === 0
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200' 
                                    : 'bg-[#064E3B] hover:bg-[#043d2e] active:scale-[0.98] text-white ring-4 ring-[#064E3B]/10'
                            }`}
                        >
                            {enviandoMasivo ? (
                                <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-8 h-8 animate-spin"/> Moviendo Lote...</span>
                            ) : (
                                <><ArrowRightLeft className="w-8 h-8"/> Rotar Lote ({animalesEnOrigen.length})</>
                            )}
                        </button>
                    </div>
                )}

                {/* --- PESTAÑA: REZAGADOS (INDIVIDUAL) --- */}
                {activeTab === 'individual' && (
                    <div className="flex flex-col h-full space-y-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Mover Rezagado</h2>
                            <p className="text-slate-500 font-bold text-sm">Mueve un solo animal usando su número de chapeta.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                            {/* Input Chapeta */}
                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Número de Chapeta</label>
                                <input
                                    type="number"
                                    pattern="\d*"
                                    placeholder="Ej: 4592"
                                    value={chapetaInput}
                                    onChange={(e) => setChapetaInput(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-2xl font-black text-slate-800 outline-none focus:border-[#064E3B] uppercase tabular-nums"
                                />
                                
                                {chapetaInput.trim().length > 0 && (
                                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${animalFound ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                        {animalFound ? <CheckCircle className="w-6 h-6"/> : <UserCircle2 className="w-6 h-6"/>}
                                        <div>
                                            <p className="text-xs font-black uppercase">{animalFound ? 'Animal Encontrado' : 'No Encontrado'}</p>
                                            <p className="text-[10px] font-bold opacity-80">{animalFound ? `Actualmente en: ${lotes.find(l => Number(l.id_lote) === Number(animalFound.id_lote))?.nombre || 'General'}` : 'Verifique el número.'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Destino */}
                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Potrero Destino</label>
                                <select 
                                    value={destinoIndSel}
                                    onChange={(e) => setDestinoIndSel(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-xl font-black text-slate-800 outline-none focus:border-[#064E3B] appearance-none"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {lotes.map(l => (
                                        <option key={l.id_lote} value={l.id_lote}>{l.nombre.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Botón Individual */}
                        <button
                            onClick={handleMoverIndividual}
                            disabled={enviandoInd || !animalFound || !destinoIndSel}
                            className={`w-full h-24 rounded-2xl text-2xl font-black uppercase tracking-wider shadow-lg transition-all mt-auto flex items-center justify-center gap-3 ${
                                enviandoInd || !animalFound || !destinoIndSel
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200' 
                                    : 'bg-[#8CB33E] hover:bg-lime-600 active:scale-[0.98] text-white ring-4 ring-lime-600/10'
                            }`}
                        >
                            {enviandoInd ? (
                                <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-8 h-8 animate-spin"/> Moviendo...</span>
                            ) : (
                                <><ArrowRightLeft className="w-8 h-8"/> Mover Animal</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
