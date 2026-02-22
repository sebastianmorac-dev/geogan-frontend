import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store de Autenticación — GeoGan
 *
 * Maneja el estado global del usuario autenticado con persistencia
 * en localStorage para resistir recargas de página (crítico en
 * zonas de baja conectividad).
 *
 * Convención: se usa snake_case (usuario_id, nombre, rol, email)
 * para mantener simetría con los schemas Pydantic del backend.
 */
const useAuthStore = create(
    persist(
        (set, get) => ({
            // --- Estado ---
            user: null, // { usuario_id: number, nombre: string, rol: string, email: string } | null
            isAuthenticated: false,

            // --- Acciones ---

            /**
             * Establece el usuario autenticado.
             * @param {{ usuario_id: number, nombre: string, rol: string, email: string }} userData
             */
            login: (userData) =>
                set({
                    user: {
                        usuario_id: userData.usuario_id,
                        nombre: userData.nombre,
                        rol: userData.rol,
                        email: userData.email,
                    },
                    isAuthenticated: true,
                }),

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
        }),
        {
            name: 'auth-storage', // key en localStorage
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

export default useAuthStore;
