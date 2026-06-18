import type { MovimientoDocumentoTecnicoObra } from '../types/database';

export interface MovimientoDocumentoInput {
  fecha_solicitud?: string | null;
  fecha_entrada?: string | null;
  fecha_salida?: string | null;
  no_tramite?: string | null;
  departamento?: string | null;
}

type RangoFechas = { inicio: string; fin: string };

function normalizarFecha(fecha?: string | null): string | null {
  if (!fecha) return null;
  const d = fecha.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/** Rango [entrada, salida]; salida ausente = mismo día que entrada. */
export function rangoMovimiento(mov: MovimientoDocumentoInput): RangoFechas | null {
  const entrada = normalizarFecha(mov.fecha_entrada);
  if (!entrada) return null;
  const salida = normalizarFecha(mov.fecha_salida) || entrada;
  if (salida < entrada) return null;
  return { inicio: entrada, fin: salida };
}

function rangosSeSolapan(a: RangoFechas, b: RangoFechas): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

function huellaMovimiento(mov: MovimientoDocumentoInput): string {
  const rango = rangoMovimiento(mov);
  return [
    rango?.inicio ?? '',
    rango?.fin ?? '',
    normalizarFecha(mov.fecha_solicitud) ?? '',
    (mov.no_tramite || '').trim().toLowerCase(),
    (mov.departamento || '').trim().toLowerCase(),
  ].join('|');
}

function normalizarTramite(tramite?: string | null): string {
  return (tramite || '').trim();
}

/**
 * Valida un movimiento nuevo contra los existentes del mismo documento.
 * Devuelve mensaje de error o null si es válido.
 */
export function validarMovimientoDocumento(
  existentes: MovimientoDocumentoTecnicoObra[],
  nuevo: MovimientoDocumentoInput,
  excluirId?: string,
): string | null {
  const lista = excluirId ? existentes.filter((m) => m.id !== excluirId) : existentes;

  const tramite = normalizarTramite(nuevo.no_tramite);
  if (!tramite) {
    return 'El número de trámite es obligatorio.';
  }

  if (!normalizarFecha(nuevo.fecha_entrada)) {
    return 'La fecha de entrada es obligatoria (inicio del movimiento).';
  }

  const rangoNuevo = rangoMovimiento(nuevo);
  if (!rangoNuevo) {
    return 'La fecha de salida no puede ser anterior a la fecha de entrada.';
  }

  const huellaNueva = huellaMovimiento(nuevo);

  for (const existente of lista) {
    const tramiteExistente = normalizarTramite(existente.no_tramite);
    if (tramiteExistente && tramite.toLowerCase() === tramiteExistente.toLowerCase()) {
      return `El número de trámite «${tramite}» ya está registrado en este documento.`;
    }

    if (huellaNueva === huellaMovimiento(existente)) {
      return 'Este movimiento ya existe en el documento (mismos datos).';
    }

    const rangoExistente = rangoMovimiento(existente);
    if (rangoExistente && rangosSeSolapan(rangoNuevo, rangoExistente)) {
      return `Las fechas chocan con otro movimiento (${rangoExistente.inicio} — ${rangoExistente.fin}).`;
    }
  }

  return null;
}

/** Orden cronológico: más antiguo primero (por entrada, luego salida). */
export function ordenarMovimientosDocumento(
  movimientos: MovimientoDocumentoTecnicoObra[],
): MovimientoDocumentoTecnicoObra[] {
  return [...movimientos].sort((a, b) => {
    const claveA = claveOrdenMovimiento(a);
    const claveB = claveOrdenMovimiento(b);
    if (claveA !== claveB) return claveA.localeCompare(claveB);
    return (a.no_tramite || '').localeCompare(b.no_tramite || '', 'es');
  });
}

function claveOrdenMovimiento(mov: MovimientoDocumentoTecnicoObra): string {
  const rango = rangoMovimiento(mov);
  if (rango) return `${rango.inicio}|${rango.fin}`;
  const fallback = normalizarFecha(mov.fecha_solicitud);
  return fallback ? `${fallback}|${fallback}` : '9999-99-99|9999-99-99';
}
