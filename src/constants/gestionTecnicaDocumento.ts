/** Opciones de tipo de adenda — Gestión técnica de documento. */
export const TIPOS_ADENDA = [
  'Equilibrio economico',
  'Reformulacion de presupuesto',
  'Extencion de vigencia',
] as const;

export type TipoAdenda = (typeof TIPOS_ADENDA)[number];
