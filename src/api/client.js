import axios from 'axios';
import useAuthStore from '../store/authStore';

/**
 * GEOGAN API CLIENT - Configuración de Conectividad Estratégica
 * Optimizada para túneles ngrok y despliegue en Vercel.
 */

// Forzamos la limpieza de la URL para evitar undefined o strings vacíos
const getBaseURL = () => {
    const envURL = import.meta.env.VITE_API_URL;
    if (envURL && envURL.trim() !== "" && envURL !== "undefined") {
        return envURL.replace(/\/$/, ""); // Quita el slash final si existe
    }
    // Fallback manual: La URL activa según tu túnel actual
    return 'https://unmistakingly-unsprouting-loria.ngrok-free.dev';
};

const apiClient = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
    // Aumentamos a 15s para evitar que el túnel "cuelgue" la carga inicial
    timeout: 15000,
});

// --- Request Interceptor: Auth + Business Intelligence Debugging ---
apiClient.interceptors.request.use(
    (config) => {
        const { user } = useAuthStore.getState();

        // Inyección de Token JWT para rutas protegidas
        if (user?.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }

        // Identificador de usuario para trazabilidad en el backend
        if (user?.id || user?.usuario_id) {
            config.headers['X-Usuario-Id'] = String(user.id || user.usuario_id);
        }

        console.log(`[GeoGan Sync] Conectando a: ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        console.error("[GeoGan Error] Fallo en petición:", error);
        return Promise.reject(error);
    }
);

// --- Response Interceptor: Gestión de Sesión y Errores Críticos ---
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Manejo automático de sesión expirada (Seguridad GeoGan)
        if (error.response?.status === 401) {
            console.error("Acceso denegado: Sesión expirada.");
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }

        // Diagnóstico de red para el usuario
        if (error.code === 'ECONNABORTED') {
            console.error("La conexión con el servidor local tardó demasiado.");
        }

        return Promise.reject(error);
    }
);

export default apiClient;