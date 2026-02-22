import apiClient from './client';

/**
 * Animal Service — GeoGan
 *
 * Servicios CRUD para la tabla public.animales.
 * Usa apiClient que ya inyecta X-Usuario-Id automáticamente.
 *
 * Convención: snake_case para id_finca, id_propietario, etc.
 */

/**
 * Obtiene la lista de animales.
 * @returns {Promise<Array>} Lista de animales
 */
export async function getAnimales() {
    const response = await apiClient.get('/animales/');
    return response.data;
}

/**
 * Registra un nuevo animal.
 * @param {Object} data - Datos del animal (incluye id_finca e id_propietario)
 * @returns {Promise<Object>} Animal creado
 */
export async function createAnimal(data) {
    const response = await apiClient.post('/animales/', {
        codigo_identificacion: data.codigo_identificacion,
        especie: data.especie,
        raza: data.raza,
        sexo: data.sexo,
        peso: parseFloat(data.peso), // Siempre float para GMD
        fecha_ingreso: data.fecha_ingreso,
        estado: data.estado,
        id_finca: data.id_finca,
        id_propietario: data.id_propietario,
    });
    return response.data;
}
