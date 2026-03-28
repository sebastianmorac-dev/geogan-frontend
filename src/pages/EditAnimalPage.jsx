import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';
import ModalOverlay from '../components/modals/ModalOverlay';

export default function EditAnimalPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    const [loading, setLoading] = useState(true);
    const [animalData, setAnimalData] = useState(null);
    const [lotes, setLotes] = useState([]);

    const fromFinca = location.state?.fromFinca;
    const fromTab = location.state?.fromTab || 'lotes';
    const fromLote = location.state?.fromLote;
    const nombreFinca = location.state?.nombreFinca || 'Finca Activa';

    // =========================================================================
    // 🔒 CANDADO DE SEGURIDAD RBAC
    // =========================================================================
    useEffect(() => {
        if (user && user.rol !== 'superadmin' && user.rol !== 'propietario' && user.rol !== 'admin') {
            alert("⛔ No tienes permisos para editar datos maestros.");
            navigate(-1);
        }
    }, [user, navigate]);

    // =========================================================================
    // CARGA DE DATOS
    // =========================================================================
    const fetchDatos = async () => {
        try {
            const resAnimal = await api.get(`/animales/${id}`);
            setAnimalData(resAnimal.data);

            if (resAnimal.data.id_finca) {
                try {
                    const resLotes = await api.get(`/lotes/finca/${resAnimal.data.id_finca}`);
                    setLotes(resLotes.data || []);
                } catch (e) { console.warn("Módulo de lotes no responde", e); }
            }

            setLoading(false);
        } catch (err) { setLoading(false); }
    };

    useEffect(() => { if (id) fetchDatos(); }, [id]);

    // =========================================================================
    // CONTROLADOR DE EDICIÓN
    // =========================================================================
    const handleEditarPerfil = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const payload = {
            raza: formData.get('raza'),
            sexo: formData.get('sexo'),
            estado: formData.get('estado')
        };

        try {
            await api.put(`/animales/${id}`, payload);

            const loteSeleccionado = formData.get('id_lote');
            if (loteSeleccionado && parseInt(loteSeleccionado) !== animalData.id_lote) {
                await api.put(`/animales/${id}/lote`, { id_lote: parseInt(loteSeleccionado) });
            }

            alert("✅ Perfil base actualizado con éxito.");
            navigate(`/animales/detalle/${id}`, { state: { fromFinca, fromTab, fromLote, nombreFinca } });
        } catch (error) {
            console.error("Error al actualizar perfil:", error);
            alert("❌ Error al guardar. Revisa que la raza o estado coincidan con el catálogo.");
        }
    };

    const handleVolver = () => {
        navigate(`/animales/detalle/${id}`, { state: { fromFinca, fromTab, fromLote, nombreFinca } });
    };

    if (loading) return <div className="min-h-screen bg-[#F4F6F4] flex items-center justify-center font-black text-[#11261F] animate-pulse uppercase tracking-widest text-xl">Cargando Editor...</div>;

    return (
        <div className="min-h-screen bg-[#F4F6F4] font-sans text-[#11261F] antialiased">

            <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-[#E6F4D7] h-24 px-12 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <img src={logo} alt="GeoGan" style={{ height: '140px', margin: '-30px 0' }} />
                    <div className="h-8 w-px bg-[#E6F4D7]"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#8CB33E]">{nombreFinca}</p>
                </div>
                <button onClick={handleVolver} className="w-12 h-12 rounded-2xl bg-[#F9FBFA] border-2 border-[#E6F4D7] flex items-center justify-center hover:bg-red-50 transition-all text-xl">✕</button>
            </header>

            <main className="mt-32 px-12 pb-20 max-w-[800px] mx-auto w-full">

                <div className="bg-white rounded-[40px] p-12 shadow-sm border border-[#E6F4D7]">

                    {/* CABECERA */}
                    <div className="mb-10 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8CB33E] mb-2">Zona de Administrador</p>
                        <h2 className="text-4xl font-black tracking-tighter uppercase">{animalData?.codigo_identificacion || '---'}</h2>
                        <p className="text-sm font-bold text-gray-500 mt-2">Editar Perfil Base</p>
                    </div>

                    {/* ALERTA DE TRAZABILIDAD */}
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl mb-8">
                        <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest text-center">⚠️ Zona de Administrador</p>
                        <p className="text-xs text-yellow-800 text-center mt-1 font-bold">La identificación es inmutable por razones de trazabilidad ICA.</p>
                    </div>

                    {/* FORMULARIO PURO */}
                    <form onSubmit={handleEditarPerfil} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* CHAPETA BLOQUEADA */}
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">ID / Chapeta 🔒</label>
                                <input type="text" value={animalData?.codigo_identificacion || ''} disabled
                                    className="w-full bg-gray-100 text-gray-400 rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent cursor-not-allowed" />
                            </div>

                            {/* LISTAS CERRADAS (AI-READY) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Sexo</label>
                                <select name="sexo" defaultValue={animalData?.sexo} className="w-full bg-[#F4F6F4] rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                                    <option value="H">Hembra</option>
                                    <option value="M">Macho</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Raza</label>
                                <select name="raza" defaultValue={animalData?.raza} className="w-full bg-[#F4F6F4] rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                                    <option value="Brahman">Brahman</option>
                                    <option value="Holstein">Holstein</option>
                                    <option value="Normando">Normando</option>
                                    <option value="Angus">Angus</option>
                                    <option value="Cebú">Cebú</option>
                                    <option value="Gyr">Gyr</option>
                                    <option value="Cruce">Cruce (Mestizo)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Estado</label>
                                <select name="estado" defaultValue={animalData?.estado || 'activo'} className="w-full bg-[#F4F6F4] rounded-2xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-[#8CB33E]">
                                    <option value="activo">Activo (En Finca)</option>
                                    <option value="cuarentena">Cuarentena</option>
                                    <option value="vendido">Vendido</option>
                                    <option value="muerto">Muerto / Baja</option>
                                </select>
                            </div>
                        </div>

                        {/* TRASLADO DE LOTE */}
                        <div className="space-y-2 pt-4 border-t border-dashed border-[#E6F4D7]">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Lote (Traslado Físico)</label>
                            <select name="id_lote" defaultValue={animalData?.id_lote || ''} className="w-full bg-[#F4F6F4] rounded-2xl p-4 text-sm font-black outline-none border-2 border-[#E6F4D7] focus:border-[#8CB33E]">
                                <option value="">INVENTARIO GENERAL</option>
                                {lotes.map(lote => (
                                    <option key={lote.id_lote} value={lote.id_lote}>{lote.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="w-full bg-[#11261F] text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#8CB33E] transition-all mt-4">
                            Guardar Cambios Base
                        </button>
                        <button type="button" onClick={handleVolver} className="w-full text-xs font-black uppercase text-gray-400 mt-2 hover:text-[#11261F] transition-colors">
                            ← Volver a la Hoja de Vida
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}