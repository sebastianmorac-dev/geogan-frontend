import axios from 'axios';
import useAuthStore from '../store/authStore';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// ─── Refactored Request Interceptor ───────────────────────────
apiClient.interceptors.request.use(
    (config) => {
        // Retrieve user from the Zustand store (token lives inside user)
        const { user } = useAuthStore.getState();

        // 1. Inject Bearer Token (REQUIRED to stop 401 errors)
        if (user?.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }

        // 2. Keep your custom X-Usuario-Id for backend internal logic
        if (user?.usuario_id) {
            config.headers['X-Usuario-Id'] = String(user.usuario_id);
        }

        return config;
    },
    (error) => Promise.reject(error)
);
// ─── Interceptor de Response ──────────────────────────────────
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Solo cerramos sesión si realmente no hay un error de red
            console.warn("Sesión expirada o token inválido.");
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export default apiClient;