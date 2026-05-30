import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle, AlertTriangle, X } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';
import { notifyError, notifySuccess } from '../../utils/notify';

export default function ImportPesajeModal({ isOpen, onClose, fincaSel, onImportSuccess }) {
    const { user } = useAuthStore();
    const [file, setFile] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [previewData, setPreviewData] = useState([]);
    
    // Mapeo de columnas
    const [colChapeta, setColChapeta] = useState('');
    const [colPeso, setColPeso] = useState('');
    
    // Estado de carga
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    
    // Estado de resultados
    const [results, setResults] = useState(null);

    const handleFileDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
        if (droppedFile && droppedFile.name.toLowerCase().endsWith('.csv')) {
            processFile(droppedFile);
        } else {
            notifyError("Solo se permiten archivos .csv");
        }
    };

    const processFile = (file) => {
        setFile(file);
        setResults(null);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (parsed) => {
                if (parsed.data.length > 0) {
                    const fileHeaders = Object.keys(parsed.data[0]);
                    setHeaders(fileHeaders);
                    setPreviewData(parsed.data.slice(0, 3));
                    
                    // Auto-detectar columnas comunes
                    const foundChapeta = fileHeaders.find(h => h.toLowerCase().includes('chapeta') || h.toLowerCase().includes('id') || h.toLowerCase().includes('codigo'));
                    const foundPeso = fileHeaders.find(h => h.toLowerCase().includes('peso') || h.toLowerCase().includes('kg'));
                    
                    if (foundChapeta) setColChapeta(foundChapeta);
                    if (foundPeso) setColPeso(foundPeso);
                } else {
                    notifyError("El archivo CSV está vacío.");
                    resetState();
                }
            },
            error: (err) => {
                console.error(err);
                notifyError("Error al leer el archivo CSV.");
            }
        });
    };

    const resetState = () => {
        setFile(null);
        setHeaders([]);
        setPreviewData([]);
        setColChapeta('');
        setColPeso('');
        setIsUploading(false);
        setProgress(0);
        setResults(null);
    };

    const handleImportar = async () => {
        if (!colChapeta || !colPeso) {
            notifyError("Debes seleccionar las columnas de Chapeta y Peso.");
            return;
        }

        setIsUploading(true);
        setProgress(10);
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (parsed) => {
                setProgress(30);
                // Preparar payload
                const registros = parsed.data.map(row => {
                    const rawPeso = parseFloat(row[colPeso]);
                    return {
                        id_excel: String(row[colChapeta]).trim(),
                        peso: isNaN(rawPeso) ? 0 : rawPeso,
                        fecha: new Date().toISOString().split('T')[0] // Asumimos hoy si no hay fecha en el CSV
                    };
                }).filter(r => r.id_excel && r.peso > 0);

                if (registros.length === 0) {
                    notifyError("No se encontraron registros válidos para importar.");
                    setIsUploading(false);
                    return;
                }

                setProgress(50);

                try {
                    const payload = {
                        id_finca: fincaSel,
                        id_usuario: user.id_usuario,
                        fuente: "IMPORTACION_CSV",
                        registros: registros
                    };

                    const response = await api.post('/animales/pesaje-lote', payload);
                    setProgress(100);
                    setResults(response.data);
                    notifySuccess("Proceso de importación finalizado");
                    if (onImportSuccess) onImportSuccess();
                } catch (error) {
                    console.error("Error importando lote:", error);
                    notifyError(error.response?.data?.detail || "Error al importar los registros");
                    setProgress(0);
                } finally {
                    setIsUploading(false);
                }
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#064E3B] p-6 text-white flex justify-between items-center">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <UploadCloud className="w-6 h-6" /> Importación Masiva (CSV)
                    </h2>
                    <button onClick={onClose} disabled={isUploading} className="text-white/70 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Pantalla 1: Drag & Drop */}
                    {!file && !results && (
                        <div 
                            className="border-4 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 hover:border-[#8CB33E] transition-all cursor-pointer"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            onClick={() => document.getElementById('csvUpload').click()}
                        >
                            <UploadCloud className="w-16 h-16 text-slate-400 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">Haz clic o arrastra tu archivo CSV aquí</h3>
                            <p className="text-sm text-slate-500 mt-2">Formatos aceptados: .csv</p>
                            <input 
                                id="csvUpload" 
                                type="file" 
                                accept=".csv" 
                                className="hidden" 
                                onChange={handleFileDrop} 
                            />
                        </div>
                    )}

                    {/* Pantalla 2: Mapeo y Progreso */}
                    {file && !results && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                                <span className="font-bold text-emerald-800">{file.name}</span>
                                <button onClick={resetState} disabled={isUploading} className="text-xs text-red-600 font-bold hover:underline">
                                    Cambiar Archivo
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase block mb-2">Columna Chapeta</label>
                                    <select 
                                        value={colChapeta} 
                                        onChange={e => setColChapeta(e.target.value)}
                                        disabled={isUploading}
                                        className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white font-bold text-slate-700 outline-none focus:border-[#8CB33E]"
                                    >
                                        <option value="">Selecciona...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase block mb-2">Columna Peso</label>
                                    <select 
                                        value={colPeso} 
                                        onChange={e => setColPeso(e.target.value)}
                                        disabled={isUploading}
                                        className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white font-bold text-slate-700 outline-none focus:border-[#8CB33E]"
                                    >
                                        <option value="">Selecciona...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Preview Table */}
                            {previewData.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-100 p-2 text-xs font-bold text-slate-500 uppercase text-center border-b border-slate-200">
                                        Vista Previa (3 primeras filas)
                                    </div>
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="p-3">Chapeta ({colChapeta || '?'})</th>
                                                <th className="p-3">Peso ({colPeso || '?'})</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, i) => (
                                                <tr key={i} className="border-b border-slate-100 last:border-0">
                                                    <td className="p-3 font-mono">{row[colChapeta] || '-'}</td>
                                                    <td className="p-3">{row[colPeso] || '-'} kg</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Acciones & Progreso */}
                            {isUploading ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>Procesando...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#8CB33E] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleImportar}
                                    className="w-full bg-[#064E3B] text-white p-4 rounded-xl font-black uppercase flex justify-center items-center gap-2 hover:bg-[#064E3B]/90 transition-colors"
                                >
                                    <UploadCloud className="w-5 h-5" /> Iniciar Importación Masiva
                                </button>
                            )}
                        </div>
                    )}

                    {/* Pantalla 3: Resultados */}
                    {results && (
                        <div className="space-y-6 animate-in zoom-in duration-500">
                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">¡Importación Completada!</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
                                    <span className="block text-4xl font-black text-emerald-600">{results.procesados}</span>
                                    <span className="text-xs font-bold text-emerald-800 uppercase">Éxitosos</span>
                                </div>
                                <div className={`border p-6 rounded-2xl text-center ${results.no_encontrados?.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className={`block text-4xl font-black ${results.no_encontrados?.length > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                        {results.no_encontrados?.length || 0}
                                    </span>
                                    <span className={`text-xs font-bold uppercase ${results.no_encontrados?.length > 0 ? 'text-red-800' : 'text-slate-500'}`}>
                                        Fallidos
                                    </span>
                                </div>

                                {/* Idempotency Warning Block */}
                                {results.duplicados > 0 && (
                                    <div className="col-span-2 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center flex justify-between items-center animate-in fade-in duration-500">
                                        <div className="text-left">
                                            <span className="block text-lg font-black text-amber-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Registros Duplicados</span>
                                            <span className="text-xs font-bold text-amber-800 uppercase">Ignorados para evitar doble pesaje hoy</span>
                                        </div>
                                        <span className="text-3xl font-black text-amber-600">{results.duplicados}</span>
                                    </div>
                                )}
                            </div>

                            {results.no_encontrados?.length > 0 && (
                                <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-red-50 p-3 text-xs font-bold text-red-800 uppercase flex items-center gap-2 border-b border-red-200">
                                        <AlertTriangle className="w-4 h-4" /> Chapetas no encontradas
                                    </div>
                                    <div className="p-4 max-h-40 overflow-y-auto">
                                        <div className="flex flex-wrap gap-2">
                                            {results.no_encontrados.map(id => (
                                                <span key={id} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-mono font-bold">
                                                    {id}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={() => { resetState(); onClose(); }}
                                className="w-full bg-slate-200 text-slate-800 p-4 rounded-xl font-black uppercase hover:bg-slate-300 transition-colors"
                            >
                                Finalizar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
