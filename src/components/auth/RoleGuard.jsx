import React from 'react';
import useAuthStore from '../../store/authStore';

export default function RoleGuard({ allowedRoles, children }) {
    const user = useAuthStore((state) => state.user);

    // Empatía y Seguridad: Si no hay usuario, o su rol no está en la lista permitida, renderizamos NADA (null).
    if (!user || !user.rol || !allowedRoles.includes(user.rol)) {
        return null; 
    }

    // Si tiene el rol adecuado, renderizamos los botones/componentes que estén adentro
    return <>{children}</>;
}
