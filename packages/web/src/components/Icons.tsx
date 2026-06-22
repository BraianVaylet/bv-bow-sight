import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/** Wrapper de íconos en estilo línea (stroke 2, redondeado), igual que bv-cross. */
function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Cerrar sesión (igual que bv-cross). */
export const LogoutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Icon>
);

/** Paleta de colores (selector de color de la app). */
export const PaletteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
  </Icon>
);

/** Información (ayuda contextual). */
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="11" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Icon>
);

/** Estrella contorno (marcar mira como predeterminada). */
export const StarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Icon>
);

/** Estrella rellena (mira predeterminada activa). */
export const StarFilledIcon = (p: IconProps) => (
  <Icon {...p}>
    <path
      fill="currentColor"
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
    />
  </Icon>
);

/** Más (zoom in). */
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

/** Menos (zoom out). */
export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

/** Sol (toggle de tema, igual que bv-cross). */
export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </Icon>
);

/** Luna (toggle de tema, igual que bv-cross). */
export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Icon>
);

/** Arco compuesto con flecha montada (para setups de arco). */
export const BowIcon = (p: IconProps) => (
  <Icon {...p}>
    {/* Pala / riser del arco (curva) */}
    <path d="M7 5c5 3 5 11 0 14" />
    {/* Cuerda entre las poleas */}
    <path d="M7 5v14" />
    {/* Poleas (cams) en los extremos */}
    <circle cx="7" cy="5" r="1.6" />
    <circle cx="7" cy="19" r="1.6" />
    {/* Flecha montada */}
    <path d="M5 12h15" />
    <path d="M16 8.5l3.5 3.5-3.5 3.5" />
  </Icon>
);

/** Flecha (para sets de flechas). Dirección única: punta a la derecha. */
export const ArrowIcon = (p: IconProps) => (
  <Icon {...p}>
    {/* Astil */}
    <path d="M2 12h17" />
    {/* Punta */}
    <path d="M14 7l5 5-5 5" />
    {/* Plumas / vanes: trazos paralelos que cruzan el astil en la culata */}
    <path d="M4 9l3 6" />
    <path d="M7 9l3 6" />
  </Icon>
);
