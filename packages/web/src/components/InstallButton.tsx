import { useEffect, useState } from 'react';
import { clearInstallPrompt, getInstallPrompt, subscribeInstall } from '../lib/pwaInstall';
import { Modal } from './ui/Modal';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** ¿La app ya corre instalada (standalone)? Entonces no ofrecemos instalar. */
const isStandalone = () => {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
};

/**
 * Botón para instalar la web app en el dispositivo. Solo aparece si el navegador
 * la considera instalable (`beforeinstallprompt`) o si es iOS (que no soporta ese
 * evento y requiere el paso manual "Agregar a inicio").
 */
export function InstallButton() {
  const [prompt, setPrompt] = useState(getInstallPrompt);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => subscribeInstall(() => setPrompt(getInstallPrompt())), []);

  if (isStandalone()) return null;
  const ios = isIOS();
  if (!prompt && !ios) return null;

  const onClick = async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      clearInstallPrompt();
      setPrompt(null);
    } else {
      setIosHelp(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label="Instalar app"
        title="Instalar app"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {iosHelp && (
        <Modal open onClose={() => setIosHelp(false)} title="Instalar en tu iPhone">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-fg">
            <li>
              Tocá el botón <strong>Compartir</strong> en la barra de Safari.
            </li>
            <li>
              Elegí <strong>Agregar a pantalla de inicio</strong>.
            </li>
            <li>
              Confirmá con <strong>Agregar</strong>.
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted">
            En iPhone la instalación es manual: no hay un botón automático como en Android.
          </p>
        </Modal>
      )}
    </>
  );
}
