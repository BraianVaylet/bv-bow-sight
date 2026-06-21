/**
 * Preferencias locales del dispositivo (no atadas a la cuenta).
 * Pensadas para uso en el campo de tiro desde un mismo teléfono / PWA.
 */

const DEFAULT_SIGHT_KEY = 'bv-default-sight';
const ZOOM_KEY = 'bv-mark-zoom';
/** Flag por sesión: ya hicimos la redirección a la mira por defecto. */
const ENTERED_KEY = 'bv-entered-session';

// ── Mira por defecto ──

/** Id de la mira a la que entrar directo al abrir la app. `null` = ninguna. */
export function getDefaultSightId(): number | null {
  try {
    const raw = localStorage.getItem(DEFAULT_SIGHT_KEY);
    const n = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setDefaultSightId(id: number | null): void {
  try {
    if (id == null) localStorage.removeItem(DEFAULT_SIGHT_KEY);
    else localStorage.setItem(DEFAULT_SIGHT_KEY, String(id));
  } catch {
    /* storage no disponible */
  }
}

// ── Redirección de arranque (una vez por sesión) ──

export function hasEnteredThisSession(): boolean {
  try {
    return sessionStorage.getItem(ENTERED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markEnteredThisSession(): void {
  try {
    sessionStorage.setItem(ENTERED_KEY, '1');
  } catch {
    /* storage no disponible */
  }
}

/** Se llama al cerrar sesión para que el próximo login vuelva a redirigir. */
export function clearEnteredThisSession(): void {
  try {
    sessionStorage.removeItem(ENTERED_KEY);
  } catch {
    /* storage no disponible */
  }
}

// ── Zoom de las marcas de mira ──

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.25;
/** Zoom inicial (sin preferencia guardada): el del medio del rango permitido. */
export const ZOOM_DEFAULT = (ZOOM_MIN + ZOOM_MAX) / 2;

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

export function getMarkZoom(): number {
  try {
    const raw = localStorage.getItem(ZOOM_KEY);
    if (raw == null) return ZOOM_DEFAULT;
    return clampZoom(Number(raw));
  } catch {
    return ZOOM_DEFAULT;
  }
}

export function setMarkZoom(z: number): void {
  try {
    localStorage.setItem(ZOOM_KEY, String(clampZoom(z)));
  } catch {
    /* storage no disponible */
  }
}
