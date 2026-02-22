import axios from 'axios';
import useAuthStore from '../store/authStore';

/**
 * Cliente API — GeoGan
 *
 * Instancia de Axios configurada con:
 * - baseURL desde variable de entorno VITE_API_URL
 * - Interceptor de request que inyecta X-Usuario-Id desde el authStore
 * - Manejo de errores centralizado
 *
 * Convención: El header se llama exactamente "X-Usuario-Id"
 * para coincidir con el backend de FastAPI.
 */
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15s — tolerante a conectividad rural
});

// ─── Interceptor de Request ───────────────────────────────────
// Inyecta el header X-Usuario-Id en cada solicitud si el usuario
// está autenticado. Se accede al store fuera de React con getState().
apiClient.interceptors.request.use(
    (config) => {
        const { user } = useAuthStore.getState();

        if (user?.usuario_id) {
            config.headers['X-Usuario-Id'] = String(user.usuario_id);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Interceptor de Response ──────────────────────────────────
// Manejo centralizado de errores HTTP comunes.
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401: sesión expirada → limpiar estado
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }

        return Promise.reject(error);
    }
);

export default apiClient;
