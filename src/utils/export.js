import * as XLSX from 'xlsx';
import { notifySuccess, notifyError } from './notify';

/**
 * Exporta un array de objetos a un archivo Excel (.xlsx)
 * @param {Array} data - Array de objetos a exportar
 * @param {String} filename - Nombre del archivo (sin extensión)
 */
export const exportToExcel = (data, filename) => {
    try {
        if (!data || data.length === 0) {
            notifyError("No hay datos para exportar.");
            return;
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
        notifySuccess(`Reporte Excel generado con éxito: ${filename}`);
    } catch (error) {
        console.error("Error exportando a Excel:", error);
        notifyError("Error al generar el reporte Excel.");
    }
};
