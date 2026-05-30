import React, { useState, useEffect } from 'react';
import api from '../../../api/client';
import RoleGuard from '../../auth/RoleGuard';
import useAuthStore from '../../../store/authStore';

export default function SanidadTab({ setShowTratamientoGrupalModal, cleanId, allAnimales }) {
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(false);
    const user = useAuthStore((state) => state.user);

    // Cargar historial sanitario real: consultamos el historial de cada animal activo de la finca
    useEffect(() => {
        if (!cleanId || !allAnimales || allAnimales.length === 0) return;

        const cargarHistorial = async () => {
            setCargando(true);
            try {
                // Tomamos los últimos 20 animales con historial para no saturar
                const promises = allAnimales.slice(0, 20).map(async (animal) => {
                    try {
                        const res = await api.get(`/animales/${animal.id_animal}/salud`);
                        return (res.data || []).map(registro => ({
                            ...registro,
                            codigo_animal: animal.codigo_identificacion,
                            id_animal: animal.id_animal
                        }));
                    } catch {
                        return [];
                    }
                });

                const resultados = await Promise.all(promises);
                const todosRegistros = resultados
                    .flat()
                    .sort((a, b) => new Date(b.fecha_aplicacion) - new Date(a.fecha_aplicacion))
                    .slice(0, 50); // Últimos 50 registros

                setHistorial(todosRegistros);
            } catch (error) {
                console.error("Error cargando historial sanitario:", error);
            } finally {
                setCargando(false);
            }
        };

        cargarHistorial();
    }, [cleanId, allAnimales]);

    // Contar animales en periodo de cuarentena por medicamentos
    const animalesEnRetiro = allAnimales?.filter(a => a.apto_para_consumo === false) || [];

    return (
        <div className="animate-in slide-in-from-right-4 duration-500 mb-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* EXPLICACIÓN Y MÉTRICAS (COLUMNA 1) */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <div className="bg-[#11261F] rounded-[40px] p-10 text-white shadow-xl">
                        <h5 className="text-2xl font-black uppercase mb-4 text-[#8CB33E]">Libreta de Vacunas</h5>
                        <p className="text-sm text-white/80 leading-relaxed mb-6 font-medium">
                            Lleva el control de vacunas, purgas y tratamientos. Un animal sano gana peso más rápido, aprovecha mejor la comida y evita pérdidas de dinero.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-gray-300 uppercase mb-2">Registros</p>
                                <p className="text-3xl font-black italic text-white">{historial.length}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Tratamientos</p>
                            </div>
                            <div className={`p-6 rounded-3xl border flex flex-col justify-center ${animalesEnRetiro.length > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-green-500/20 border-green-500/30'}`}>
                                <p className={`text-[10px] font-bold uppercase mb-1 ${animalesEnRetiro.length > 0 ? 'text-red-200' : 'text-green-200'}`}>Cuarentena</p>
                                <p className={`text-3xl font-black italic ${animalesEnRetiro.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{animalesEnRetiro.length}</p>
                                <p className={`text-[10px] font-bold mt-1 uppercase ${animalesEnRetiro.length > 0 ? 'text-red-200' : 'text-green-200'}`}>
                                    {animalesEnRetiro.length > 0 ? 'En retiro por medicamentos' : 'Todo el ganado libre'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* HISTORIAL CLÍNICO (COLUMNA 2 y 3) */}
                <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-[#E6F4D7] shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="text-xl font-black uppercase text-[#11261F]">Libreta de Medicamentos</h4>
                        <button onClick={() => setShowTratamientoGrupalModal(true)} className="bg-[#8CB33E] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-[#7a9d35]">+ Registrar Tratamiento</button>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-[#F4F6F4] text-[10px] font-black uppercase text-gray-500 tracking-widest">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-2xl">Fecha</th>
                                <th className="px-6 py-4">Animal</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Medicamento</th>
                                <th className="px-6 py-4">Vía</th>
                                <th className="px-6 py-4">Días Cuarentena 🚨</th>
                                <th className="px-6 py-4 rounded-tr-2xl">Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6F4D7]">
                            {cargando ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 font-bold uppercase">
                                        <span className="animate-pulse">Cargando historial clínico...</span>
                                    </td>
                                </tr>
                            ) : historial.length > 0 ? (
                                historial.map((registro, idx) => (
                                    <tr key={registro.id_sanitario || idx} className="hover:bg-[#F4F6F4]/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-gray-700">
                                            {registro.fecha_aplicacion ? new Date(registro.fecha_aplicacion).toLocaleDateString('es-CO') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-[#11261F] uppercase">
                                            {registro.codigo_animal || '-'}
                                            <RoleGuard allowedRoles={['superadmin']}>
                                                <span className="text-[9px] text-gray-400 ml-1">[ID:{registro.id_animal}]</span>
                                            </RoleGuard>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                                                registro.tipo_evento === 'vacunacion' ? 'bg-blue-100 text-blue-700' :
                                                registro.tipo_evento === 'desparasitacion' ? 'bg-purple-100 text-purple-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {registro.tipo_evento || 'tratamiento'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-700">{registro.producto || '-'}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-500">{registro.via_aplicacion || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            {registro.dias_retiro > 0 ? (
                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black">
                                                    {registro.dias_retiro} días
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">{registro.observaciones || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 font-bold uppercase">
                                        Aún no hay tratamientos registrados para esta finca
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
