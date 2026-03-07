import apiClient from './client';

/**
 * Auth Service — GeoGan
 *
 * Servicios de autenticación contra el backend FastAPI.
 * Endpoint: POST /usuarios/login
 *
 * El backend espera: { correo: string, contrasena: string }
 * y responde con: { message, usuario_id, nombre, rol, token, token_type }
 */

/**
 * Autentica un usuario contra el backend.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ usuario_id: number, nombre: string, rol: string, token: string }>}
 * @throws {Error} Si las credenciales son inválidas (401) o el usuario no existe (404)
 */
export async function loginUser(credentials) {
    const response = await apiClient.post('/usuarios/login', {
        correo: credentials.email,
        contrasena: credentials.password,
    });

    return response.data;
}
