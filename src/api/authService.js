import api from './client';

export const loginUser = async (data) => {
    // 1. Transformamos el JSON de React al formato Formulario que exige FastAPI
    const formData = new URLSearchParams();
    formData.append('username', data.email);
    formData.append('password', data.password);

    // 2. Enviamos la petición
    const response = await api.post('/usuarios/login', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    return response.data;
};