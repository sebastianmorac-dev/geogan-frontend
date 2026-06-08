import React from 'react';
import useAuthStore from '../../store/authStore';

export default function RoleGuard({ allowedRoles, children }) {
    const user = useAuthStore((state) => state.user);

    // Si no hay usuario, renderizamos NADA
    if (!user || !user.rol) return null;

    // El superadmin tiene pase libre en todo. Si no es superadmin, validamos que su rol esté en la lista permitida.
    if (user.rol !== 'superadmin' && !allowedRoles.includes(user.rol)) {
        return null; 
    }

    // Si tiene el rol adecuado, renderizamos los botones/componentes que estén adentro
    return <>{children}</>;
}
