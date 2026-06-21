import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './lib/pwaInstall'; // captura beforeinstallprompt desde el arranque
import { PERSIST_BUSTER, persister } from './lib/persistClient';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './theme';
import './styles/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No se encontró #root');

// El registro del service worker lo inyecta vite-plugin-pwa (injectRegister: 'auto').

createRoot(rootEl).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: PERSIST_BUSTER, maxAge: 1000 * 60 * 60 * 24 * 30 }}
    >
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
