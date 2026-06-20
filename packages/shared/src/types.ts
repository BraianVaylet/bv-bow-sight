/**
 * Tipos de las entidades tal como las devuelve la API (camelCase).
 * Las filas de la DB (snake_case) se mapean a estos tipos en los repositories.
 */

export interface PublicUser {
  id: number;
  alias: string;
}

export interface Setup {
  id: number;
  name: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type BowSetup = Setup;
export type ArrowSetup = Setup;

export interface SightConfigListItem {
  id: number;
  name: string;
  bowSetupId: number | null;
  bowSetupName: string | null;
  defaultArrowSetupId: number | null;
  scaleMin: number;
  scaleMax: number;
  distanceCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ArrowSetRef {
  id: number;
  name: string;
}

export interface Distance {
  id: number;
  arrowSetupId: number;
  scaleValue: number;
  distanceM: number;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SightConfigDetail {
  id: number;
  name: string;
  bowSetupId: number | null;
  bowSetupName: string | null;
  defaultArrowSetupId: number | null;
  scaleMin: number;
  scaleMax: number;
  /** Sets de flechas que tienen distancias cargadas en esta mira (para la botonera). */
  arrowSets: ArrowSetRef[];
  distances: Distance[];
}
