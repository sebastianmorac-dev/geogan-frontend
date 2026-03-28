import React, { useState, useEffect } from 'react';
import api from '../api/client'; // Ajusta la ruta a tu cliente Axios
import ModalCompraInsumo from '../components/modals/ModalCompraInsumo'; // Ajusta la ruta

export default function BodegaPage() {
    // --- ESTADOS ---
    const [insumos, setInsumos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [isModalCompraOpen, setIsModalCompraOpen] = useState(false);

    // TODO: En tu app real, este ID viene de tu authStore o del selector de fincas
    const idFinca = 1; 

    // --- CARGA DE DATOS ---
    const cargarInventario = async () => {
        try {
            setCargando(true);
            // Petición exacta según la arquitectura del Backend (Query Params)
            const response = await api.get('/insumos/', {
                params: { finca_id: idFinca }
            });
            setInsumos(response.data);
        } catch (error) {
            console.error("Error al cargar la bodega:", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarInventario();
    }, [idFinca]);

    // --- KPIs FINANCIEROS (Empatía Ganadera) ---
    // 1. ¿Cuánta plata hay en la bodega?
    const capitalTotal = insumos.reduce((total, insumo) => {
        return total + (parseFloat(insumo.stock_actual_kg) * parseFloat(insumo.costo_promedio_kg));
    }, 0);

    // 2. Alertas de escasez
    const insumosCriticos = insumos.filter(insumo => 
        parseFloat(insumo.stock_actual_kg) <= parseFloat(insumo.punto_critico_kg)
    ).length;

    return (
        <div className="p-6 max-w-7xl mx-auto text-white">
            {/* ENCABEZADO Y ACCIONES */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Bodega e Inventario</h1>
                    <p className="text-gray-400 mt-1">Control de insumos, stock y costos promedio.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsModalCompraOpen(true)}
                        className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
                    >
                        + Registrar Compra
                    </button>
                    {/* Botón para la siguiente fase */}
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/20">
                        - Registrar Consumo
                    </button>
                </div>
            </div>

            {/* TARJETAS DE KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Capital Invertido (Stock)</h3>
                    <p className="text-3xl font-bold text-white">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(capitalTotal)}
                    </p>
                </div>
                <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Total de Insumos</h3>
                    <p className="text-3xl font-bold text-white">{insumos.length}</p>
                </div>
                <div className={`border rounded-xl p-6 shadow-sm transition-colors ${insumosCriticos > 0 ? 'bg-red-900/20 border-red-500/50' : 'bg-[#1a1d24] border-gray-800'}`}>
                    <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Alertas de Stock</h3>
                    <p className={`text-3xl font-bold ${insumosCriticos > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {insumosCriticos} {insumosCriticos === 1 ? 'insumo crítico' : 'insumos críticos'}
                    </p>
                </div>
            </div>

            {/* TABLA DE INVENTARIO */}
            <div className="bg-[#1a1d24] border border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-800/50 text-gray-400 border-b border-gray-800 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-medium">Insumo</th>
                                <th className="px-6 py-4 font-medium">Tipo</th>
                                <th className="px-6 py-4 font-medium text-right">Stock Actual (Kg)</th>
                                <th className="px-6 py-4 font-medium text-right">Costo Promedio (CPP)</th>
                                <th className="px-6 py-4 font-medium text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {cargando ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Cargando inventario...</td>
                                </tr>
                            ) : insumos.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No hay insumos registrados en esta finca.</td>
                                </tr>
                            ) : (
                                insumos.map((insumo) => (
                                    <tr key={insumo.id_insumo} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{insumo.nombre_insumo}</td>
                                        <td className="px-6 py-4 text-gray-400">{insumo.tipo_insumo}</td>
                                        <td className="px-6 py-4 text-right font-medium text-white">
                                            {parseFloat(insumo.stock_actual_kg).toLocaleString('es-CO')} kg
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-400">
                                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(insumo.costo_promedio_kg)} / kg
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {parseFloat(insumo.stock_actual_kg) <= parseFloat(insumo.punto_critico_kg) ? (
                                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-medium">Bajo</span>
                                            ) : (
                                                <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full text-xs font-medium">Óptimo</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* INTEGRACIÓN DEL MODAL */}
            <ModalCompraInsumo 
                isOpen={isModalCompraOpen} 
                onClose={() => setIsModalCompraOpen(false)}
                idFinca={idFinca}
                insumosDisponibles={insumos} // Le pasamos los insumos para que el usuario seleccione cuál compró
                onCompraGuardada={cargarInventario} // Refresca la tabla automáticamente al guardar
            />
        </div>
    );
}
