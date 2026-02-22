import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAnimales, createAnimal } from '../api/animalService';

/**
 * useAnimales — GeoGan
 *
 * Custom hook con TanStack Query para la gestión de animales.
 * - staleTime: 5 min → reduce peticiones en zonas rurales
 * - Invalidación automática del cache al crear un animal
 */

const ANIMALES_KEY = ['animales'];

/**
 * Hook para consultar la lista de animales.
 * @returns {UseQueryResult}
 */
export function useAnimalesList() {
    return useQuery({
        queryKey: ANIMALES_KEY,
        queryFn: getAnimales,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}

/**
 * Hook para crear un nuevo animal.
 * Invalida el cache de animales tras el registro exitoso.
 * @returns {UseMutationResult}
 */
export function useCreateAnimal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createAnimal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ANIMALES_KEY });
        },
    });
}
