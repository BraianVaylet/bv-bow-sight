import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../lib/apiClient';
import { renderWithProviders } from '../test/utils';
import { Login } from './Login';

// Mock de la API de auth para controlar el resultado del login
vi.mock('../lib/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authApi } from '../lib/api/auth';
const loginMock = authApi.login as unknown as ReturnType<typeof vi.fn>;

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Alias'), { target: { value: 'brai' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'archery123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('<Login>', () => {
  beforeEach(() => loginMock.mockReset());

  it('en login exitoso redirige al home', async () => {
    loginMock.mockResolvedValueOnce({ user: { id: 1, alias: 'brai' } });
    renderWithProviders(<Login />);
    fillAndSubmit();
    expect(await screen.findByText('HOME_OK')).toBeInTheDocument();
    expect(loginMock).toHaveBeenCalledWith({ alias: 'brai', password: 'archery123' });
  });

  it('muestra el mensaje de error cuando las credenciales son inválidas', async () => {
    loginMock.mockRejectedValueOnce(
      new ApiClientError(401, 'UNAUTHENTICATED', 'Alias o contraseña incorrectos.'),
    );
    renderWithProviders(<Login />);
    fillAndSubmit();
    await waitFor(() =>
      expect(screen.getByText('Alias o contraseña incorrectos.')).toBeInTheDocument(),
    );
    // No navega: seguimos en login
    expect(screen.queryByText('HOME_OK')).not.toBeInTheDocument();
  });
});
