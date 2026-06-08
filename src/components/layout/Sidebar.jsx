import React from 'react';
import { 
    LayoutDashboard, 
    TrendingUp, 
    Map, 
    Wheat, 
    Syringe, 
    Package, 
    LogOut,
    Users,
    UserCog,
    BadgeDollarSign
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const navItems = [
    { id: 'resumen', label: 'Mi Resumen', icon: LayoutDashboard },
    { id: 'analitica', label: 'Visión Estratégica', icon: TrendingUp },
    { id: 'tierra', label: 'Mapeo de Tierra', icon: Map },
    { id: 'lotes', label: 'Gestión de Lotes', icon: Users },
    { id: 'equipo', label: 'Mi Equipo', icon: UserCog },
    { id: 'finanzas', label: 'Finanzas', icon: BadgeDollarSign },
    { id: 'nutricion', label: 'Nutrición', icon: Wheat },
    { id: 'sanidad', label: 'Sanidad', icon: Syringe },
    { id: 'bodega', label: 'Bodega', icon: Package }
];

export default function Sidebar({ activeTab, setActiveTab }) {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="fixed top-24 left-0 bottom-0 w-64 bg-[#11261F] text-white flex flex-col shadow-2xl z-50 transition-transform duration-300">


            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                                isActive 
                                    ? 'bg-[#8CB33E] text-[#11261F] shadow-lg shadow-[#8CB33E]/20' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-[#11261F]' : 'text-gray-400'}`} />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            <div className="p-4 mt-auto border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
