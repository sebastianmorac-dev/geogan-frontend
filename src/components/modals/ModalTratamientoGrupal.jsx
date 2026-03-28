// src/components/modals/ModalTratamientoGrupal.jsx
import React, { useState, useEffect } from 'react';
import ModalOverlay from './ModalOverlay';
import api from '../../api/client';

export default function ModalTratamientoGrupal({ isOpen, onClose, loteActual, onGuardar }) {
    const [medicamentosBodega, setMedicamentosBodega] = useState([]);

    // 1. CARGA DE MEDICAMENTOS DESDE LA BODEGA (Solo Sanidad)
    useEffect(() => {
        if (!isOpen) return;
        const cargarMedicamentos = async () => {
            try {
                const response = await api.get('/insumos/');
                // Filtramos SOLO los que son de Sanidad y están activos
                const medicinas = response.data.filter(
                    insumo => insumo.tipo_insumo === 'Sanidad' && insumo.estado === 'activo'
                );
                setMedicamentosBodega(medicinas);
            } catch (error) {
                console.error("Error cargando la bodega:", error);
            }
        };
        cargarMedicamentos();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <ModalOverlay isOpen={isOpen} onClose={onClose} title="TRATAMIENTO GRUPAL" maxWidth="lg">
            <form onSubmit={onGuardar} className="space-y-6">

                {/* LÓGICA DEL EMBUDO GEOGAN */}
                <div className="bg-[#11261F] text-white p-5 rounded-3xl flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-black text-[#8CB33E] uppercase tracking-widest mb-1">Lote a Tratar</p>

                        {/* Si venimos del Lote, lo bloqueamos. Si no, le pedimos que elija */}
                        {loteActual ? (
                            <h3 className="text-xl font-black uppercase tracking-tight">{loteActual.nombre || 'INVENTARIO GENERAL'}</h3>
                        ) : (
                            <select name="id_lote" className="bg-transparent text-xl font-black focus:ring-0 cursor-pointer outline-none">
                                <option value="">SELECCIONA UN LOTE</option>
                                {/* Aquí mapearías todos los lotes si estuvieras en la vista Macro */}
                            </select>
                        )}
                    </div>
                    <div className="text-right">
                        {/* Usamos el dato real del lote */}
                        <p className="text-3xl font-black tabular-nums">{loteActual ? (loteActual.cabezas_reales || loteActual.cantidad_animales || 0) : '0'}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Cabezas</p>
                    </div>
                </div>

                {/* TIPO DE EVENTO SANITARIO */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tipo de Evento</label>
                    <select name="tipo_evento" required
                        className="w-full bg-[#F4F6F4] border-2 border-transparent rounded-2xl p-4 text-sm font-black outline-none focus:border-[#8CB33E] transition-colors">
                        <option value="">-- Selecciona el tipo --</option>
                        <option value="Vacunación">Vacunación</option>
                        <option value="Desparasitación">Desparasitación</option>
                        <option value="Tratamiento Médico">Tratamiento Médico</option>
                        <option value="Control">Control</option>
                    </select>
                </div>

                {/* PRODUCTO SANITARIO - AI-READY (Viene de la Bodega) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Producto Sanitario (De la Bodega)</label>
                    <select name="medicamento" required
                        className="w-full bg-[#F4F6F4] border-2 border-transparent rounded-2xl p-4 text-sm font-black outline-none focus:border-[#8CB33E] transition-colors">
                        <option value="">-- Selecciona un medicamento disponible --</option>
                        {medicamentosBodega.map(med => (
                            <option key={med.id_insumo} value={med.nombre_insumo}>
                                {med.nombre_insumo} (Disponible: {med.stock_actual_unidad} {med.unidad_empaque})
                            </option>
                        ))}
                    </select>
                </div>

                {/* DOSIS Y VÍA DE APLICACIÓN */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Dosis por Animal</label>
                        <input type="text" name="dosis" required placeholder="Ej: 15 ml, 2 cc, 1 pastilla"
                            className="w-full bg-[#F4F6F4] border-2 border-transparent rounded-2xl p-4 text-sm font-black outline-none focus:border-[#8CB33E] transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Vía de Aplicación</label>
                        <select name="via_aplicacion" required
                            className="w-full bg-[#F4F6F4] border-2 border-transparent rounded-2xl p-4 text-sm font-black outline-none focus:border-[#8CB33E] transition-colors">
                            <option value="">-- Selecciona --</option>
                            <option value="Intramuscular">Intramuscular (IM)</option>
                            <option value="Subcutánea">Subcutánea (SC)</option>
                            <option value="Intravenosa">Intravenosa (IV)</option>
                            <option value="Oral">Oral</option>
                            <option value="Tópica">Tópica</option>
                        </select>
                    </div>
                </div>

                {/* DÍAS DE RETIRO */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Días de Retiro (0 si no aplica)</label>
                    <input type="number" name="dias_retiro" min="0" defaultValue="0" placeholder="Ej: 28"
                        className="w-full bg-[#F4F6F4] border-2 border-transparent rounded-2xl p-4 text-sm font-black outline-none focus:border-[#8CB33E] transition-colors" />
                </div>

                {/* OBSERVACIONES */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Observaciones (Opcional)</label>
                    <textarea name="observaciones" rows="2" placeholder="Ej: Aplicación preventiva por temporada de lluvias"
                        className="w-full bg-[#F4F6F4] border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#8CB33E] transition-colors resize-none" />
                </div>

                {/* ALERTA UX EMPÁTICA */}
                {loteActual && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <span className="text-xl">⚠️</span>
                        <p className="text-xs font-bold text-amber-800 leading-relaxed">
                            Al guardar, se registrará el tratamiento en el historial clínico de <strong>todos los {loteActual.cabezas_reales || loteActual.cantidad_animales || 0} animales</strong> de este lote. Esta acción no se puede deshacer.
                        </p>
                    </div>
                )}

                {/* BOTONES */}
                <button type="submit" className="w-full bg-[#11261F] text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#8CB33E] transition-all">
                    Guardar Tratamiento Grupal
                </button>
                <button type="button" onClick={onClose} className="w-full text-xs font-black uppercase text-gray-400 mt-2 hover:text-[#11261F] transition-colors">
                    Cancelar
                </button>
            </form>
        </ModalOverlay>
    );
}
