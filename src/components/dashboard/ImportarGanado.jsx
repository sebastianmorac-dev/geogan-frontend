import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../api/client';

export default function ImportarGanado({ fincaSel }) {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (selectedFile) => {
        if (!selectedFile.name.endsWith('.csv')) {
            alert("Solo se admiten archivos .csv");
            return;
        }
        setFile(selectedFile);
        setResult(null);
    };

    const onImport = async () => {
        if (!file || !fincaSel) return;
        setLoading(true);
        setResult(null);

        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const lines = text.split('\n');
                
                if (lines.length < 2) {
                    throw new Error("El archivo CSV está vacío o no tiene registros.");
                }

                // Obtener cabeceras (limpias)
                const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
                
                const registrosLimpios = [];

                // LECTURA Y LIMPIEZA DE DATOS
                for (let i = 1; i < lines.length; i++) {
                    const currentLine = lines[i].trim().replace(/\r$/, '');
                    if (!currentLine) continue; // Ignorar filas vacías

                    const values = currentLine.split(',');
                    const fila = {};
                    
                    headers.forEach((header, index) => {
                        fila[header] = values[index] ? values[index].trim() : '';
                    });

                    // Validar que exista la chapeta
                    if (!fila.codigo_identificacion) continue;

                    // Castear peso explícitamente a Número
                    if (fila.peso !== undefined && fila.peso !== '') {
                        fila.peso = Number(fila.peso);
                    }

                    registrosLimpios.push(fila);
                }

                if (registrosLimpios.length === 0) {
                    throw new Error("No se detectaron registros válidos tras la limpieza.");
                }

                // CONTRATO DE ENVÍO (POST)
                const payload = {
                    id_finca: fincaSel,
                    registros: registrosLimpios
                };

                const res = await api.post('/animales/importar/', payload);
                setResult({ success: true, message: `Importación completada. ${registrosLimpios.length} animales ingresados en estado EN TRÁNSITO.` });
                setFile(null);
            } catch (error) {
                console.error("Error procesando CSV:", error);
                setResult({ success: false, message: error.response?.data?.detail || error.message || "Error al procesar el archivo CSV." });
            } finally {
                setLoading(false);
            }
        };

        reader.onerror = () => {
            setLoading(false);
            setResult({ success: false, message: "Error al leer el archivo con FileReader." });
        };

        reader.readAsText(file);
    };

    return (
        <div className="animate-in fade-in duration-500 max-w-4xl mx-auto py-8">
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-12">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-[#11261F] mb-3">Importación SINIGÁN / ICA</h2>
                    <p className="text-slate-500 font-bold max-w-xl mx-auto">
                        Sube tu archivo CSV exportado desde SINIGÁN. Los animales serán pre-registrados en estado <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded uppercase text-[10px] tracking-widest font-black">EN TRÁNSITO</span> hasta su pesaje de ingreso.
                    </p>
                </div>

                <div 
                    className={`relative border-2 border-dashed rounded-[32px] p-12 text-center transition-all ${
                        dragActive ? 'border-[#064E3B] bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleChange}
                        className="hidden"
                    />
                    
                    {!file ? (
                        <div className="flex flex-col items-center pointer-events-none">
                            <UploadCloud className="w-16 h-16 text-slate-400 mb-6" />
                            <p className="text-xl font-black text-slate-700 mb-2">Arrastra tu archivo .CSV aquí</p>
                            <p className="text-sm font-bold text-slate-400 mb-8">o haz clic para explorar tus carpetas</p>
                            <button 
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="pointer-events-auto px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-600 font-black uppercase text-sm tracking-widest hover:border-[#064E3B] hover:text-[#064E3B] transition-all shadow-sm"
                            >
                                Seleccionar Archivo
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <FileSpreadsheet className="w-16 h-16 text-[#064E3B] mb-6" />
                            <p className="text-xl font-black text-[#064E3B] mb-2">{file.name}</p>
                            <p className="text-sm font-bold text-slate-500 mb-8">{(file.size / 1024).toFixed(2)} KB</p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setFile(null)}
                                    className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-500 font-black uppercase text-xs tracking-widest hover:border-red-300 hover:text-red-500 transition-all shadow-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={onImport}
                                    disabled={loading || !fincaSel}
                                    className="flex items-center gap-2 px-8 py-3 bg-[#064E3B] text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#043d2e] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                    {loading ? 'Procesando...' : 'Iniciar Importación'}
                                </button>
                            </div>
                            {!fincaSel && <p className="text-red-500 font-bold mt-4 text-xs">⚠️ Selecciona una finca activa en el panel superior.</p>}
                        </div>
                    )}
                </div>

                {result && (
                    <div className={`mt-8 p-6 rounded-2xl flex items-start gap-4 border ${result.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        {result.success ? <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />}
                        <div>
                            <p className={`font-black uppercase tracking-widest text-xs mb-1 ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>
                                {result.success ? 'Importación Exitosa' : 'Error en Importación'}
                            </p>
                            <p className={`font-bold text-sm ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                                {result.message}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
