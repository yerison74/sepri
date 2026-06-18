/** Hojas del libro Excel — Gestión técnica de documento. */
export const HOJA_DOCUMENTOS = 'Documentos';
export const HOJA_MOVIMIENTOS = 'Movimientos';

export const DOCUMENTOS_EXCEL_HEADERS = [
  'Solicitud',
  'Cuadrantes',
  'Monto contrato base',
  'Tipo adenda anterior',
  'Codigo adenda anterior',
  'Monto adenda anterior',
  'Tipo adenda',
  'Codigo adenda actual',
  'No. adendas (solicituda)',
  'Monto adenda solicitada',
  'Monto total',
  'Observación',
  'Contratista',
  'ID SIGEDE',
] as const;

export const MOVIMIENTOS_EXCEL_HEADERS = [
  'Solicitud',
  'Fecha solicitud',
  'Fecha entrada',
  'No. trámite',
  'Departamento',
  'Fecha salida',
] as const;

export const DOCUMENTOS_EXCEL_EJEMPLO: string[] = [
  'Juan Pérez García',
  'Norte',
  '15000000.00',
  'Reformulacion de presupuesto',
  '12-345',
  '250000.00',
  'Equilibrio economico',
  '13-456',
  '3',
  '180000.00',
  '15430000.00',
  'Ejemplo de observación',
  'CONSTRUCTORA EJEMPLO SRL',
  'SIG-001, SIG-002',
];

export const MOVIMIENTOS_EXCEL_EJEMPLO: string[] = [
  'Juan Pérez García',
  '2025-01-15',
  '2025-01-20',
  'TR-2025-001',
  'Dirección técnica',
  '2025-02-01',
];

export const DOCUMENTOS_EXCEL_COL_WIDTHS = [
  { wch: 28 },
  { wch: 14 },
  { wch: 18 },
  { wch: 26 },
  { wch: 18 },
  { wch: 18 },
  { wch: 26 },
  { wch: 18 },
  { wch: 20 },
  { wch: 22 },
  { wch: 16 },
  { wch: 32 },
  { wch: 28 },
  { wch: 22 },
];

export const MOVIMIENTOS_EXCEL_COL_WIDTHS = [
  { wch: 28 },
  { wch: 16 },
  { wch: 16 },
  { wch: 18 },
  { wch: 24 },
  { wch: 16 },
];
