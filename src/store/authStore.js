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
            isHydrated: false,

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
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isHydrated = true;
                }
            },
        }
    )
);

export default useAuthStore;