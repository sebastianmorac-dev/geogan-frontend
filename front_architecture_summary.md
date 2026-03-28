# Resumen de Arquitectura del Frontend (GeoGan)

Este documento contiene un resumen clave de la arquitectura y la configuración principal del proyecto `geogan-frontend`.

## 1. Directorio de Componentes

La carpeta principal de código es `/src`, que está dividida en las siguientes carpetas principales:

- **`components/`**: Componentes reutilizables de UI (ej. \`ProtectedRoute.jsx\`).
- **`pages/`**: Vistas principales de la aplicación por donde navega el usuario (ej. \`DashboardPage.jsx\`, \`LoginPage.jsx\`, \`RegisterAnimalPage.jsx\`).
- **`hooks/`**: Custom hooks de React para lógica compartida.
- **`api/`**: Configuración de Axios (`client.js`) e integraciones con endpoints del backend (ej. \`authService.js\`).
- **`store/`**: Manejo de estados globales usando Zustand (`authStore.js`).
- **`assets/`**: Imágenes, logos y recursos estáticos (ej. \`logo_geogan.png\`).
- **`schemas/`**: Esquemas de validación o tipos de datos estandarizados.

---

## 2. Estado Global (Zustand)

El estado global de la autenticación maneja al usuario activo mediante persistencia (RBAC), permitiendo verificar si el usuario tiene un rol determinado (\`superadmin\`, \`propietario\`, \`encargado\`) para habilitar o restringir ciertas acciones en la interfaz.

**Archivo: \`src/store/authStore.js\`**

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store de Autenticación — GeoGan
 * Maneja el estado global del usuario autenticado con persistencia RBAC
 */
const useAuthStore = create(
    persist(
        (set, get) => ({
            // --- Estado ---
            user: null,
            isAuthenticated: false,

            // --- Acciones ---
            login: (userData) => {
                const numericId = Number(userData.usuario_id);
                set({
                    user: {
                        usuario_id: numericId,
                        nombre: userData.nombre,
                        rol: userData.rol,
                        token: userData.token,
                        fincas: userData.fincas || [], // <-- NUEVO: Guardamos sus fincas permitidas
                    },
                    isAuthenticated: true,
                });
            },

            logout: () => set({ user: null, isAuthenticated: false }),

            hasRole: (role) => {
                const { user } = get();
                return user?.rol === role;
            },

            canDeleteAnimals: () => {
                const { user } = get();
                return user?.rol === 'propietario' || user?.rol === 'superadmin';
            },

            canRegisterAnimals: () => {
                const { user } = get();
                return (
                    user?.rol === 'propietario' ||
                    user?.rol === 'encargado' ||
                    user?.rol === 'superadmin'
                );
            },
        }),
        {
            name: 'auth-storage',
            version: 3, // <-- NUEVO: Forzamos a React a borrar sesiones viejas/incompatibles
            migrate: (persistedState, version) => {
                if (version < 3) {
                    console.warn('[authStore] Migrando a RBAC (v3) → limpiando sesión');
                    return { user: null, isAuthenticated: false };
                }
                return persistedState;
            },
        }
    )
);

export default useAuthStore;
```

---

## 3. Cliente API (Axios)

Para la comunicación con el backend (FastAPI), usamos Axios configurado con una URL base dinámica según el entorno y un interceptor de peticiones que inyecta automáticamente el token JWT Bearer. Otro interceptor de respuestas nos permite redirigir al login en caso de obtener un `401 Unauthorized`.

**Archivo: \`src/api/client.js\`**

```javascript
import axios from 'axios';
import useAuthStore from '../store/authStore';

const getBaseURL = () => {
    const envURL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    if (envURL && envURL.trim() !== "" && envURL !== "undefined") {
        return envURL.replace(/\/$/, "");
    }
    return 'http://localhost:8000';
};

const apiClient = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
    timeout: 15000,
});

// --- Interceptor de Petición ---
apiClient.interceptors.request.use(
    (config) => {
        // Si estamos yendo al LOGIN, no validamos token aquí
        if (config.url.includes('/usuarios/login')) {
            return config;
        }

        const { user } = useAuthStore.getState();
        if (user?.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- Interceptor de Respuesta en src/api/client.js ---
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // COMENTAMOS LAS LÍNEAS QUE TE EXPULSAN
        if (error.response?.status === 401 && !error.config.url.includes('/usuarios/login')) {
            console.error("🚨 El backend rechazó el token en:", error.config.url);
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
```

---

## 4. Rutas Principales

El flujo de navegación está administrado por \`react-router-dom\` centralizado en el componente principal \`App\`. Allí podemos diferenciar las rutas públicas (como el login) y las rutas internas que pasan por un validador (`ProtectedRoute`). En la misma configuración se define un enrutamiento seguro de redirecciones en caso de páginas no encontradas (`*`).

**Archivo: \`src/App.jsx\`**

```javascript
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterAnimalPage from './pages/RegisterAnimalPage';
import EditAnimalPage from './pages/EditAnimalPage';

/**
 * App — GeoGan
 *
 * Enrutamiento principal de la aplicación.
 * - /login              → Página de login (pública)
 * - /dashboard          → Dashboard (protegido)
 * - /registrar-animal   → Registro de animales (protegido)
 * - /                   → Redirige a /dashboard
 */
export default function App() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/registrar-animal" element={<RegisterAnimalPage />} />
        <Route path="/editar-animal/:id_animal" element={<EditAnimalPage />} />
      </Route>

      {/* Fallback → dashboard (si autenticado) o login (si no) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

---

## 5. Componente de Ejemplo (DashboardPage.jsx)

El siguiente es un extracto representativo de `DashboardPage.jsx`. Sirve para entender cómo manejas utilidades visuales dinámicas de **Tailwind CSS**, cómo se obtienen y centralizan dependencias de estado (`useEffect`, `useState`, `useCallback` y peticiones a la API global) y los principales modales para la interacción del usuario.

**Archivo: \`src/pages/DashboardPage.jsx\` (Extracto Inicio y Render Principal)**

```javascript
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo_geogan.png';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const location = useLocation();

    // --- ESTADOS BASE ---
    const [fincas, setFincas] = useState([]);
    const [fincaSel, setFincaSel] = useState('');
    const [allAnimales, setAllAnimales] = useState([]);
    const [lotesBackend, setLotesBackend] = useState([]); // Base de datos real
    const [insumos, setInsumos] = useState([]);
    const [catalogoMaestro, setCatalogoMaestro] = useState([]);
    const [stats, setStats] = useState({ total: 0, promedioPeso: 0, alertas: 0, valorLote: "0", gastoHoy: 0 });

    // --- ESTADOS DE LAS NUEVAS FUNCIONALIDADES ---
    const [alertasInteligentes, setAlertasInteligentes] = useState([]);
    const [historialNutricion, setHistorialNutricion] = useState([]);
    const [lotesSeleccionadosMasivo, setLotesSeleccionadosMasivo] = useState([]);

    // --- PESTAÑAS Y MODALES ---
    const [activeTab, setActiveTab] = useState('resumen');
    const [selectedLote, setSelectedLote] = useState(null);

    const [showCompraModal, setShowCompraModal] = useState(false);
    const [showSuministroModal, setShowSuministroModal] = useState(false);

    const [showNuevoLoteModal, setShowNuevoLoteModal] = useState(false);
    const [nuevoLoteData, setNuevoLoteData] = useState({ nombre: '', tipo_manejo: 'General' });

    // EL MOTOR ORIGINAL
    const loadData = useCallback(async () => {
        if (!fincaSel) return;
        const cleanId = String(fincaSel).split(':')[0];
        try {
            const [resAnimales, resBodega, resSugeridos, resLotes] = await Promise.all([
                api.get(\`/animales/?finca_id=\${cleanId}\`),
                api.get(\`/insumos/?finca_id=\${cleanId}\`),
                api.get(\`/insumos/catalogo-sugerido?finca_id=\${cleanId}\`),
                api.get(\`/lotes/?finca_id=\${cleanId}\`).catch(() => ({ data: [] }))
            ]);

            const data = resAnimales.data || [];
            const bodega = resBodega.data || [];
            setAllAnimales(data);
            setInsumos(bodega);
            setCatalogoMaestro(resSugeridos.data || []);
            setLotesBackend(resLotes.data || []);

            // MAQUETACIÓN DE ALERTAS GLOBALES
            const hoy = new Date();
            let nuevasAlertas = [];

            const pendientes = data.filter(a => a.fecha_proximo_pesaje && new Date(a.fecha_proximo_pesaje) <= hoy);
            if (pendientes.length > 0) {
                nuevasAlertas.push({
                    tipo: 'pesaje',
                    titulo: 'Pesajes Atrasados',
                    desc: \`Tienes \${pendientes.length} animales que necesitan ir a la báscula.\`,
                    accion: 'Ir a registrar pesos'
                });
            }

            setAlertasInteligentes(nuevasAlertas);

            const sumaPesos = data.reduce((acc, curr) => acc + (parseFloat(curr.peso) || 0), 0);
            setStats({
                total: data.length,
                promedioPeso: data.length > 0 ? (sumaPesos / data.length).toFixed(1) : 0,
                alertas: nuevasAlertas.length,
                valorLote: (sumaPesos * 8500).toLocaleString('es-CO'),
                gastoHoy: stats.gastoHoy
            });
        } catch (err) { console.error("Error cargando datos:", err); }
    }, [fincaSel]);

    // EFECTOS PRINCIPALES (CICLO DE VIDA)
    useEffect(() => {
        api.get('/fincas/').then(res => setFincas(res.data || [])).catch(err => setFincas([]));
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    
    // ... más lógica y handlers intermedios (importación desde CSV, modales, alertas, etc.)

    return (
        <div className="min-h-screen bg-[#F4F6F4] font-sans text-[#11261F] antialiased">
            {/* HEADER */}
            <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-[#E6F4D7] h-24 px-12 flex justify-between items-center shadow-sm">
                <img src={logo} alt="GeoGan" style={{ height: '140px', margin: '-30px 0' }} />
                <div className="flex gap-6 items-center">
                    <select value={fincaSel} onChange={(e) => setFincaSel(e.target.value)} className="bg-[#F9FBFA] border border-[#E6F4D7] px-6 py-3 rounded-2xl font-black text-sm outline-none cursor-pointer">
                        <option value="">-- SELECCIONAR UNA FINCA --</option>
                        {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre?.toUpperCase()}</option>)}
                    </select>
                    <button onClick={logout} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-all">✕</button>
                </div>
            </header>

            {!fincaSel ? (
                /* PANTALLA DE INICIO */
                <div className="flex flex-col items-center justify-center min-h-screen pt-24 text-center px-4">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-[#E6F4D7] text-4xl">👋</div>
                    <h2 className="text-3xl font-black uppercase tracking-tight mb-3 text-[#11261F]">Hola, te damos la bienvenida</h2>
                    <p className="text-gray-500 text-lg max-w-md leading-relaxed">
                        Para empezar a trabajar y ver cómo está tu ganado, por favor elige una de tus fincas en el menú de arriba.
                    </p>
                </div>
            ) : (
                <main className="mt-32 px-12 pb-20 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
                    {/* TÍTULO Y NAVEGACIÓN */}
                    <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <p className="text-sm font-black text-[#8CB33E] uppercase tracking-widest mb-2">Panel de Control</p>
                            <h2 className="text-5xl font-black uppercase tracking-tighter text-[#11261F]">{/* Nombre finca */}</h2>
                        </div>
                        <div className="flex gap-2 bg-white p-2 rounded-2xl border border-[#E6F4D7] shadow-sm">
                            {[
                                { id: 'resumen', label: 'Mi Resumen' },
                                { id: 'lotes', label: 'Gestión de Lotes' },
                                { id: 'nutricion', label: 'Nutrición' },
                                { id: 'sanidad', label: 'Sanidad' },
                                { id: 'bodega', label: 'Bodega' }
                            ].map(tab => (
                                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedLote(null); }}
                                    className={\`px-8 py-3.5 rounded-xl text-sm font-black uppercase transition-all \${activeTab === tab.id ? 'bg-[#11261F] text-white shadow-md' : 'text-gray-400 hover:bg-[#F4F6F4]'}\`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* ... (Contenido de cada pestaña, tablas, tarjetas, componentes hijos) */}
                </main>
            )}
            
            {/* Modal: Comprar Insumo (Bodega) ... */}
        </div>
    );
}
```
