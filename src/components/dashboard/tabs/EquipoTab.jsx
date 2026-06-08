import React, { useState } from 'react';
import useDashboardData from '../../../hooks/useDashboardData';

export default function EquipoTab() {
    const { equipoBackend, handleCrearUsuario, handleEliminarUsuario } = useDashboardData();
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        nombre_completo: '',
        rol: 'operario',
        nombre_usuario: '',
        correo: '',
        identificacion: '',
        celular: '',
        contrasena: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await handleCrearUsuario(formData);
            setShowModal(false);
            setFormData({
                nombre_completo: '',
                rol: 'operario',
                nombre_usuario: '',
                correo: '',
                identificacion: '',
                celular: '',
                contrasena: ''
            });
        } catch (error) {
            // El error se maneja en el hook con notifyError
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-2xl">👥</span> Gestión de Equipo
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Administra los accesos y roles del personal de tu finca.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 bg-[#1B4332] text-white rounded-xl font-medium shadow-sm hover:bg-[#143425] transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Nuevo Empleado
                </button>
            </div>

            {/* TABLA DE EQUIPO */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                            <th className="p-4 pl-6">Empleado</th>
                            <th className="p-4">Rol</th>
                            <th className="p-4">Usuario / Email</th>
                            <th className="p-4">Contacto</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {equipoBackend?.length > 0 ? (
                            equipoBackend.map(miembro => (
                                <tr key={miembro.id_usuario} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold border border-emerald-200">
                                                {(miembro.nombre_completo || miembro.nombre_usuario).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{miembro.nombre_completo || 'Sin nombre'}</p>
                                                <p className="text-xs text-gray-500">ID: {miembro.identificacion || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide
                                            ${miembro.rol === 'superadmin' || miembro.rol === 'propietario' ? 'bg-purple-100 text-purple-700' :
                                              miembro.rol === 'encargado' ? 'bg-blue-100 text-blue-700' :
                                              miembro.rol === 'contador' ? 'bg-amber-100 text-amber-700' :
                                              'bg-emerald-100 text-emerald-700'}`}
                                        >
                                            {String(miembro.rol).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-medium text-gray-900">@{miembro.nombre_usuario}</p>
                                        <p className="text-xs text-gray-500">{miembro.correo || 'Sin correo'}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {miembro.celular || 'No registrado'}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleEliminarUsuario(miembro.id_usuario)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Desactivar / Eliminar"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500">
                                    No hay empleados registrados en esta finca.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL NUEVO EMPLEADO */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Registrar Empleado</h3>
                                <p className="text-sm text-gray-500 mt-1">Dale acceso a tu equipo a la plataforma</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                                    <input required type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2D6A4F] outline-none" placeholder="Ej: Juan Pérez" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Rol en la finca <span className="text-red-500">*</span></label>
                                    <select required name="rol" value={formData.rol} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2D6A4F] outline-none bg-white">
                                        <option value="operario">Operario (Campo)</option>
                                        <option value="encargado">Encargado (Capataz)</option>
                                        <option value="contador">Contador</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de Usuario <span className="text-red-500">*</span></label>
                                    <input required type="text" name="nombre_usuario" value={formData.nombre_usuario} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2D6A4F] outline-none" placeholder="Ej: jperez" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña Temporal <span className="text-red-500">*</span></label>
                                    <input required type="password" name="contrasena" value={formData.contrasena} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2D6A4F] outline-none" placeholder="Mínimo 4 caracteres" minLength="4" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Identificación (Cédula)</label>
                                    <input type="text" name="identificacion" value={formData.identificacion} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2D6A4F] outline-none" placeholder="Opcional" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Celular / WhatsApp</label>
                                    <input type="text" name="celular" value={formData.celular} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2D6A4F] outline-none" placeholder="Opcional" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico (Para Administradores/Contadores)</label>
                                    <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2D6A4F] outline-none" placeholder="Ej: jperez@correo.com" />
                                </div>
                            </div>
                            
                            <div className="mt-8 flex gap-3 justify-end pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-[#2D6A4F] text-white hover:bg-[#1B4332] rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                    {loading ? 'Creando...' : 'Crear Empleado'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
