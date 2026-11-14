import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';

// Registro de Service Worker para PWA
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('Nueva version disponible.');
  },
  onOfflineReady() {
    console.info('Aplicacion lista para trabajar sin conexion.');
  },
});

// Configuracion de alto rendimiento (Skill 3)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de vigencia en cache (navegacion 0ms)
      gcTime: 1000 * 60 * 30, // 30 minutos de persistencia en memoria
      refetchOnWindowFocus: false, // Evita recargas redundantes en moviles
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
