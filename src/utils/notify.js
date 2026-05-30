import toast from 'react-hot-toast';

/**
 * notify — GeoGan
 * Sistema centralizado de notificaciones usando react-hot-toast.
 */

export function notify(message, type = 'info') {
    switch (type) {
        case 'success':
            toast.success(message);
            break;
        case 'error':
            toast.error(message);
            break;
        case 'warning':
            // react-hot-toast doesn't have a built-in warning, we can use a custom style or icon
            toast(message, {
                icon: '⚠️',
                style: {
                    border: '1px solid #eab308',
                    padding: '16px',
                    color: '#854d0e',
                    backgroundColor: '#fefce8'
                },
            });
            break;
        case 'info':
        default:
            toast(message);
            break;
    }
}

export function notifySuccess(message) { notify(message, 'success'); }
export function notifyError(message) { notify(message, 'error'); }
export function notifyWarning(message) { notify(message, 'warning'); }
