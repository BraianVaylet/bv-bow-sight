import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const THEME_KEY = 'bv-theme';
const ACCENT_KEY = 'bv-accent';

/** Colores base disponibles para la app (el verde es el original). */
export type AccentId = 'green' | 'blue' | 'red' | 'orange' | 'yellow' | 'magenta';

export const ACCENTS: { id: AccentId; label: string; base: string }[] = [
  { id: 'green', label: 'Verde', base: '#30bd1a' },
  { id: 'blue', label: 'Azul', base: '#307bd1' },
  { id: 'red', label: 'Rojo', base: '#d13030' },
  { id: 'orange', label: 'Naranja', base: '#d18330' },
  { id: 'yellow', label: 'Amarillo', base: '#d1bc30' },
  { id: 'magenta', label: 'Magenta', base: '#c430d1' },
];

const DEFAULT_ACCENT: AccentId = 'green';
const FALLBACK_BASE = '#30bd1a';
/** Tinta oscura para texto sobre colores claros (igual que --on-primary original). */
const DARK_INK = '#18181b';

// ── Utilidades de color ──
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Mezcla `hex` hacia `target` (0 = sin cambios, 1 = target puro). */
function mix(hex: string, target: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [tr, tg, tb] = hexToRgb(target);
  return rgbToHex(r + (tr - r) * amount, g + (tg - g) * amount, b + (tb - b) * amount);
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco). */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Aplica el color base como variables CSS sobre el <html>.
 * Si el color base es muy oscuro el texto encima pasa a blanco; si es claro,
 * usa la tinta oscura. Elegimos el que dé mejor contraste real.
 */
function applyAccent(base: string, theme: Theme): void {
  const lum = luminance(base);
  const onPrimary = contrast(lum, 1) >= contrast(lum, luminance(DARK_INK)) ? '#ffffff' : DARK_INK;
  const strong = mix(base, '#000000', 0.16); // hover, un poco más oscuro
  // Tinta para textos/links sobre el fondo: aclarar en oscuro, oscurecer en claro.
  const ink = theme === 'dark' ? mix(base, '#ffffff', 0.3) : mix(base, '#000000', 0.35);
  // Tinte suave para fondos/selección: casi blanco en claro, casi negro en oscuro.
  const soft = theme === 'dark' ? mix(base, '#000000', 0.86) : mix(base, '#ffffff', 0.88);

  const root = document.documentElement.style;
  root.setProperty('--primary', base);
  root.setProperty('--primary-strong', strong);
  root.setProperty('--primary-ink', ink);
  root.setProperty('--primary-soft', soft);
  root.setProperty('--on-primary', onPrimary);
}

/** Color de fondo del navegador (barra de estado) por tema. */
const THEME_COLOR: Record<Theme, string> = { light: '#f7f8f3', dark: '#191b16' };

function syncThemeColor(theme: Theme): void {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

function initialTheme(): Theme {
  // El script anti-FOUC de index.html ya resolvió y aplicó el tema antes del paint.
  const applied = document.documentElement.dataset.theme;
  if (applied === 'light' || applied === 'dark') return applied;
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  // Default claro (cremoso), salvo que el sistema pida oscuro.
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialAccent(): AccentId {
  const stored = localStorage.getItem(ACCENT_KEY) as AccentId | null;
  return ACCENTS.some((a) => a.id === stored) ? (stored as AccentId) : DEFAULT_ACCENT;
}

interface ThemeValue {
  theme: Theme;
  toggle: () => void;
  accent: AccentId;
  setAccent: (id: AccentId) => void;
}

const ThemeContext = createContext<ThemeValue>({
  theme: 'dark',
  toggle: () => {},
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [accent, setAccent] = useState<AccentId>(initialAccent);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    syncThemeColor(theme);
  }, [theme]);

  useEffect(() => {
    const base = ACCENTS.find((a) => a.id === accent)?.base ?? FALLBACK_BASE;
    applyAccent(base, theme);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent, theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return (
    <ThemeContext.Provider value={{ theme, toggle, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
