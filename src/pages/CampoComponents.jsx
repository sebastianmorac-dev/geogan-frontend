import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { notifySuccess, notifyError, notifyWarning } from '../utils/notify';
import { Stethoscope, Wheat, CheckCircle, AlertTriangle, Loader2, Barcode } from 'lucide-react';

export const FlujoSanidad = ({ fincaSel, animales, setVista, onSuccess }) => {
    const [insumos, setInsumos] = useState([]);
    const [insumoSel, setInsumoSel] = useState('');
    const [dosisInput, setDosisInput] = useState('');
    
    const [chapetaInput, setChapetaInput] = useState('');
    const [animalFound, setAnimalFound] = useState(null);
    const [enviando, setEnviando] = useState(false);
    
    const chapetaRef = React.useRef(null);

    useEffect(() => {
        const cargarInsumos = async () => {
            try {
                const res = await api.get(`/insumos/?finca_id=${fincaSel}`);
                const medicinasRaw = (res.data || []).filter(i => i.tipo_insumo === 'Sanidad' && i.stock_actual_unidad > 0);
                
                // Filtrar duplicados por nombre
                const uniqueMedicinas = [];
                const seen = new Set();
                for (const m of medicinasRaw) {
                    const name = m.nombre_insumo.toLowerCase().trim();
                    if (!seen.has(name)) {
                        seen.add(name);
                        uniqueMedicinas.push(m);
                    } else {
                        // Si ya existe, sumar el stock
                        const existing = uniqueMedicinas.find(x => x.nombre_insumo.toLowerCase().trim() === name);
                        if (existing) {
                            existing.stock_actual_unidad = parseFloat(existing.stock_actual_unidad) + parseFloat(m.stock_actual_unidad);
                        }
                    }
                }
                setInsumos(uniqueMedicinas);
            } catch (error) { console.error(error); }
        };
        cargarInsumos();
        if (chapetaRef.current) chapetaRef.current.focus();
    }, [fincaSel]);

    useEffect(() => {
        if (chapetaInput.trim().length >= 2) {
            const found = animales.find(a => a.codigo_identificacion.toLowerCase() === chapetaInput.toLowerCase().trim());
            setAnimalFound(found || null);
        } else {
            setAnimalFound(null);
        }
    }, [chapetaInput, animales]);

    const handleChapetaKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (!animalFound && chapetaInput.trim().length > 0) {
                notifyWarning("⚠️ Chapeta no encontrada. Verifique el código.");
                setChapetaInput('');
            }
        }
    };

    const handleGuardar = async () => {
        if (!animalFound || !insumoSel || !dosisInput) {
            notifyWarning("Selecciona animal, medicina y escribe la dosis.");
            return;
        }

        const insumoObj = insumos.find(i => String(i.id_insumo) === String(insumoSel));
        
        setEnviando(true);
        try {
            await api.post(`/animales/${animalFound.id_animal}/salud`, {
                id_finca: parseInt(fincaSel),
                tipo_evento: 'Tratamiento Médico',
                id_insumo: insumoObj.id_insumo,
                producto: insumoObj.nombre_insumo,
                dosis: dosisInput + ' ml',
                fecha_aplicacion: new Date().toISOString().split('T')[0],
                dias_retiro: insumoObj.dias_retiro || 0,
                via_aplicacion: 'Intramuscular',
                costo_tratamiento: 0
            });

            notifySuccess(`✅ Tratamiento aplicado a ${animalFound.codigo_identificacion}.`);
            setChapetaInput('');
            setAnimalFound(null);
            if (onSuccess) onSuccess();
            setTimeout(() => { if (chapetaRef.current) chapetaRef.current.focus(); }, 50);
        } catch (error) {
            console.error(error);
            notifyError("❌ Error al guardar.");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <button onClick={() => setVista('menu')} className="text-sm font-black text-[#8CB33E] uppercase tracking-widest flex items-center gap-2">
                    ← Volver
                </button>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-100 flex-1 flex flex-col gap-6">
                <h2 className="text-xl font-black uppercase text-slate-800 flex justify-center items-center gap-3">
                    <Stethoscope className="w-8 h-8 text-blue-600" /> Sanidad Rápida
                </h2>

                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Medicina a Aplicar</label>
                    <select value={insumoSel} onChange={(e) => setInsumoSel(e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-800 outline-none">
                        <option value="">-- Seleccione Medicina --</option>
                        {insumos.map(i => {
                            const empaque = i.unidad_empaque || 'ml';
                            // Para sanidad, el stock se muestra directo, no lo dividimos por presentación
                            const stock_total = parseFloat(i.stock_actual_unidad).toFixed(1);
                            return (
                                <option key={i.id_insumo} value={i.id_insumo}>{i.nombre_insumo} (Quedan: {stock_total} {empaque})</option>
                            );
                        })}
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Escáner de Chapeta</label>
                    <div className="relative">
                        <input
                            ref={chapetaRef}
                            type="text"
                            placeholder="Escanea el código..."
                            value={chapetaInput}
                            onChange={(e) => setChapetaInput(e.target.value)}
                            onKeyDown={handleChapetaKeyDown}
                            className={`w-full bg-slate-50 border-2 rounded-2xl p-5 text-2xl font-black outline-none uppercase ${chapetaInput.length > 0 ? (animalFound ? 'border-blue-400 text-blue-800 bg-blue-50/30' : 'border-red-400 text-red-600') : 'border-slate-200'}`}
                        />
                        <Barcode className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 w-8 h-8" />
                    </div>
                    {animalFound && <p className="text-blue-600 text-sm font-bold mt-2 ml-1 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> {animalFound.codigo_identificacion} listo</p>}
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Dosis (ml o unid)</label>
                    <input
                        type="number"
                        placeholder="Ej: 5"
                        value={dosisInput}
                        onChange={(e) => setDosisInput(e.target.value)}
                        className="w-full border-2 rounded-2xl p-5 text-center text-4xl font-black outline-none bg-slate-50 border-slate-200 focus:border-blue-400"
                    />
                </div>

                <button
                    onClick={handleGuardar}
                    disabled={enviando || !animalFound || !insumoSel || !dosisInput}
                    className={`w-full h-20 rounded-2xl text-xl font-black uppercase tracking-wider shadow-lg mt-auto flex items-center justify-center gap-3 ${enviando || !animalFound || !insumoSel || !dosisInput ? 'bg-slate-100 text-slate-400 border-2 border-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 ring-4 ring-blue-600/10'}`}
                >
                    {enviando ? <span className="flex items-center gap-2"><Loader2 className="w-6 h-6 animate-spin"/> Procesando...</span> : <><CheckCircle className="w-8 h-8"/> Aplicar Tratamiento</>}
                </button>
            </div>
        </div>
    );
};

export const FlujoNutricion = ({ fincaSel, setVista, onSuccess }) => {
    const [insumos, setInsumos] = useState([]);
    const [lotes, setLotes] = useState([]);
    const [insumoSel, setInsumoSel] = useState('');
    const [loteSel, setLoteSel] = useState('');
    const [cantidadInput, setCantidadInput] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const resInsumos = await api.get(`/insumos/?finca_id=${fincaSel}`);
                const nutricionRaw = (resInsumos.data || []).filter(i => (i.tipo_insumo === 'Nutrición' || i.tipo_insumo === 'Nutricion' || i.tipo_insumo === 'Sal') && i.stock_actual_unidad > 0);
                
                // Filtrar duplicados por nombre
                const uniqueNutricion = [];
                const seenNutri = new Set();
                for (const m of nutricionRaw) {
                    const name = m.nombre_insumo.toLowerCase().trim();
                    if (!seenNutri.has(name)) {
                        seenNutri.add(name);
                        uniqueNutricion.push(m);
                    } else {
                        const existing = uniqueNutricion.find(x => x.nombre_insumo.toLowerCase().trim() === name);
                        if (existing) {
                            existing.stock_actual_unidad = parseFloat(existing.stock_actual_unidad) + parseFloat(m.stock_actual_unidad);
                        }
                    }
                }
                setInsumos(uniqueNutricion);
                
                const resLotes = await api.get(`/lotes/finca/${fincaSel}`);
                setLotes(resLotes.data || []);
            } catch (error) { console.error(error); }
        };
        cargarDatos();
    }, [fincaSel]);

    const handleGuardar = async () => {
        if (!insumoSel || !loteSel || !cantidadInput) {
            notifyWarning("Completa todos los campos.");
            return;
        }

        const loteObj = lotes.find(l => String(l.id_lote) === String(loteSel));
        
        const insumoObj = insumos.find(i => String(i.id_insumo) === String(insumoSel));
        const medida = insumoObj?.medida_empaque_numeric || 1.0;
        const cantidad_convertida = parseFloat(cantidadInput) * medida;

        setEnviando(true);
        try {
            await api.post(`/insumos/suministro-lote`, {
                id_finca: parseInt(fincaSel),
                id_insumo: parseInt(insumoSel),
                id_lote: loteObj.nombre,
                cantidad_unidad: cantidad_convertida,
            });

            notifySuccess(`✅ Alimento suministrado al lote ${loteObj.nombre}.`);
            setCantidadInput('');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            notifyError("❌ Error al guardar.");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <button onClick={() => setVista('menu')} className="text-sm font-black text-[#8CB33E] uppercase tracking-widest flex items-center gap-2">
                    ← Volver
                </button>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-100 flex-1 flex flex-col gap-6">
                <h2 className="text-xl font-black uppercase text-slate-800 flex justify-center items-center gap-3">
                    <Wheat className="w-8 h-8 text-amber-500" /> Suministro de Alimento
                </h2>

                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Producto a Suministrar</label>
                    <select value={insumoSel} onChange={(e) => setInsumoSel(e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-800 outline-none">
                        <option value="">-- Seleccione Alimento --</option>
                        {insumos.map(i => {
                            const medida = i.medida_empaque_numeric || 1;
                            const stock_bultos = (i.stock_actual_unidad / medida).toFixed(1);
                            const empaque = i.unidad_empaque || 'kg';
                            return (
                                <option key={i.id_insumo} value={i.id_insumo}>{i.nombre_insumo} (Quedan: {stock_bultos} {empaque}s)</option>
                            );
                        })}
                    </select>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Lote / Potrero de Destino</label>
                    <select value={loteSel} onChange={(e) => setLoteSel(e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-800 outline-none">
                        <option value="">-- Seleccione Potrero --</option>
                        {lotes.map(l => <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>)}
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Cantidad (Bultos/Bloques)</label>
                    <input
                        type="number"
                        step="0.5"
                        placeholder="Ej: 2.5"
                        value={cantidadInput}
                        onChange={(e) => setCantidadInput(e.target.value)}
                        className="w-full border-2 rounded-2xl p-5 text-center text-4xl font-black outline-none bg-slate-50 border-slate-200 focus:border-amber-400"
                    />
                </div>

                <button
                    onClick={handleGuardar}
                    disabled={enviando || !insumoSel || !loteSel || !cantidadInput}
                    className={`w-full h-20 rounded-2xl text-xl font-black uppercase tracking-wider shadow-lg mt-auto flex items-center justify-center gap-3 ${enviando || !insumoSel || !loteSel || !cantidadInput ? 'bg-slate-100 text-slate-400 border-2 border-slate-200' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 ring-4 ring-amber-500/10'}`}
                >
                    {enviando ? <span className="flex items-center gap-2"><Loader2 className="w-6 h-6 animate-spin"/> Procesando...</span> : <><CheckCircle className="w-8 h-8"/> Alimentar</>}
                </button>
            </div>
        </div>
    );
};
