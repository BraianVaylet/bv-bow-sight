/**
 * Captura el evento `beforeinstallprompt` apenas se carga la app (antes de que se
 * monte cualquier botón) y lo guarda para que el botón de instalación lo dispare
 * cuando el usuario quiera. El navegador emite ese evento una sola vez si la PWA
 * es instalable, así que conviene escucharlo a nivel de módulo.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // evita el mini-infobar nativo; instalamos con nuestro botón
  deferred = e as BeforeInstallPromptEvent;
  emit();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  emit();
});

export const getInstallPrompt = (): BeforeInstallPromptEvent | null => deferred;
export const clearInstallPrompt = (): void => {
  deferred = null;
};
export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
