/**
 * Índices de pestañas del sidebar en App.tsx (deben coincidir con `allTabs`).
 * Usados al navegar a rutas hijas y al volver con location.state.openTab.
 */
export const APP_TAB_INDEX = {
  DASHBOARD: 0,
  OBRAS: 1,
  CARGA_OBRAS: 2,
  TRAMITES: 3,
  ATENCION_CONTRATISTA: 4,
  CONFIGURACION: 5,
} as const;
