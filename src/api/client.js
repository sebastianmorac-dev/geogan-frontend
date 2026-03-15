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