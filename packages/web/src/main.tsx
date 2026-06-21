import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './lib/pwaInstall'; // captura beforeinstallprompt desde el arranque
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './theme';
import './styles/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No se encontró #root');

// Service worker: necesario para que la app sea instalable (solo en producción).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* la instalación es opcional: si falla, la app sigue funcionando */
    });
  });
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
