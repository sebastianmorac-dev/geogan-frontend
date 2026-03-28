import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';

export default function RegisterAnimalPage() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [fincas, setFincas] = useState([]);
    const [razas, setRazas] = useState(['Brahman', 'Jersey', 'Holstein', 'Angus', 'Brangus', 'Bon', 'Pardo Suizo']); // Fallback estratégico
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            especie: 'Bovino',
            raza: '',
            fecha_ingreso: new Date().toISOString().split('T')[0]
        }
    });

    // 1. CARGA DE DATOS MAESTROS (FINCAS Y RAZAS)
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [resFincas, resRazas] = await Promise.all([
                    api.get('/fincas/'),
                    api.get('/catalogos/razas/') // Asumiendo este endpoint de tu base de datos
                ]);
                setFincas(resFincas.data || []);
                if (resRazas.data) setRazas(resRazas.data);
            } catch (err) {
                console.error("Error al cargar metadatos:", err);
                // Mantenemos las razas por defecto si falla la API
            }
        };
        loadMetadata();
    }, []);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const idFincaInt = parseInt(data.finca_id);
            const fincaSeleccionada = fincas.find(f => f.id_finca === idFincaInt);
            
            const payload = {
                ...data, // especie, raza, fecha_ingreso, codigo_identificacion
                peso: parseFloat(data.peso),
                // 🔴 LOS DOS ARREGLOS VITALES:
                id_finca: parseInt(data.finca_id), 
                id_propietario: parseInt(user?.usuario_id) 
            };
            // Eliminar variable residual del formulario web
            delete payload.finca_id;
            await api.post('/animales/', payload);

            // Empatía Ganadera: Mensaje de confirmación ANTES de sacarlo de la vista
            alert(`✅ ¡Bovino ${data.codigo_identificacion} registrado exitosamente en el sistema!`);

            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            console.error("Fallo en registro:", err);
            alert("Error: Verifique que el código no esté duplicado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FBFA] font-sans text-[#1A3D2F] antialiased">
            <header className="bg-white border-b border-[#E6F4D7] h-24 px-10 flex justify-between items-center sticky top-0 z-50">
                <img src={logo} alt="GeoGan" className="h-20 w-auto cursor-pointer" onClick={() => navigate('/dashboard')} />
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-[#8CB33E]">Unidad de Registro</p>
                    <p className="text-sm font-black uppercase">{user?.nombre || 'Admin'}</p>
                </div>
            </header>

            <main className="max-w-3xl mx-auto py-16 px-6">
                <div className="bg-white rounded-[40px] border border-[#E6F4D7] shadow-xl overflow-hidden">
                    <div className="bg-[#1A3D2F] p-10 text-center">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Nuevo Activo Biológico</h2>
                        <p className="text-[#8CB33E] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Configuración de Ficha Técnica</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="p-12 space-y-8">
                        {success && (
                            <div className="bg-[#E6F4D7] text-[#1A3D2F] p-4 rounded-2xl text-center font-black uppercase text-xs animate-bounce">
                                Registro exitoso. Sincronizando inventario...
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Código Identificación</label>
                                <input {...register("codigo_identificacion", { required: true })} placeholder="Ej: GAN-001" className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-[#8CB33E] outline-none transition-all" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Ubicación (Finca)</label>
                                <select {...register("finca_id", { required: true })} className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-[#8CB33E] outline-none transition-all">
                                    <option value="">Seleccione Finca</option>
                                    {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre.toUpperCase()}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Raza / Genética</label>
                                <select {...register("raza", { required: true })} className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-[#8CB33E] outline-none transition-all">
                                    <option value="">Seleccione Raza</option>
                                    {razas.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Peso Ingreso (KG)</label>
                                <input type="number" step="0.1" {...register("peso", { required: true })} placeholder="0.0" className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-4 font-black text-lg focus:ring-2 focus:ring-[#8CB33E] outline-none transition-all" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Especie (Bloqueado)</label>
                                <input {...register("especie")} disabled className="w-full bg-gray-50 border-2 border-gray-100 text-gray-400 rounded-2xl px-6 py-4 font-bold cursor-not-allowed" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Fecha Registro</label>
                                <input type="date" {...register("fecha_ingreso")} className="w-full bg-[#F9FBFA] border-2 border-[#E6F4D7] rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-[#8CB33E] outline-none transition-all" />
                            </div>
                        </div>

                        <div className="pt-8 flex gap-4">
                            <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 px-8 py-5 rounded-3xl font-black uppercase text-xs tracking-widest border-2 border-[#E6F4D7] hover:bg-gray-50 transition-all">Cancelar</button>
                            <button type="submit" disabled={isSubmitting} className="flex-[2] bg-[#1A3D2F] text-white px-8 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-[#8CB33E] transition-all shadow-xl shadow-[#1A3D2F]/20 active:scale-95">
                                {isSubmitting ? 'Sincronizando...' : 'Finalizar Registro'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}