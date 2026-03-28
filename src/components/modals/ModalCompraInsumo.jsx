import React, { useState } from 'react';
import api from '../../api/client'; // Asegúrate de que esta ruta apunte a tu configuracion de Axios

export default function ModalCompraInsumo({ isOpen, onClose, idFinca, insumosDisponibles, onCompraGuardada }) {
    // Estados del formulario
    const [idInsumo, setIdInsumo] = useState('');
    const [cantidadBultos, setCantidadBultos] = useState('');
    const [pesoBulto, setPesoBulto] = useState(40); // 40kg es el estándar en Colombia
    const [precioBulto, setPrecioBulto] = useState('');
    const [fleteTotal, setFleteTotal] = useState('');
    const [cargando, setCargando] = useState(false);

    if (!isOpen) return null;

    // --- Empatía Ganadera: Cálculos en Tiempo Real ---
    const bultos = parseFloat(cantidadBultos) || 0;
    const precioUnitario = parseFloat(precioBulto) || 0;
    const flete = parseFloat(fleteTotal) || 0;
    
    const kilosTotales = bultos * pesoBulto;
    const subtotal = bultos * precioUnitario;
    const totalPagar = subtotal + flete;
    
    // Si hay kilos, calculamos el costo real. Si no, es 0 para evitar errores (NaN)
    const costoPorKilo = kilosTotales > 0 ? (totalPagar / kilosTotales) : 0;

    const handleGuardar = async (e) => {
        e.preventDefault();
        setCargando(true);

        try {
            // El payload exacto alineado 100% con la API de Sebas
            const payload = {
                id_insumo: parseInt(idInsumo),
                cantidad_bultos: parseInt(cantidadBultos), // El backend exige int
                peso_bulto_kg: parseFloat(pesoBulto),      // El backend exige float
                precio_bulto_neto: parseFloat(precioBulto), // El backend exige float
                costo_flete_total: parseFloat(fleteTotal) || 0 // Opcional, por defecto 0
                // Nota: Omitimos fecha_compra para que el backend use la de hoy por defecto
            };

            // Llamada al endpoint exacto
            await api.post('/insumos/compra', payload);
            
            // Refrescamos la tabla de la vista principal y cerramos el modal
            onCompraGuardada();
            onClose();
            
            // Opcional: Limpiar el formulario para la próxima vez
            setIdInsumo('');
            setCantidadBultos('');
            setPrecioBulto('');
            setFleteTotal('');
            
        } catch (error) {
            console.error("Error registrando compra:", error);
            alert("No se pudo guardar la compra. Revisa la consola o la pestaña Network.");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1a1d24] border border-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-1">Registrar Ingreso a Bodega</h2>
                <p className="text-gray-400 text-sm mb-6">Calcularemos el costo real (CPP) incluyendo fletes.</p>

                <form onSubmit={handleGuardar} className="space-y-4">
                    {/* Selector de Insumo */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Insumo / Producto</label>
                        <select 
                            required
                            value={idInsumo}
                            onChange={(e) => setIdInsumo(e.target.value)}
                            className="w-full bg-black/30 border border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Selecciona un insumo...</option>
                            {insumosDisponibles?.map(insumo => (
                                <option key={insumo.id_insumo} value={insumo.id_insumo}>
                                    {insumo.nombre_insumo} (Stock actual: {insumo.stock_actual_kg} kg)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fila: Cantidad y Precio */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Cant. Bultos</label>
                            <input
                                required type="number" min="1" step="any"
                                value={cantidadBultos} onChange={(e) => setCantidadBultos(e.target.value)}
                                className="w-full bg-black/30 border border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej. 50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Precio x Bulto ($)</label>
                            <input
                                required type="number" min="1" step="any"
                                value={precioBulto} onChange={(e) => setPrecioBulto(e.target.value)}
                                className="w-full bg-black/30 border border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej. 85000"
                            />
                        </div>
                    </div>

                    {/* Flete (El dolor de cabeza real) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Costo Flete Total ($) - Opcional</label>
                        <input
                            type="number" min="0" step="any"
                            value={fleteTotal} onChange={(e) => setFleteTotal(e.target.value)}
                            className="w-full bg-black/30 border border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej. 120000"
                        />
                    </div>

                    {/* Mini Calculadora Pasiva (UX/UI) */}
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">Total a Pagar (Factura + Flete):</span>
                            <span className="text-white font-bold text-lg">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPagar)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-blue-500/20 pt-2">
                            <span className="text-blue-400 text-xs">💡 Costo real por Kg puesto en finca:</span>
                            <span className="text-blue-400 font-bold text-sm">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(costoPorKilo)} / Kg
                            </span>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors font-medium">
                            Cancelar
                        </button>
                        <button type="submit" disabled={cargando} className="flex-1 py-3 px-4 rounded-lg font-bold bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 transition-colors">
                            {cargando ? 'Guardando...' : 'Registrar Compra'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
