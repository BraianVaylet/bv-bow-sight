import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoFull } from '../components/Logo';
import { Button, Card, FieldError, Input, Label } from '../components/ui';
import { useLogin } from '../hooks/useAuth';
import { ApiClientError } from '../lib/apiClient';

export function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');

  const error = login.error instanceof ApiClientError ? login.error : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ alias, password }, { onSuccess: () => navigate('/') });
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 pt-16">
      <div className="flex flex-col items-center gap-3">
        <LogoFull className="h-11 w-auto text-fg" />
        <div className="text-center">
          <h1 className="text-xl font-semibold text-fg">Entrar</h1>
          <p className="text-sm text-muted">Registrá la calibración de tu mira.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <FieldError>{error.message}</FieldError>}
          <Button type="submit" loading={login.isPending}>
            Entrar
          </Button>
          <p className="text-center">
            <Link to="/recover" className="text-sm font-medium text-muted hover:text-fg">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        </form>
      </Card>

      <p className="text-center text-sm text-muted">
        ¿No tenés cuenta?{' '}
        <Link to="/register" className="font-medium text-primary-ink hover:underline">
          Crear una
        </Link>
      </p>
    </div>
  );
}
