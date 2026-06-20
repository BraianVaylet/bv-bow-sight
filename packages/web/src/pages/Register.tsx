import type { SecurityQuestion } from '@bv/shared';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoFull } from '../components/Logo';
import { Button, Card, FieldError, Input, Label, Select } from '../components/ui';
import { useRegister } from '../hooks/useAuth';
import { authApi } from '../lib/api/auth';
import { ApiClientError } from '../lib/apiClient';
import { friendlyError } from '../lib/errorMessage';

type AliasStatus = 'idle' | 'checking' | 'free' | 'taken' | 'invalid';

export function Register() {
  const navigate = useNavigate();
  const register = useRegister();

  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [answer, setAnswer] = useState('');

  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [aliasStatus, setAliasStatus] = useState<AliasStatus>('idle');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  // Errores de campo que vienen de la API (validación del server / alias en uso)
  const apiError = register.error instanceof ApiClientError ? register.error : null;
  const apiFieldError = (path: string) => apiError?.details?.find((d) => d.path === path)?.message;

  useEffect(() => {
    authApi
      .questions()
      .then((r) => setQuestions(r.questions))
      .catch(() =>
        setLoadError('No pudimos cargar las preguntas de seguridad. Recargá la página.'),
      );
  }, []);

  // Verificación de disponibilidad del alias con debounce.
  const aliasRef = useRef(alias);
  aliasRef.current = alias;
  useEffect(() => {
    const value = alias.trim();
    if (value.length < 3) {
      setAliasStatus('idle');
      return;
    }
    setAliasStatus('checking');
    const timer = setTimeout(() => {
      authApi
        .aliasAvailable(value)
        .then((r) => {
          if (aliasRef.current.trim() !== value) return;
          setAliasStatus(r.valid ? (r.available ? 'free' : 'taken') : 'invalid');
        })
        .catch(() => {
          if (aliasRef.current.trim() === value) setAliasStatus('idle');
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [alias]);

  const aliasError =
    apiFieldError('alias') ??
    localErrors.alias ??
    (aliasStatus === 'taken'
      ? 'Ese alias ya está en uso'
      : aliasStatus === 'invalid'
        ? 'De 3 a 30 caracteres: letras, números, punto, guion y guion bajo'
        : undefined);

  const aliasHint =
    aliasStatus === 'checking'
      ? 'Verificando…'
      : aliasStatus === 'free'
        ? 'Disponible ✓'
        : 'Con esto entrás a la app. No usamos email.';

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (password !== confirm) errors.confirm = 'Las contraseñas no coinciden';
    if (!questionId) errors.securityQuestionId = 'Elegí una pregunta';
    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }
    setLocalErrors({});
    register.mutate(
      {
        alias: alias.trim(),
        password,
        securityQuestionId: Number(questionId),
        securityAnswer: answer,
      },
      { onSuccess: () => navigate('/') },
    );
  };

  // Error general (no asociado a un campo concreto)
  const generalError = apiError && !apiError.details ? friendlyError(apiError) : loadError;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <LogoFull className="h-11 w-auto text-fg" />
        <div className="text-center">
          <h1 className="text-xl font-semibold text-fg">Crear cuenta</h1>
          <p className="text-sm text-muted">Solo un alias y una contraseña. Nada más.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {generalError && <FieldError>{generalError}</FieldError>}

          <div>
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              minLength={3}
              maxLength={30}
              required
            />
            {aliasError ? (
              <FieldError>{aliasError}</FieldError>
            ) : (
              <p
                className={`mt-1 text-sm ${aliasStatus === 'free' ? 'text-emerald-500' : 'text-muted'}`}
              >
                {aliasHint}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <FieldError>{apiFieldError('password')}</FieldError>
          </div>

          <div>
            <Label htmlFor="confirm">Repetí la contraseña</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            <FieldError>{localErrors.confirm}</FieldError>
          </div>

          <div>
            <Label htmlFor="question">Pregunta de seguridad</Label>
            <Select
              id="question"
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
              required
            >
              <option value="" disabled>
                Elegí una pregunta…
              </option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text}
                </option>
              ))}
            </Select>
            <FieldError>
              {localErrors.securityQuestionId ?? apiFieldError('securityQuestionId')}
            </FieldError>
          </div>

          <div>
            <Label htmlFor="answer">Respuesta</Label>
            <Input
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
            {apiFieldError('securityAnswer') ? (
              <FieldError>{apiFieldError('securityAnswer')}</FieldError>
            ) : (
              <p className="mt-1 text-sm text-muted">
                Guardala bien: es la única forma de recuperar tu cuenta.
              </p>
            )}
          </div>

          <Button type="submit" loading={register.isPending}>
            Crear cuenta
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-medium text-primary-ink hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
