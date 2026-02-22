import apiClient from './client';

/**
 * Auth Service — GeoGan
 *
 * Servicios de autenticación contra el backend FastAPI.
 * Endpoint: POST /usuarios/login
 *
 * El backend espera: { email: string, password: string }
 * y responde con el objeto usuario: { usuario_id, nombre, rol, email }
 */

/**
 * Autentica un usuario contra el backend.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ usuario_id: number, nombre: string, rol: string, email: string }>}
 * @throws {Error} Si las credenciales son inválidas (401) o el usuario no existe (404)
 */
export async function loginUser(credentials) {
    const response = await apiClient.post('/usuarios/login', {
        email: credentials.email,
        password: credentials.password,
    });

    return response.data;
}
