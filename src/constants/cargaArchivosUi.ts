/** Tokens visuales — módulo Carga de archivos / obras. */

import {
  SEPRI_CARD,
  SEPRI_CARD_RAISED,
  SEPRI_INSET,
  SEPRI_FIELD_SHADOW,
} from './sepriSurfaces';

export {
  SEPRI_CARD,
  SEPRI_CARD_RAISED,
  SEPRI_INSET,
  SEPRI_FIELD_SHADOW,
} from './sepriSurfaces';

export const CA_PAGE = 'flex flex-col gap-4 w-full';

/** Bloque principal: buscar y editar obra */
export const CA_HERO =
  `${SEPRI_CARD_RAISED} overflow-hidden ring-1 ring-primary/10`;

export const CA_HERO_HEADER =
  'flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-stone-100/80 bg-gradient-to-r from-primary-light/40 to-white';

export const CA_BLOQUE_BUSQUEDA =
  'rounded-xl bg-primary-light/25 p-4 sm:p-5 space-y-4 shadow-soft-lg';

export const CA_BLOQUE_TITULO =
  'text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em]';

export const CA_FIELD =
  'sepri-field w-full px-3.5 py-2.5 text-sm text-stone-700 placeholder:text-stone-400';

export const CA_LABEL = 'block text-xs font-medium text-stone-500 mb-1.5';

export const CA_ALERTA =
  'flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-sm shrink-0 shadow-soft';

export const CA_ALERTA_OK = `${CA_ALERTA} bg-emerald-50/80 text-emerald-800`;
export const CA_ALERTA_ERROR = `${CA_ALERTA} bg-red-50/80 text-red-800`;

export const CA_DROPZONE =
  `flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200/90 bg-warm-50/50 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary-light/20 cursor-pointer`;

export const CA_GRID_FILTROS = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';

export const CA_MODAL_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4';

export const CA_MODAL_PANEL =
  `${SEPRI_CARD_RAISED} w-full max-h-[90vh] overflow-y-auto`;
