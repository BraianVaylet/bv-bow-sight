import type { SecurityQuestion } from '@bv/shared';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoFull } from '../components/Logo';
import { Button, Card, FieldError, Input, Label } from '../components/ui';
import { authApi } from '../lib/api/auth';
import { ApiClientError } from '../lib/apiClient';
import { friendlyError } from '../lib/errorMessage';

export function Recover() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [alias, setAlias] = useState('');
  const [question, setQuestion] = useState<SecurityQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const findQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await authApi.recoveryQuestion(alias.trim());
      setQuestion(r.question);
      setStep(2);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setFieldErrors({ confirm: 'Las contraseñas no coinciden' });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await authApi.recoveryReset({ alias: alias.trim(), answer, newPassword });
      setStep(3);
    } catch (err) {
      if (err instanceof ApiClientError && err.details) {
        const out: Record<string, string> = {};
        for (const d of err.details)
          out[d.path === 'newPassword' ? 'newPassword' : d.path] = d.message;
        setFieldErrors(out);
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const header = (subtitle: string) => (
    <div className="flex flex-col items-center gap-2">
      <LogoFull className="mb-1 h-11 w-auto text-fg" />
      <h1 className="text-xl font-semibold text-fg">Recuperá tu cuenta</h1>
      <p className="text-center text-sm text-muted">{subtitle}</p>
    </div>
  );

  if (step === 3) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <LogoFull className="mb-1 h-11 w-auto text-fg" />
          <h1 className="text-xl font-semibold text-fg">Contraseña actualizada</h1>
          <p className="text-center text-sm text-muted">Ya podés entrar con tu nueva contraseña.</p>
        </div>
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (step === 2 && question) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
        {header(`Respondé la pregunta de seguridad de «${alias.trim()}».`)}
        <Card>
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
            {error && <FieldError>{error}</FieldError>}
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <p className="text-sm font-medium text-fg">{question.text}</p>
            </div>
            <div>
              <Label htmlFor="answer">Tu respuesta</Label>
              <Input
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                autoFocus
                required
              />
              <p className="mt-1 text-sm text-muted">No distingue mayúsculas de minúsculas.</p>
            </div>
            <div>
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldError>{fieldErrors.newPassword}</FieldError>
            </div>
            <div>
              <Label htmlFor="confirm">Repetí la nueva contraseña</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
              <FieldError>{fieldErrors.confirm}</FieldError>
            </div>
            <Button type="submit" loading={loading}>
              Cambiar contraseña
            </Button>
            <p className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setAnswer('');
                  setError(null);
                  setFieldErrors({});
                }}
                className="text-sm font-medium text-muted hover:text-fg"
              >
                Usar otro alias
              </button>
            </p>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
      {header('Ingresá tu alias y te mostramos tu pregunta de seguridad.')}
      <Card>
        <form onSubmit={findQuestion} className="flex flex-col gap-4">
          {error && <FieldError>{error}</FieldError>}
          <div>
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              required
            />
          </div>
          <Button type="submit" loading={loading}>
            Continuar
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-primary-ink hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
