import { z } from 'zod';

/**
 * Schema de Animal — GeoGan
 *
 * Validación Zod que espeja el schema Pydantic del backend (tabla public.animales).
 * Convención: snake_case en todos los campos.
 *
 * Reglas de negocio:
 * - peso siempre float positivo (impacta GMD)
 * - fechas en formato ISO
 * - sexo estrictamente 'M' o 'H'
 * - estado con enum definido
 */

export const SEXO_OPTIONS = [
    { value: 'M', label: 'Macho' },
    { value: 'H', label: 'Hembra' },
];

export const ESTADO_OPTIONS = [
    { value: 'activo', label: 'Activo' },
    { value: 'cuarentena', label: 'Cuarentena' },
    { value: 'vendido', label: 'Vendido' },
    { value: 'muerto', label: 'Muerto' },
    { value: 'robo', label: 'Robo' },
    { value: 'consumo', label: 'Consumo' },
];

export const RAZA_OPTIONS = [
    { value: 'Brahman', label: 'Brahman' },
    { value: 'Holstein', label: 'Holstein' },
    { value: 'Jersey', label: 'Jersey' },
    { value: 'Normando', label: 'Normando' },
    { value: 'Angus', label: 'Angus' },
    { value: 'Gyr', label: 'Gyr' },
    { value: 'Simmental', label: 'Simmental' },
    { value: 'Charolais', label: 'Charolais' },
    { value: 'Cebú', label: 'Cebú' },
    { value: 'Pardo Suizo', label: 'Pardo Suizo' },
    { value: 'Senepol', label: 'Senepol' },
    { value: 'Mestizo', label: 'Mestizo' },
];

export const animalSchema = z.object({
    codigo_identificacion: z
        .string()
        .min(3, 'El código debe tener al menos 3 caracteres')
        .max(50, 'El código no puede exceder 50 caracteres'),

    especie: z
        .string()
        .min(1, 'La especie es obligatoria'),

    raza: z.enum(['Brahman', 'Holstein', 'Jersey', 'Normando', 'Angus', 'Gyr', 'Simmental', 'Charolais', 'Cebú', 'Pardo Suizo', 'Senepol', 'Mestizo'], {
        errorMap: () => ({ message: 'Selecciona una raza válida' }),
    }),

    sexo: z.enum(['M', 'H'], {
        errorMap: () => ({ message: 'Selecciona Macho (M) o Hembra (H)' }),
    }),

    peso: z
        .number({ invalid_type_error: 'El peso debe ser un número' })
        .positive('El peso debe ser positivo')
        .multipleOf(0.01, 'Máximo 2 decimales'),

    fecha_ingreso: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
        .default(() => new Date().toISOString().split('T')[0]),

    estado: z.enum(['activo', 'cuarentena', 'vendido', 'muerto', 'robo', 'consumo'], {
        errorMap: () => ({ message: 'Selecciona un estado válido' }),
    }).default('activo'),
});
