import { describe, expect, it } from 'vitest';
import { makeApp, newJar, registerAndLogin, registerBody, req } from './helpers';

const json = (r: Response): Promise<any> => r.json();

describe('health', () => {
  it('responde ok', async () => {
    const app = makeApp();
    const res = await req(app, 'GET', '/api/health');
    expect(res.status).toBe(200);
    expect((await json(res)).status).toBe('ok');
  });
});

describe('auth', () => {
  it('registra y deja sesión válida (me)', async () => {
    const app = makeApp();
    const jar = await registerAndLogin(app, 'brai', 'archery123');
    const me = await req(app, 'GET', '/api/auth/me', { jar });
    expect(me.status).toBe(200);
    expect((await json(me)).user.alias).toBe('brai');
  });

  it('rechaza alias duplicado con 409', async () => {
    const app = makeApp();
    await registerAndLogin(app, 'dup', 'password123');
    const res = await req(app, 'POST', '/api/auth/register', {
      jar: newJar(),
      body: registerBody('dup'),
    });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe('CONFLICT');
  });

  it('login con contraseña incorrecta da 401 genérico', async () => {
    const app = makeApp();
    await registerAndLogin(app, 'brai', 'archery123');
    const res = await req(app, 'POST', '/api/auth/login', {
      jar: newJar(),
      body: { alias: 'brai', password: 'wrong-pass' },
    });
    expect(res.status).toBe(401);
  });

  it('logout invalida la sesión', async () => {
    const app = makeApp();
    const jar = await registerAndLogin(app);
    const out = await req(app, 'POST', '/api/auth/logout', { jar });
    expect(out.status).toBe(204);
    const me = await req(app, 'GET', '/api/auth/me', { jar });
    expect(me.status).toBe(401);
  });

  it('rechaza mutaciones sin token CSRF (403)', async () => {
    const app = makeApp();
    const jar = await registerAndLogin(app);
    const res = await req(app, 'POST', '/api/bow-setups', {
      jar,
      csrf: false,
      body: { name: 'X', notes: 'sin csrf' },
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe('CSRF_INVALID');
  });

  it('valida el body (alias corto) con 400 + details', async () => {
    const app = makeApp();
    const res = await req(app, 'POST', '/api/auth/register', {
      jar: newJar(),
      body: { alias: 'ab', password: 'password123' },
    });
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0].path).toBe('alias');
  });

  it('rutas protegidas sin sesión dan 401', async () => {
    const app = makeApp();
    const res = await req(app, 'GET', '/api/bow-setups');
    expect(res.status).toBe(401);
  });

  it('rechaza registro sin pregunta de seguridad (400 + details)', async () => {
    const app = makeApp();
    const res = await req(app, 'POST', '/api/auth/register', {
      jar: newJar(),
      body: { alias: 'noquestion', password: 'password123' },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('alias availability', () => {
  it('reporta disponible/ocupado/ inválido', async () => {
    const app = makeApp();
    await registerAndLogin(app, 'taken');

    const free = await json(await req(app, 'GET', '/api/auth/alias-available?alias=libre'));
    expect(free).toEqual({ available: true, valid: true });

    const used = await json(await req(app, 'GET', '/api/auth/alias-available?alias=taken'));
    expect(used).toEqual({ available: false, valid: true });

    const bad = await json(await req(app, 'GET', '/api/auth/alias-available?alias=$$'));
    expect(bad.valid).toBe(false);
  });
});

describe('recovery', () => {
  it('flujo completo: pregunta → reset → login con nueva contraseña', async () => {
    const app = makeApp();
    const jar = newJar();
    await req(app, 'POST', '/api/auth/register', {
      jar,
      body: {
        alias: 'recover',
        password: 'password123',
        securityQuestionId: 5,
        securityAnswer: 'Rosario',
      },
    });

    // Paso 1: pregunta del alias
    const q = await json(await req(app, 'GET', '/api/auth/recovery/recover'));
    expect(q.question.id).toBe(5);

    // Paso 2: respuesta correcta (tolerante a mayúsculas/espacios) → nueva contraseña
    const reset = await req(app, 'POST', '/api/auth/recovery', {
      jar: newJar(),
      body: { alias: 'recover', answer: '  rosario  ', newPassword: 'newpassword123' },
    });
    expect(reset.status).toBe(200);

    // La contraseña vieja ya no sirve
    const old = await req(app, 'POST', '/api/auth/login', {
      jar: newJar(),
      body: { alias: 'recover', password: 'password123' },
    });
    expect(old.status).toBe(401);

    // La nueva sí
    const fresh = await req(app, 'POST', '/api/auth/login', {
      jar: newJar(),
      body: { alias: 'recover', password: 'newpassword123' },
    });
    expect(fresh.status).toBe(200);
  });

  it('respuesta incorrecta da 401', async () => {
    const app = makeApp();
    await req(app, 'POST', '/api/auth/register', {
      jar: newJar(),
      body: {
        alias: 'rec2',
        password: 'password123',
        securityQuestionId: 1,
        securityAnswer: 'correcta',
      },
    });
    const res = await req(app, 'POST', '/api/auth/recovery', {
      jar: newJar(),
      body: { alias: 'rec2', answer: 'incorrecta', newPassword: 'newpassword123' },
    });
    expect(res.status).toBe(401);
  });

  it('alias inexistente en paso 1 da 404', async () => {
    const app = makeApp();
    const res = await req(app, 'GET', '/api/auth/recovery/fantasma');
    expect(res.status).toBe(404);
  });
});
