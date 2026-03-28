// src/components/modals/ModalOverlay.jsx
import React from 'react';

export default function ModalOverlay({ isOpen, onClose, title, children, maxWidth = 'md' }) {
    if (!isOpen) return null;

    // Control de anchos dinámicos (Empatía UX: modales anchos para tablas, angostos para forms)
    const maxWidthClass = {
        'sm': 'max-w-sm',
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl'
    }[maxWidth] || 'max-w-md';

    return (
        // El onClick aquí permite cerrar haciendo clic en el fondo oscuro
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#11261F]/90 backdrop-blur-sm p-4 transition-all" 
             onClick={onClose}>
            
            {/* El stopPropagation evita que el clic dentro del modal lo cierre */}
            <div className={`bg-white w-full ${maxWidthClass} rounded-[40px] p-10 shadow-2xl overflow-y-auto max-h-[90vh]`} 
                 onClick={e => e.stopPropagation()}>
                
                {title && (
                    <h3 className="text-2xl font-black text-[#11261F] uppercase mb-6 text-center tracking-tight">
                        {title}
                    </h3>
                )}
                
                {/* Aquí se inyectará el contenido específico de cada formulario */}
                {children}
            </div>
        </div>
    );
}
