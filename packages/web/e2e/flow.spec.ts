import { type Page, expect, test } from '@playwright/test';

const password = 'password123';
const uniq = () => `e2e_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

/** Completa el formulario de registro (alias + contraseña + pregunta de seguridad). */
async function fillRegister(page: Page, alias: string) {
  await page.getByLabel('Alias').fill(alias);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Repetí la contraseña').fill(password);
  await page.getByLabel('Pregunta de seguridad').selectOption({ index: 1 });
  await page.getByLabel('Respuesta').fill('mi respuesta');
}

test.beforeEach(async ({ page }) => {
  // Aceptar automáticamente los confirm() de eliminar
  page.on('dialog', (d) => d.accept());
});

test('flujo completo: registro → setups → mira → 2 sets → editar/borrar → logout', async ({
  page,
}) => {
  const alias = uniq();

  // Ruta protegida sin sesión redirige a login
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);

  // Registro
  await page.getByRole('link', { name: 'Crear una' }).click();
  await fillRegister(page, alias);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Mis miras')).toBeVisible();

  // Dos sets de flechas
  await page.getByRole('link', { name: 'Sets de flechas' }).click();
  for (const [name, notes] of [
    ['VAP V1', 'Spine 400'],
    ['Gold Tip', 'Hunter 400'],
  ]) {
    await page.getByRole('button', { name: '+ Agregar' }).click();
    await page.getByLabel('Nombre').fill(name);
    await page.getByLabel('Observaciones').fill(notes);
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText(name)).toBeVisible();
  }
  await page.getByRole('button', { name: 'BV bow sight' }).click();

  // Setup de arco
  await page.getByRole('link', { name: 'Setups de arco' }).click();
  await page.getByRole('button', { name: '+ Agregar' }).click();
  await page.getByLabel('Nombre').fill('Evo NXT 35');
  await page.getByLabel('Observaciones').fill('60 lbs');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Evo NXT 35')).toBeVisible();
  await page.getByRole('button', { name: 'BV bow sight' }).click();

  // Crear mira
  await page.getByRole('link', { name: '+ Nueva mira' }).click();
  await page.getByLabel('Nombre').fill('Ultraview / Evo');
  await page.getByLabel(/Setup de arco/).selectOption({ label: 'Evo NXT 35' });
  await page.getByLabel(/Set de flechas por defecto/).selectOption({ label: 'VAP V1' });
  await page.getByLabel('Escala mín.').fill('0');
  await page.getByLabel('Escala máx.').fill('6');
  await page.getByRole('button', { name: 'Crear mira' }).click();
  await expect(page.getByText('Ultraview / Evo')).toBeVisible();

  // Distancia con VAP
  await page.getByRole('button', { name: '+ Nueva distancia' }).click();
  await page.getByLabel('Distancia (m)').fill('18');
  await page.getByLabel(/Escala/).fill('1.2');
  await page.getByLabel('Set de flechas').selectOption({ label: 'VAP V1' });
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('escala 1.2')).toBeVisible();

  // Distancia con Gold Tip → activa la botonera (2 sets)
  await page.getByRole('button', { name: '+ Nueva distancia' }).click();
  await page.getByLabel('Distancia (m)').fill('30');
  await page.getByLabel(/Escala/).fill('2.9');
  await page.getByLabel('Set de flechas').selectOption({ label: 'Gold Tip' });
  await page.getByRole('button', { name: 'Guardar' }).click();

  // Botonera con ambos sets
  await expect(page.getByRole('tab', { name: 'VAP V1' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Gold Tip' })).toBeVisible();

  // Editar la distancia de VAP (tap en el marcador) → cambia a 20 m
  await page.getByRole('tab', { name: 'VAP V1' }).click();
  await page.getByTitle('18 m · escala 1.2').click();
  await page.getByLabel('Distancia (m)').fill('20');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByTitle('20 m · escala 1.2')).toBeVisible();

  // Eliminar esa distancia (confirm auto-aceptado)
  await page.getByTitle('20 m · escala 1.2').click();
  await page.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByTitle('20 m · escala 1.2')).toHaveCount(0);

  // Logout
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('no se puede ver una mira ajena/inexistente (404 → mensaje)', async ({ page }) => {
  const alias = uniq();
  await page.goto('/register');
  await fillRegister(page, alias);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Mis miras')).toBeVisible();

  // Deep link a una mira que no es del usuario → la API responde 404 (anti-IDOR)
  await page.goto('/sight/999999');
  await expect(page.getByText('No se pudo cargar la mira.')).toBeVisible();
});
