import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

/**
 * QueryClient — GeoGan
 *
 * Configuración de TanStack Query para caché de datos (animales, pesajes).
 * - staleTime: 5 min → reduce peticiones en zonas de baja conectividad
 * - retry: 2 → reintenta en caso de fallo de red
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutos
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Fix global: Prevenir que la rueda del ratón cambie los inputs de tipo number al hacer scroll
document.addEventListener("wheel", function(event){
  if(document.activeElement.type === "number"){
      document.activeElement.blur();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
