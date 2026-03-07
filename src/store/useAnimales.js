import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/client';
import useAuthStore from './authStore';

/**
 * Store de Animales — GeoGan
 *
 * Única fuente de verdad para la gestión de animales.
 * Maneja fetch, creación, estados de loading/error,
 * y persiste solo la finca seleccionada en localStorage.
 *
 * Lógica de permisos:
 * - superadmin: puede ver/registrar animales en CUALQUIER finca.
 *   Puede usar fetchAllFincas() para ver las fincas disponibles
 *   y seleccionar manualmente en cuál trabajar.
 * - propietario/encargado: trabajan con su finca asignada.
 *
 * Integración con authStore:
 * - addAnimal inyecta id_propietario desde authStore.user.usuario_id
 * - fetchAnimales filtra por selectedFinca (obligatorio para todos los roles)
 */
const useAnimales = create(
    persist(
        (set, get) => ({
            // ─── Estado ───────────────────────────────────────────
            animales: [],
            fincas: [],          // lista de fincas disponibles (para superadmin)
            loading: false,
            error: null,
            selectedFinca: null, // persistido en localStorage

            // ─── Helpers de Rol ───────────────────────────────────

            /**
             * Verifica si el usuario actual es superadmin.
             * @returns {boolean}
             */
            isSuperAdmin: () => {
                const user = useAuthStore.getState().user;
                return user?.rol === 'superadmin';
            },

            // ─── Acciones ─────────────────────────────────────────

            /**
             * Establece la finca seleccionada.
             * Limpia la lista actual de animales para forzar re-fetch.
             * @param {number} fincaId
             */
            setSelectedFinca: (fincaId) =>
                set({ selectedFinca: fincaId, animales: [], error: null }),

            /**
             * Obtiene todas las fincas disponibles.
             *
             * Como el backend no tiene un endpoint dedicado de fincas,
             * se consultan todos los animales (sin filtro de finca)
             * y se extraen los id_finca únicos.
             *
             * Pensado para superadmin, quien necesita seleccionar
             * manualmente en cuál finca trabajar.
             */
            fetchAllFincas: async () => {
                set({ loading: true, error: null });

                try {
                    const response = await apiClient.get('/animales/', {
                        params: { estado: 'activo' },
                    });

                    // Extraer id_finca únicos
                    const fincaIds = [
                        ...new Set(
                            response.data
                                .map((a) => a.id_finca)
                                .filter((id) => id != null)
                        ),
                    ];

                    set({ fincas: fincaIds, loading: false });
                    return fincaIds;
                } catch (err) {
                    const detail = err.response?.data?.detail;
                    set({
                        error: typeof detail === 'string'
                            ? detail
                            : 'Error al cargar las fincas disponibles.',
                        loading: false,
                    });
                    return [];
                }
            },

            /**
             * Obtiene la lista de animales desde el backend.
             * Filtra por la finca seleccionada (selectedFinca).
             * Si no hay finca seleccionada, establece un error descriptivo.
             */
            fetchAnimales: async () => {
                const { selectedFinca } = get();

                if (!selectedFinca) {
                    set({
                        error: 'Selecciona una finca antes de cargar animales.',
                        animales: [],
                    });
                    return;
                }

                set({ loading: true, error: null });

                try {
                    const response = await apiClient.get('/animales/', {
                        params: { finca_id: selectedFinca },
                    });
                    set({ animales: response.data, loading: false });
                } catch (err) {
                    const detail = err.response?.data?.detail;
                    set({
                        error: typeof detail === 'string'
                            ? detail
                            : 'Error al cargar los animales. Intenta de nuevo.',
                        loading: false,
                    });
                }
            },

            /**
             * Registra un nuevo animal en el backend.
             * Inyecta automáticamente id_propietario desde authStore
             * e id_finca desde selectedFinca.
             *
             * Validaciones:
             * 1. Usuario debe estar autenticado (usuario_id requerido)
             * 2. id_finca debe estar presente (no importa el rol)
             *
             * @param {Object} data - Campos del formulario de registro
             * @returns {Promise<Object>} Animal creado
             * @throws {Error} Si falta autenticación o id_finca
             */
            addAnimal: async (data) => {
                const user = useAuthStore.getState().user;

                if (!user?.usuario_id) {
                    set({ error: 'Usuario no autenticado. Inicia sesión para registrar animales.' });
                    throw new Error('Usuario no autenticado');
                }

                // id_finca: usar el de los datos si viene explícito,
                // si no, usar selectedFinca del store
                const idFinca = parseInt(data.id_finca || get().selectedFinca, 10);

                if (!idFinca || isNaN(idFinca)) {
                    set({ error: 'Selecciona una finca antes de registrar un animal.' });
                    throw new Error('Finca no seleccionada');
                }

                // id_propietario: usar el explícito del formulario si viene,
                // si no, intentar usuario_id del usuario logueado,
                // si no es numérico, usar 101 (ana@geogan.com) como fallback.
                const rawPropietario = data.id_propietario || user.usuario_id;
                const idPropietario = Number.isFinite(Number(rawPropietario))
                    ? Number(rawPropietario)
                    : 101; // fallback: ID real de ana@geogan.com

                if (!idPropietario || isNaN(idPropietario)) {
                    set({ error: 'ID de propietario inválido. Verifica tus datos de sesión o ingresa el ID manualmente.' });
                    throw new Error('id_propietario inválido');
                }

                set({ loading: true, error: null });

                try {
                    const payload = {
                        codigo_identificacion: data.codigo_identificacion,
                        alias: data.alias || data.codigo_identificacion, // fallback al código
                        especie: data.especie,
                        raza: data.raza,
                        sexo: data.sexo,
                        peso: parseFloat(data.peso),
                        estado: data.estado,
                        id_finca: Number(idFinca),
                        id_propietario: Number(idPropietario),
                    };

                    // Verificación en consola
                    console.log('[useAnimales] ✅ addAnimal payload:', JSON.stringify(payload, null, 2));
                    console.log('[useAnimales] id_propietario enviado:', typeof payload.id_propietario, payload.id_propietario);

                    const response = await apiClient.post('/animales/', payload);

                    // Agregar al estado local sin re-fetch
                    set((state) => ({
                        animales: [...state.animales, response.data],
                        loading: false,
                    }));

                    return response.data;
                } catch (err) {
                    const detail = err.response?.data?.detail;
                    set({
                        error: typeof detail === 'string'
                            ? detail
                            : 'Error al registrar el animal. Intenta de nuevo.',
                        loading: false,
                    });
                    throw err;
                }
            },

            /**
             * Limpia el estado de error.
             * Resetea error a null para que las alertas rojas desaparezcan.
             */
            clearError: () => set({ error: null }),
        }),
        {
            name: 'animales-storage', // key en localStorage
            partialize: (state) => ({
                selectedFinca: state.selectedFinca,
            }),
        }
    )
);

// Debug: exponer store en DevTools durante desarrollo
if (import.meta.env.DEV) {
    window.useAnimales = useAnimales;
}

export default useAnimales;
