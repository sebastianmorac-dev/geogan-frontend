import React, { useState, useEffect } from 'react';
import api from '../../api/client';

const ModalAjustarPrecio = ({ isOpen, onClose, precioActual, idFinca, onActualizado }) => {
    const [nuevoPrecio, setNuevoPrecio] = useState(precioActual);
    const [cargando, setCargando] = useState(false);

    // Sincronizar el estado cuando se abre el modal
    useEffect(() => {
        setNuevoPrecio(precioActual);
    }, [precioActual, isOpen]);

    if (!isOpen) return null;

    const handleGuardar = async () => {
        setCargando(true);
        try {
            await api.put(`/fincas/${idFinca}/parametros`, {
                precio_base_venta_kg: parseFloat(nuevoPrecio)
            });
            
            // Notificar al Dashboard
            onActualizado(parseFloat(nuevoPrecio));
            onClose();
        } catch (error) {
            console.error("Error al actualizar precio:", error);
            alert("No se pudo guardar el precio. Revisa la consola o tu rol.");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#11261F] border border-[#8CB33E]/20 w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <h2 className="text-2xl font-black text-white uppercase mb-2">Ajustar Precio de Mercado</h2>
                <p className="text-gray-400 text-sm mb-8 font-medium">
                    Este valor en <span className="text-[#8CB33E]">COP</span> se usará para calcular el valor total de tu inventario en el Dashboard.
                </p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 tracking-widest uppercase mb-2 ml-2">
                            Precio por Kg (COP)
                        </label>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={nuevoPrecio}
                            onChange={(e) => setNuevoPrecio(e.target.value)}
                            className="w-full bg-[#F4F6F4]/10 border border-[#8CB33E]/30 rounded-2xl p-5 text-white text-3xl font-black outline-none focus:border-[#8CB33E] transition-all text-center"
                            placeholder="Ej. 8500"
                        />
                    </div>

                    <div className="bg-[#8CB33E]/10 border border-[#8CB33E]/30 rounded-2xl p-4">
                        <p className="text-[#8CB33E] text-xs font-bold leading-relaxed text-center">
                            💡 Con este precio, el valor estimado de tu lote se actualizará automáticamente y recalcularemos tus activos productivos.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-8">
                    <button
                        onClick={handleGuardar}
                        disabled={cargando}
                        className={`w-full py-5 rounded-2xl font-black uppercase shadow-md transition-all ${
                            cargando ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-[#8CB33E] text-white hover:bg-[#7a9d35]'
                        }`}
                    >
                        {cargando ? 'Guardando...' : 'Actualizar Precio'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-xs font-black uppercase text-gray-400 hover:text-white transition-colors text-center py-2"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalAjustarPrecio;
