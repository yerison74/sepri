/** Tokens visuales — Gestión técnica de documento (superficies SEPRI compartidas). */

import {
  SEPRI_CARD,
  SEPRI_CARD_RAISED,
  SEPRI_INSET,
  SEPRI_BADGE,
  SEPRI_FIELD_SHADOW,
} from './sepriSurfaces';

export {
  SEPRI_CARD,
  SEPRI_CARD_RAISED,
  SEPRI_INSET,
  SEPRI_BADGE,
  SEPRI_FIELD_SHADOW,
} from './sepriSurfaces';

export const GT_PAGE =
  'flex flex-col gap-4 min-h-[calc(100dvh-5.5rem)] sm:min-h-[calc(100dvh-6rem)]';

export const GT_WORKSPACE =
  'flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:grid-rows-[minmax(0,2fr)_minmax(0,3fr)]';

export const GT_WORKSPACE_SHELL =
  `flex-1 min-h-0 rounded-2xl bg-warm-50/50 p-3 sm:p-4 ${SEPRI_CARD}`;

export const GT_ALERTA =
  'flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-sm shrink-0 shadow-soft';

export const GT_ALERTA_INFO = `${GT_ALERTA} bg-amber-50/70 text-amber-900`;
export const GT_ALERTA_OK = `${GT_ALERTA} bg-emerald-50/70 text-emerald-800`;
export const GT_ALERTA_ERROR = `${GT_ALERTA} bg-red-50/70 text-red-800`;

export const GT_BLOQUE_FORM = `rounded-xl p-4 sm:p-5 space-y-4 ${SEPRI_INSET}`;

export const GT_BLOQUE_FORM_ACTIVO =
  'rounded-xl bg-primary-light/30 p-4 sm:p-5 space-y-4 shadow-soft-lg';

export const GT_BLOQUE_TITULO =
  'text-[11px] font-semibold text-stone-400 uppercase tracking-[0.12em]';

export const GT_TABLA_WRAP =
  `flex-1 min-h-0 overflow-auto rounded-xl bg-white/90 ${SEPRI_CARD}`;

export const GT_TABLA = 'sepri-table min-w-full text-sm';

export const GT_TABLA_HEAD =
  'sticky top-0 z-10 bg-warm-50/95 backdrop-blur-sm';

export const GT_TABLA_TH =
  'px-2.5 sm:px-3 py-2.5 text-left text-[11px] font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap';

export const GT_TABLA_TD = 'px-2.5 sm:px-3 py-2.5 text-stone-600 text-xs sm:text-sm';

export const GT_TARJETA_DETALLE = `rounded-xl p-3 sm:p-4 ${SEPRI_CARD}`;

export const GT_TARJETA_DETALLE_ACCENT =
  'rounded-xl bg-gradient-to-br from-primary-light/50 to-white p-3 sm:p-4 shadow-soft-lg';

export const GT_VACIO =
  `flex-1 flex flex-col items-center justify-center text-center px-6 py-8 min-h-[5.5rem] rounded-xl bg-warm-50/40 ${SEPRI_INSET}`;

export const GT_BADGE = SEPRI_BADGE;

export const GT_SUB_BLOQUE = `rounded-xl p-4 space-y-3 bg-white/80 ${SEPRI_CARD}`;

/** @deprecated usar SEPRI_FIELD_SHADOW */
export const SEPRI_INPUT_SHADOW = 'shadow-soft';
export const SEPRI_INPUT_FOCUS = SEPRI_FIELD_SHADOW;

/** @deprecated usar SEPRI_CARD */
export const SEPRI_ELEVATION_SM = 'shadow-soft';
export const SEPRI_ELEVATION_MD = 'shadow-soft-lg';
export const SEPRI_ELEVATION_LG = 'shadow-soft-lg';
