import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/** Render con QueryClient (sin reintentos) + rutas mínimas para probar navegación. */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/login', homeLabel = 'HOME_OK' }: { route?: string; homeLabel?: string } = {},
): ReturnType<typeof render> {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={route} element={ui} />
          <Route path="/" element={<div>{homeLabel}</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
