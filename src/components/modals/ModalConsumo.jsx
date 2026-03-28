// src/components/modals/ModalConsumo.jsx
import React, { useState } from 'react';
import ModalOverlay from './ModalOverlay';

export default function ModalConsumo({ isOpen, onClose, insumosBodega, lotes, onGuardar, preselectedLote }) {
    const [consumoData, setConsumoData] = useState({
        id_insumo: '',
        cantidad: '',
        destino_tipo: 'lote', // 'lote' o 'animal'
        id_destino: '', // El ID del lote o del animal
        notas: '',
        // Nuevos campos clínicos:
        dias_retiro: 0,
        via_aplicacion: '',
        motivo: ''
    });

    React.useEffect(() => {
        if (isOpen) {
            setConsumoData(prev => ({
                ...prev,
                destino_tipo: preselectedLote ? 'lote' : 'lote',
                id_destino: preselectedLote || ''
            }));
        }
    }, [isOpen, preselectedLote]);

    // Detección Inteligente de Medicamentos
    const insumoSeleccionado = insumosBodega.find(i => i.id_insumo === parseInt(consumoData.id_insumo));
    const esMedicina = insumoSeleccionado?.tipo_insumo?.toLowerCase().includes('sanidad') 
                    || insumoSeleccionado?.tipo_insumo?.toLowerCase().includes('medicamento');

    const handleSubir = () => {
        onGuardar(consumoData);
        // Limpiamos después de enviar
        setConsumoData({ id_insumo: '', cantidad: '', destino_tipo: 'lote', id_destino: '', notas: '', dias_retiro: 0, via_aplicacion: '', motivo: '' });
    };

    return (
        <ModalOverlay isOpen={isOpen} onClose={onClose} title="REGISTRAR CONSUMO / SANIDAD" maxWidth="lg">
            <div className="space-y-5">
                {/* 1. ¿QUÉ SALIÓ DE BODEGA? */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Producto a descontar</label>
                    <select className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-2xl p-4 font-black text-sm outline-none"
                        value={consumoData.id_insumo} onChange={(e) => setConsumoData({...consumoData, id_insumo: e.target.value})}>
                        <option value="">-- Selecciona el Insumo --</option>
                        {insumosBodega.map(i => (
                            <option key={i.id_insumo} value={i.id_insumo}>
                                {i.nombre_insumo.toUpperCase()} (Stock: {i.stock_actual_kg} kg)
                            </option>
                        ))}
                    </select>
                </div>

                {/* 2. ¿CUÁNTO SACÓ? */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Cantidad Aplicada/Suministrada</label>
                    <input type="number" placeholder="Ej: 5 (Dosis, Kg, ml)" min="0.1" step="any"
                        className="w-full bg-[#F4F6F4] border border-[#E6F4D7] rounded-xl p-4 font-black outline-none"
                        value={consumoData.cantidad} onChange={(e) => setConsumoData({...consumoData, cantidad: e.target.value})} />
                </div>

                {/* 3. ¿A QUIÉN SE LO DIO? (Lógica Híbrida) */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase mb-2 block">¿A quién se le aplicó?</label>
                    <div className="flex gap-4 mb-3">
                        <button className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${consumoData.destino_tipo === 'lote' ? 'bg-[#11261F] text-white' : 'bg-gray-200 text-gray-500'}`}
                            onClick={() => setConsumoData({...consumoData, destino_tipo: 'lote', id_destino: ''})}>
                            A un Lote (Grupo)
                        </button>
                        <button className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${consumoData.destino_tipo === 'animal' ? 'bg-[#11261F] text-white' : 'bg-gray-200 text-gray-500'}`}
                            onClick={() => setConsumoData({...consumoData, destino_tipo: 'animal', id_destino: ''})}>
                            A un Animal
                        </button>
                    </div>

                    {consumoData.destino_tipo === 'lote' ? (
                        <select className="w-full bg-white border border-gray-200 rounded-xl p-3 font-bold text-sm outline-none"
                            value={consumoData.id_destino} onChange={(e) => setConsumoData({...consumoData, id_destino: e.target.value})}>
                            <option value="">-- Selecciona el Lote --</option>
                            {lotes.map(lote => (
                                <option key={lote.id_lote || 'general'} value={lote.id_lote || 'general'}>
                                    {lote.nombre} ({lote.cabezas_reales || 0} cabezas)
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input type="text" placeholder="Ej: Chapeta 1045" 
                            className="w-full bg-white border border-gray-200 rounded-xl p-3 font-bold text-sm outline-none"
                            value={consumoData.id_destino} onChange={(e) => setConsumoData({...consumoData, id_destino: e.target.value})} />
                    )}
                </div>

                {esMedicina && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-3 mt-4">
                        <h4 className="text-xs font-black text-red-600 uppercase mb-2">📋 Datos Clínicos Requeridos</h4>
                        
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Vía Aplicación</label>
                                <select className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm outline-none"
                                    value={consumoData.via_aplicacion} onChange={e => setConsumoData({...consumoData, via_aplicacion: e.target.value})}>
                                    <option value="">Seleccione...</option>
                                    <option value="Intramuscular">Intramuscular (IM)</option>
                                    <option value="Subcutánea">Subcutánea (SC)</option>
                                    <option value="Oral">Oral</option>
                                    <option value="Tópica">Tópica</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Días de Retiro</label>
                                <input type="number" min="0" placeholder="Ej: 28" 
                                    className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm outline-none"
                                    value={consumoData.dias_retiro} onChange={e => setConsumoData({...consumoData, dias_retiro: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Motivo (Opcional)</label>
                            <input type="text" placeholder="Ej: Control de parásitos" 
                                className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm outline-none"
                                value={consumoData.motivo} onChange={e => setConsumoData({...consumoData, motivo: e.target.value})} />
                        </div>
                    </div>
                )}

                {/* BOTONES */}
                <button onClick={handleSubir} className="w-full bg-[#8CB33E] text-white py-5 rounded-2xl font-black uppercase shadow-lg hover:bg-[#11261F] transition-all mt-4">
                    REGISTRAR SALIDA
                </button>
                <button onClick={onClose} className="w-full text-xs font-black uppercase text-gray-400 mt-2 hover:text-[#11261F]">
                    CANCELAR
                </button>
            </div>
        </ModalOverlay>
    );
}
