import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store de Autenticación — GeoGan
 *
 * Maneja el estado global del usuario autenticado con persistencia
 * en localStorage para resistir recargas de página (crítico en
 * zonas de baja conectividad).
 *
 * Convención: se usa snake_case (usuario_id, nombre, rol, token)
 * para mantener simetría con los schemas Pydantic del backend.
 */
const useAuthStore = create(
    persist(
        (set, get) => ({
            // --- Estado ---
            user: null, // { usuario_id: number, nombre: string, rol: string, token: string, id_finca: number|null } | null
            isAuthenticated: false,

            // --- Acciones ---

            /**
             * Establece el usuario autenticado.
             * @param {{ usuario_id: number, nombre: string, rol: string, token: string, id_finca?: number }} userData
             */
            login: (userData) => {
                const numericId = Number(userData.usuario_id);
                if (import.meta.env.DEV) {
                    console.log('[authStore] login() — raw usuario_id:', userData.usuario_id, '→ Number():', numericId);
                }
                set({
                    user: {
                        usuario_id: numericId,
                        nombre: userData.nombre,
                        rol: userData.rol,
                        email: userData.email ?? null,
                        token: userData.token,
                    },
                    isAuthenticated: true,
                });
            },

            /** Limpia el estado de autenticación. */
            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),

            /**
             * Verifica si el usuario tiene un rol específico.
             * Útil para operaciones sensibles (e.g. borrado de animales
             * requiere 'propietario' o 'superadmin').
             * @param {string} role
             * @returns {boolean}
             */
            hasRole: (role) => {
                const { user } = get();
                return user?.rol === role;
            },

            /**
             * Verifica si el usuario puede ejecutar operaciones sensibles
             * como el borrado de animales.
             * @returns {boolean}
             */
            canDeleteAnimals: () => {
                const { user } = get();
                return user?.rol === 'propietario' || user?.rol === 'superadmin';
            },

            /**
             * Verifica si el usuario puede registrar animales.
             * Roles permitidos: propietario, encargado, superadmin.
             * @returns {boolean}
             */
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
            // Versión 2: usuario_id debe ser numérico.
            // Datos viejos (version 0/1) se borran automáticamente.
            version: 2,
            migrate: (persistedState, version) => {
                if (version < 2) {
                    // Datos viejos con usuario_id string → forzar re-login
                    console.warn('[authStore] Migrando datos viejos (v' + version + ') → limpiando sesión');
                    return { user: null, isAuthenticated: false };
                }
                return persistedState;
            },
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

export default useAuthStore;
