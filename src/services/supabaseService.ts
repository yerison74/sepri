import { supabase } from '../lib/supabase';
import type {
  Obra,
  Tramite,
  MovimientoTramite,
  TiempoEnArea,
  NotificacionTiempo,
  HistorialUpload,
  ObrasFilters,
  TramitesFilters,
  ApiResponse,
  Area,
  FormularioContratista,
  MovimientoSolicitudContratista,
  ReporteObrasStats,
  ObraUbicacionGps,
  Contratista,
  DocumentoTecnicoObra,
  ObraSigedeResumen,
  MovimientoDocumentoTecnicoObra,
} from '../types/database';
import { aplicarFiltrosObrasEnQuery } from '../utils/aplicarFiltrosObrasQuery';

// ── Generador de token seguro (Web Crypto API) ──────────────────────────────
function generarToken(longitud = 32): string {
  const bytes = new Uint8Array(longitud);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, longitud);
}

/**
 * Servicio de Supabase para reemplazar las llamadas API del backend
 */

// ============================================
// SERVICIO DE ÁREAS
// ============================================

export const areasService = {
  /** Obtener todas las áreas definidas en la tabla `area`. */
  obtenerAreas: async (): Promise<Area[]> => {
    try {
      const { data, error } = await supabase
        .from('area')
        .select('*')
        .order('area', { ascending: true });
      if (error) throw error;
      return (data as Area[]) || [];
    } catch (error: any) {
      console.error('Error al obtener áreas:', error);
      throw new Error(error.message || 'Error al obtener áreas');
    }
  },
};

// ============================================
// SERVICIO DE FORMULARIO CONTRATISTA
// ============================================

const AREA_GESTION_CONTRATISTA = 'Oficina de gestión del contratista';

export const formularioContratistaService = {
  /** Garantiza registro espejo en `tramites` para cumplir FK de `movimientos_tramites.tramite_id`. */
  asegurarTramiteContratista: async (solicitudId: string): Promise<void> => {
    const { data: existing, error: selErr } = await supabase
      .from('tramites')
      .select('id')
      .eq('id', solicitudId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing?.id) return;

    const { data: solicitud, error: formErr } = await supabase
      .from('formulario_contratista')
      .select('*')
      .eq('id', solicitudId)
      .single();
    if (formErr) throw formErr;
    if (!solicitud) throw new Error('Solicitud de contratista no encontrada');

    const areaActual = solicitud.area_actual || 'Pendiente de asignación';
    const estadoActual = solicitud.estado === 'detenido' || solicitud.estado === 'completado'
      ? solicitud.estado
      : 'en_transito';
    const titulo = `${solicitud.motivo_visita || 'Solicitud contratista'} - ${solicitud.nombres || ''} ${solicitud.apellidos || ''}`.trim();
    const destinatario = `${solicitud.nombres || ''} ${solicitud.apellidos || ''}`.trim() || 'Solicitante contratista';

    const { error: insErr } = await supabase.from('tramites').insert({
      id: solicitudId,
      titulo,
      oficio: solicitud.numero_contrato || null,
      nombre_destinatario: destinatario,
      area_destinatario: areaActual,
      area_destino_final: areaActual,
      proceso: null,
      estado: estadoActual,
      codigo_barras: solicitudId,
      archivo_pdf: null,
      nombre_archivo: null,
    });
    if (insErr) throw insErr;
  },

  crear: async (
    payload: Omit<FormularioContratista, 'id'>
  ): Promise<FormularioContratista> => {
    try {
      const withDefaults: Omit<FormularioContratista, 'id'> = {
        ...(payload as any),
        area_actual: (payload as any).area_actual ?? AREA_GESTION_CONTRATISTA,
        estado: (payload as any).estado ?? 'pendiente_asignacion',
      };
      const { data, error } = await supabase
        .from('formulario_contratista')
        .insert([withDefaults])
        .select('*')
        .single();
      if (error) throw error;
      if (!data) throw new Error('No se pudo crear el formulario');
      return data as FormularioContratista;
    } catch (error: any) {
      console.error('Error al crear formulario de contratista:', error);
      throw new Error(error.message || 'Error al crear formulario de contratista');
    }
  },

  /**
   * Listado: si no es admin/supervisión, solo solicitudes cuyo `area_actual` coincide con el área del usuario
   * (misma lógica que trámites con `area_destinatario`).
   */
  obtener: async (
    limit = 50,
    filtros: { areaUsuario?: string; esAdmin?: boolean } = {}
  ): Promise<FormularioContratista[]> => {
    try {
      if (!filtros.esAdmin && !filtros.areaUsuario) {
        return [];
      }

      let query = supabase
        .from('formulario_contratista')
        .select('*');

      if (!filtros.esAdmin && filtros.areaUsuario) {
        query = query.eq('area_actual', filtros.areaUsuario);
      }

      // Traer un lote mayor que `limit` para poder ordenar por última modificación (espejo en `tramites`)
      // y luego recortar; si no, el LIMIT en SQL podría excluir solicitudes antiguas por fecha_visita pero tocadas hace poco.
      const fetchCap = Math.min(1000, Math.max(limit * 10, limit));
      query = query.limit(fetchCap);

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as FormularioContratista[];

      const ids = rows.map((r) => r.id).filter(Boolean);
      const tsById: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: tramRows, error: tramErr } = await supabase
          .from('tramites')
          .select('id, updated_at, fecha_creacion')
          .in('id', ids);
        if (!tramErr && tramRows?.length) {
          for (const t of tramRows as {
            id: string;
            updated_at?: string | null;
            fecha_creacion?: string | null;
          }[]) {
            const raw = t.updated_at || t.fecha_creacion;
            if (raw) tsById[t.id] = new Date(raw).getTime();
          }
        }
      }

      const fallbackTs = (r: FormularioContratista) => {
        const d = r.fecha_visita ? new Date(`${r.fecha_visita}T12:00:00`) : new Date(0);
        return d.getTime();
      };

      const sorted = [...rows].sort((a, b) => {
        const ta = tsById[a.id] ?? fallbackTs(a);
        const tb = tsById[b.id] ?? fallbackTs(b);
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      });

      return sorted.slice(0, limit);
    } catch (error: any) {
      console.error('Error al obtener formularios de contratista:', error);
      throw new Error(error.message || 'Error al obtener formularios de contratista');
    }
  },

  /** Sugerencias para nombre_empresa desde contratistas y formulario_contratista. */
  obtenerSugerenciasNombreEmpresa: async (search: string, limit = 8): Promise<string[]> => {
    const term = (search || '').trim();
    if (!term) return [];
    try {
      const [contratistasRes, contratistaRes] = await Promise.all([
        supabase
          .from('contratistas')
          .select('responsable')
          .ilike('responsable', `%${term}%`)
          .not('responsable', 'is', null)
          .limit(limit * 2),
        supabase
          .from('formulario_contratista')
          .select('nombre_empresa')
          .ilike('nombre_empresa', `%${term}%`)
          .not('nombre_empresa', 'is', null)
          .limit(limit * 2),
      ]);

      if (contratistasRes.error && contratistasRes.error.code !== '42P01') {
        throw contratistasRes.error;
      }
      if (contratistaRes.error) throw contratistaRes.error;

      const unique = new Set<string>();
      for (const row of contratistasRes.data || []) {
        const value = (row as { responsable?: string })?.responsable?.trim();
        if (value) unique.add(value);
      }
      for (const row of contratistaRes.data || []) {
        const value = (row as any)?.nombre_empresa?.trim();
        if (value) unique.add(value);
      }
      return Array.from(unique).slice(0, limit);
    } catch (error: any) {
      console.error('Error al obtener sugerencias de nombre de empresa:', error);
      return [];
    }
  },

  obtenerPorId: async (
    id: string,
    filtros?: { areaUsuario?: string; esAdmin?: boolean }
  ): Promise<FormularioContratista | null> => {
    try {
      if (!filtros?.esAdmin && !filtros?.areaUsuario) {
        return null;
      }

      const { data, error } = await supabase
        .from('formulario_contratista')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      if (!filtros?.esAdmin && filtros?.areaUsuario) {
        if ((data as FormularioContratista).area_actual !== filtros.areaUsuario) {
          return null;
        }
      }

      return data as FormularioContratista;
    } catch (error: any) {
      console.error('Error al obtener formulario de contratista por id:', error);
      throw new Error(error.message || 'Error al obtener la solicitud');
    }
  },

  /** Primera asignación a un área (pasa a en_seguimiento). */
  asignarArea: async (
    solicitudId: string,
    payload: { area_nombre: string; usuario: string; nota?: string | null }
  ): Promise<FormularioContratista> => {
    try {
      await formularioContratistaService.asegurarTramiteContratista(solicitudId);
      const { data, error } = await supabase
        .from('formulario_contratista')
        .update({
          area_actual: payload.area_nombre,
          estado: 'en_seguimiento',
        })
        .eq('id', solicitudId)
        .select('*')
        .single();
      if (error) throw error;
      if (!data) throw new Error('No se pudo actualizar la solicitud');

      const { error: movError } = await supabase.from('movimientos_tramites').insert({
        tramite_id: solicitudId,
        area_origen: 'Pendiente de asignación',
        area_destino: payload.area_nombre,
        observaciones: payload.nota ?? null,
        estado_resultante: null,
        usuario: payload.usuario,
      });
      if (movError) throw movError;

      // Mantener sincronizado el espejo en `tramites` para reportes/listado unificado.
      await supabase
        .from('tramites')
        .update({
          area_destinatario: payload.area_nombre,
          area_destino_final: payload.area_nombre,
          estado: 'en_transito',
        })
        .eq('id', solicitudId);

      return data as FormularioContratista;
    } catch (error: any) {
      if (error?.code === '42P01') {
        throw new Error(
          'Falta la tabla movimientos_tramites o columnas area_actual/estado.'
        );
      }
      console.error('Error al asignar área a solicitud:', error);
      throw new Error(error.message || 'Error al asignar área');
    }
  },

  /** Envío a otra área y/o detenido / completado (misma lógica que trámites). */
  registrarMovimiento: async (
    solicitudId: string,
    payload: {
      area_origen: string;
      area_destino: string;
      nota?: string | null;
      estado_resultante: '' | 'detenido' | 'completado';
      usuario: string;
      nuevo_estado: 'en_seguimiento' | 'detenido' | 'completado';
      nueva_area_actual: string;
    }
  ): Promise<FormularioContratista> => {
    try {
      await formularioContratistaService.asegurarTramiteContratista(solicitudId);
      const { error: movError } = await supabase.from('movimientos_tramites').insert({
        tramite_id: solicitudId,
        area_origen: payload.area_origen,
        area_destino: payload.area_destino,
        observaciones: payload.nota ?? null,
        estado_resultante: payload.estado_resultante || null,
        usuario: payload.usuario,
      });
      if (movError) throw movError;

      const { data, error } = await supabase
        .from('formulario_contratista')
        .update({
          area_actual: payload.nueva_area_actual,
          estado: payload.nuevo_estado,
        })
        .eq('id', solicitudId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('No se pudo actualizar la solicitud');

      const estadoTramite = payload.nuevo_estado === 'completado'
        ? 'completado'
        : payload.nuevo_estado === 'detenido'
          ? 'detenido'
          : 'en_transito';
      await supabase
        .from('tramites')
        .update({
          area_destinatario: payload.nueva_area_actual,
          area_destino_final: payload.nueva_area_actual,
          estado: estadoTramite,
        })
        .eq('id', solicitudId);
      return data as FormularioContratista;
    } catch (error: any) {
      if (error?.code === '42P01') {
        throw new Error('Falta la tabla movimientos_tramites.');
      }
      console.error('Error al registrar movimiento de solicitud:', error);
      throw new Error(error.message || 'Error al registrar seguimiento');
    }
  },

  /** Sincroniza área/estado de formulario_contratista desde un movimiento ya registrado en tramites. */
  sincronizarDesdeTramite: async (
    solicitudId: string,
    payload: {
      nueva_area_actual: string;
      nuevo_estado: 'en_seguimiento' | 'detenido' | 'completado';
    }
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('formulario_contratista')
        .update({
          area_actual: payload.nueva_area_actual,
          estado: payload.nuevo_estado,
        })
        .eq('id', solicitudId);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error al sincronizar solicitud de contratista desde trámite:', error);
      throw new Error(error.message || 'Error al sincronizar solicitud de contratista');
    }
  },

  obtenerMovimientos: async (solicitudId: string): Promise<MovimientoSolicitudContratista[]> => {
    try {
      const { data, error } = await supabase
        .from('movimientos_tramites')
        .select('*')
        .eq('tramite_id', solicitudId)
        .order('fecha_movimiento', { ascending: false });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        solicitud_id: m.tramite_id,
        area_origen: m.area_origen,
        area_destino: m.area_destino,
        nota: m.observaciones ?? null,
        estado_resultante: m.estado_resultante ?? null,
        usuario: m.usuario ?? null,
        fecha_movimiento: m.fecha_movimiento ?? null,
      })) as MovimientoSolicitudContratista[];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.error('Error al obtener movimientos de solicitud:', error);
      throw new Error(error.message || 'Error al obtener el historial');
    }
  },

  /**
   * Obtiene el token QR de una solicitud. Si no existe lo crea.
   * Así el token siempre es el mismo independientemente de desde
   * dónde se genere la URL (formulario público o panel sepri-main).
   */
  obtenerOCrearToken: async (solicitudId: string): Promise<string> => {
    // 1. Buscar token activo existente
    const { data: existing } = await supabase
      .from('contratista_access_tokens')
      .select('token')
      .eq('solicitud_id', solicitudId)
      .eq('is_active', true)
      .maybeSingle();

    if (existing?.token) return existing.token;

    // 2. Crear uno nuevo
    const token = generarToken(32);
    const { data: inserted, error } = await supabase
      .from('contratista_access_tokens')
      .insert({ solicitud_id: solicitudId, token })
      .select('token')
      .single();

    if (error) throw new Error(error.message || 'Error al crear token QR');
    return inserted.token;
  },

  /** Resuelve el solicitud_id a partir de un token (para la ruta /contratista/:token). */
  obtenerSolicitudIdPorToken: async (token: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('contratista_access_tokens')
      .select('solicitud_id')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;

    // Actualizar last_accessed_at y access_count de forma no bloqueante
    supabase
      .from('contratista_access_tokens')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: (data as any).access_count + 1,
      })
      .eq('token', token)
      .then(() => {});

    return data.solicitud_id;
  },
};

// ============================================
// SERVICIO DE OBRAS
// ============================================

/**
 * Límites por columna al persistir obras (evita 22001).
 * Descripción y observaciones: cupo amplio para texto corrido; si la BD usa `text`, no habrá corte en la práctica.
 */
const OBRA_CAMPO_STRING_MAX: Record<string, number> = {
  id: 32,
  codigo: 100,
  contrato: 9,
  tipo_obra: 100,
  estado: 120,
  nombre: 200,
  nombre_inaugurado: 100,
  descripcion: 25000,
  provincia: 200,
  municipio: 200,
  nivel: 200,
  sorteo: 100,
  area_construccion: 100,
  coordinador: 100,
  supervisor: 100,
  numero_ultima_cubicacion: 100,
  tipo_ultima_cubicacion: 100,
  estatus_ultima_cubicacion: 100,
  grupo_ultimo_estatus_cubicacion: 100,
  envio_snip: 100,
  modificacion_snip: 100,
  observacion_legal: 25000,
  observacion_financiero: 25000,
  latitud: 100,
  longitud: 100,
  distrito_minerd_sigede: 200,
  fecha_inicio: 32,
  fecha_fin_estimada: 32,
  fecha_inauguracion: 32,
  fecha_detenida: 32,
};

const OBRAS_SELECT_CON_CONTRATISTA = '*, contratistas(*)';
const OBRAS_SELECT_INNER_CONTRATISTA = '*, contratistas!inner(*)';

function mapObraRow(row: Record<string, unknown>): Obra {
  const contratistaRaw = row.contratistas;
  const contratista = (
    Array.isArray(contratistaRaw) ? contratistaRaw[0] : contratistaRaw
  ) as Contratista | null | undefined;
  const responsableLegacy = row.responsable as string | null | undefined;
  const { contratistas: _c, ...rest } = row;
  return {
    ...(rest as unknown as Obra),
    contratista: contratista ?? null,
    responsable: contratista?.responsable ?? responsableLegacy ?? null,
  };
}

function mapObrasRows(rows: Record<string, unknown>[] | null): Obra[] {
  return (rows || []).map((row) => mapObraRow(row));
}

function getResponsableFromJoinedRow(row: Record<string, unknown>): string {
  const contratistaRaw = row.contratistas;
  const contratista = (
    Array.isArray(contratistaRaw) ? contratistaRaw[0] : contratistaRaw
  ) as { responsable?: string } | null | undefined;
  const legacy = row.responsable as string | undefined;
  return (contratista?.responsable || legacy || '').trim() || 'Sin responsable';
}

async function obtenerFilasObrasUbicacionResponsablePaginadas(): Promise<Record<string, unknown>[]> {
  const PAGE_SIZE = 1000;
  const filas: Record<string, unknown>[] = [];
  let desde = 0;
  while (true) {
    const hasta = desde + PAGE_SIZE - 1;
    let { data, error } = await supabase
      .from('obras')
      .select('provincia, municipio, contratistas(responsable)')
      .range(desde, hasta);

    if (error) {
      const fb = await supabase
        .from('obras')
        .select('provincia, municipio')
        .range(desde, hasta);
      if (fb.error) throw fb.error;
      const lote = (fb.data || []) as Record<string, unknown>[];
      filas.push(...lote);
      if (lote.length < PAGE_SIZE) break;
      desde += PAGE_SIZE;
      continue;
    }

    const lote = (data || []) as Record<string, unknown>[];
    filas.push(...lote);
    if (lote.length < PAGE_SIZE) break;
    desde += PAGE_SIZE;
  }
  return filas;
}

async function buscarContratistaIdsPorResponsable(term: string): Promise<string[]> {
  const pattern = `%${term.replace(/'/g, "''")}%`;
  const { data, error } = await supabase
    .from('contratistas')
    .select('id')
    .ilike('responsable', pattern);
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data || []).map((r) => r.id as string);
}

async function sugerenciasResponsableLegacy(_search: string, _limit: number): Promise<string[]> {
  return [];
}

export const contratistasService = {
  buscarOCrearPorResponsable: async (nombre: string): Promise<string | null> => {
    const responsable = (nombre || '').trim();
    if (!responsable) return null;

    const { data: existente, error: findError } = await supabase
      .from('contratistas')
      .select('id')
      .ilike('responsable', responsable)
      .limit(1)
      .maybeSingle();

    if (findError && findError.code !== '42P01') throw findError;
    if (existente?.id) return existente.id as string;

    const { data: creado, error: insertError } = await supabase
      .from('contratistas')
      .insert([{ responsable: responsable.slice(0, 400) }])
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '42P01') return null;
      throw insertError;
    }
    return creado?.id as string;
  },

  obtenerSugerenciasResponsable: async (search: string, limit = 8): Promise<string[]> => {
    const term = (search || '').trim();
    if (term.length < 2) return [];
    try {
      const pattern = `%${term.replace(/'/g, "''")}%`;
      const { data, error } = await supabase
        .from('contratistas')
        .select('responsable')
        .ilike('responsable', pattern)
        .limit(limit * 3);

      if (error) {
        if (error.code === '42P01') {
          return sugerenciasResponsableLegacy(term, limit);
        }
        throw error;
      }

      const items = (data || [])
        .map((r) => String(r.responsable || '').trim())
        .filter(Boolean);
      return ORDENAR_SUGERENCIAS(items, term).slice(0, limit);
    } catch (error: any) {
      console.error('Error al obtener sugerencias de contratista:', error);
      return [];
    }
  },

  actualizar: async (id: string, datos: Partial<Contratista>): Promise<Contratista> => {
    const payload = Object.fromEntries(
      Object.entries(datos).filter(([, v]) => v !== undefined),
    );
    const { data, error } = await supabase
      .from('contratistas')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('Contratista no encontrado');
    return data as Contratista;
  },

  buscar: async (search: string, limit = 10): Promise<Contratista[]> => {
    const term = (search || '').trim();
    if (term.length < 1) return [];
    try {
      const pattern = `%${term.replace(/'/g, "''")}%`;
      const { data, error } = await supabase
        .from('contratistas')
        .select('id, responsable, identificacion, telefono1, telefono2, correo')
        .ilike('responsable', pattern)
        .limit(limit);
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || []) as Contratista[];
    } catch {
      return [];
    }
  },
};

async function prepararPayloadObraPersistencia(
  obra: Record<string, unknown> | Partial<Obra>,
): Promise<Record<string, unknown>> {
  const raw = { ...obra } as Record<string, unknown>;
  const responsable = typeof raw.responsable === 'string' ? raw.responsable.trim() : '';
  delete raw.responsable;
  delete raw.contratista;

  if (responsable && !raw.contratista_id) {
    raw.contratista_id = await contratistasService.buscarOCrearPorResponsable(responsable);
  }

  return normalizarPayloadObra(raw);
}

function truncarStringObraPorCampo(key: string, v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const maxLen = OBRA_CAMPO_STRING_MAX[key] ?? 4000;
  return v.length > maxLen ? v.slice(0, maxLen) : v;
}

function normalizarPayloadObra(
  obra: Record<string, unknown> | Partial<Obra> | Omit<Obra, 'created_at' | 'updated_at'>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obra)
      .filter(([k]) => k !== 'id_obra')
      .map(([k, v]) => [k, truncarStringObraPorCampo(k, v)]),
  );
}

const ORDENAR_SUGERENCIAS = (items: string[], term: string): string[] => {
  const lower = term.toLowerCase();
  return Array.from(new Set(items)).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aStarts = aLower.startsWith(lower) ? 0 : 1;
    const bStarts = bLower.startsWith(lower) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    const aIdx = aLower.indexOf(lower);
    const bIdx = bLower.indexOf(lower);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b, 'es');
  });
};

async function obtenerFilasObrasPaginadas<T extends string>(
  columnas: T,
): Promise<Record<string, unknown>[]> {
  const PAGE_SIZE = 1000;
  const filas: Record<string, unknown>[] = [];
  let desde = 0;
  while (true) {
    const hasta = desde + PAGE_SIZE - 1;
    const { data, error } = await supabase.from('obras').select(columnas).range(desde, hasta);
    if (error) throw error;
    const lote = (data || []) as Record<string, unknown>[];
    filas.push(...lote);
    if (lote.length < PAGE_SIZE) break;
    desde += PAGE_SIZE;
  }
  return filas;
}

export const obrasService = {
  /**
   * Normaliza valores de estado para evitar conteos duplicados por variaciones
   * de mayúsculas/minúsculas o espacios extra.
   */
  normalizarEstadoDashboard: (estado?: string | null): string => {
    const limpio = (estado || '').trim().replace(/\s+/g, ' ').toUpperCase();
    return limpio || 'NO ESPECIFICADO';
  },

  /**
   * Obtener obras con filtros y paginación
   */
  obtenerObras: async (filtros: ObrasFilters = {}): Promise<ApiResponse<Obra[]>> => {
    try {
      const filtroResponsable = filtros.responsable?.trim() || '';
      const selectCols = filtroResponsable
        ? OBRAS_SELECT_INNER_CONTRATISTA
        : OBRAS_SELECT_CON_CONTRATISTA;

      let query = supabase
        .from('obras')
        .select(selectCols, { count: 'exact' });

      query = aplicarFiltrosObrasEnQuery(query, filtros);

      if (filtroResponsable) {
        query = query.ilike('contratistas.responsable', `%${filtroResponsable}%`);
      }

      if (filtros.search) {
        const searchTerm = filtros.search.trim();
        const searchPattern = `%${searchTerm}%`;
        const isNumeric = /^\d+$/.test(searchTerm);
        const searchConditions: string[] = [];

        if (isNumeric) {
          searchConditions.push(`id.eq.${searchTerm}`);
        }

        searchConditions.push(
          `id.ilike.${searchPattern}`,
          `contrato.ilike.${searchPattern}`,
          `codigo.ilike.${searchPattern}`,
          `nombre.ilike.${searchPattern}`,
          `estado.ilike.${searchPattern}`,
          `descripcion.ilike.${searchPattern}`,
          `provincia.ilike.${searchPattern}`,
          `municipio.ilike.${searchPattern}`,
          `nivel.ilike.${searchPattern}`,
          `distrito_minerd_sigede.ilike.${searchPattern}`,
          `coordinador.ilike.${searchPattern}`,
          `supervisor.ilike.${searchPattern}`,
          `nombre_inaugurado.ilike.${searchPattern}`,
        );

        const contratistaIds = await buscarContratistaIdsPorResponsable(searchTerm);
        if (contratistaIds.length > 0) {
          searchConditions.push(`contratista_id.in.(${contratistaIds.join(',')})`);
        }

        query = query.or(searchConditions.join(','));
      }

      query = query.order('created_at', { ascending: false });

      if (filtros.limit) {
        query = query.limit(filtros.limit);
      }
      if (filtros.offset != null && filtros.limit) {
        query = query.range(filtros.offset, filtros.offset + filtros.limit - 1);
      }

      let { data, error, count } = await query;

      if (error?.message?.includes('contratistas') || error?.code === 'PGRST200') {
        let fallback = supabase.from('obras').select('*', { count: 'exact' });
        fallback = aplicarFiltrosObrasEnQuery(fallback, filtros);
        if (filtroResponsable) {
          const ids = await buscarContratistaIdsPorResponsable(filtroResponsable);
          if (ids.length > 0) fallback = fallback.in('contratista_id', ids);
          else {
            return { data: [], count: 0 };
          }
        }
        fallback = fallback.order('created_at', { ascending: false });
        if (filtros.limit) fallback = fallback.limit(filtros.limit);
        if (filtros.offset != null && filtros.limit) {
          fallback = fallback.range(filtros.offset, filtros.offset + filtros.limit - 1);
        }
        const fb = await fallback;
        data = fb.data;
        error = fb.error;
        count = fb.count;
      }

      if (error) throw error;

      return {
        data: mapObrasRows((data || []) as Record<string, unknown>[]),
        count: count || 0,
      };
    } catch (error: any) {
      console.error('Error al obtener obras:', error);
      throw new Error(error.message || 'Error al obtener obras');
    }
  },

  /** Provincias, municipios y niveles distintos en la BD para filtros de descarga. */
  obtenerOpcionesFiltroDescarga: async (): Promise<{
    provincias: string[];
    municipios: { provincia: string; municipio: string }[];
    niveles: string[];
  }> => {
    try {
      const filas = await obtenerFilasObrasPaginadas('provincia, municipio, nivel');
      const provinciasSet = new Set<string>();
      const municipiosMap = new Map<string, Set<string>>();
      const nivelesSet = new Set<string>();

      for (const fila of filas) {
        const provincia = String(fila.provincia || '').trim();
        const municipio = String(fila.municipio || '').trim();
        const nivel = String(fila.nivel || '').trim();

        if (provincia) provinciasSet.add(provincia);
        if (municipio && provincia) {
          if (!municipiosMap.has(provincia)) municipiosMap.set(provincia, new Set());
          municipiosMap.get(provincia)!.add(municipio);
        }
        if (nivel) nivelesSet.add(nivel);
      }

      const municipios = Array.from(municipiosMap.entries()).flatMap(([prov, munSet]) =>
        Array.from(munSet)
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((municipio) => ({ provincia: prov, municipio })),
      );

      return {
        provincias: Array.from(provinciasSet).sort((a, b) => a.localeCompare(b, 'es')),
        municipios,
        niveles: Array.from(nivelesSet).sort((a, b) => a.localeCompare(b, 'es')),
      };
    } catch (error: any) {
      console.error('Error al obtener opciones de filtro:', error);
      return { provincias: [], municipios: [], niveles: [] };
    }
  },

  /** Sugerencias de búsqueda general (nombre, código, contrato, id, responsable, estado). */
  obtenerSugerenciasBuscarObras: async (search: string, limit = 8): Promise<string[]> => {
    const term = (search || '').trim();
    if (term.length < 2) return [];
    try {
      const pattern = `%${term.replace(/'/g, "''")}%`;
      const { data, error } = await supabase
        .from('obras')
        .select('id, nombre, codigo, contrato, estado, contratista_id, contratistas(responsable)')
        .or(
          [
            `nombre.ilike.${pattern}`,
            `codigo.ilike.${pattern}`,
            `contrato.ilike.${pattern}`,
            `id.ilike.${pattern}`,
            `estado.ilike.${pattern}`,
          ].join(','),
        )
        .limit(limit * 4);

      if (error) throw error;

      const lower = term.toLowerCase();
      const candidatos: string[] = [];
      for (const obra of data || []) {
        const row = obra as Record<string, unknown>;
        const contratista = row.contratistas as { responsable?: string } | null;
        for (const valor of [
          obra.nombre,
          obra.codigo,
          obra.contrato,
          obra.id,
          contratista?.responsable,
          obra.estado,
        ]) {
          const limpio = String(valor || '').trim();
          if (limpio && limpio.toLowerCase().includes(lower)) {
            candidatos.push(limpio);
          }
        }
      }

      return ORDENAR_SUGERENCIAS(candidatos, term).slice(0, limit);
    } catch (error: any) {
      console.error('Error al obtener sugerencias de búsqueda:', error);
      return [];
    }
  },

  /** Sugerencias de responsables/contratistas. */
  obtenerSugerenciasResponsable: async (search: string, limit = 8): Promise<string[]> => {
    return contratistasService.obtenerSugerenciasResponsable(search, limit);
  },

  /** Fallback si no existe la tabla contratistas. */
  obtenerSugerenciasResponsableLegacy: async (): Promise<string[]> => {
    return [];
  },

  /**
   * Obtener una obra por cualquier identificador.
   * En la BD, id es varchar (ej. OB-0000). Solo búsqueda por string; no usar id numérico.
   */
  obtenerObraPorIdObra: async (idObra: string): Promise<Obra | null> => {
    const isNotFound = (err: any) =>
      err?.code === 'PGRST116' || err?.status === 406 || (err?.message && String(err.message).includes('406'));

    const mapResult = (row: Record<string, unknown> | null) =>
      row ? mapObraRow(row) : null;

    try {
      const idObraNormalizado = idObra.trim().toUpperCase();
      const searchPattern = `%${idObraNormalizado}%`;

      let { data, error } = await supabase
        .from('obras')
        .select(OBRAS_SELECT_CON_CONTRATISTA)
        .eq('id', idObraNormalizado)
        .maybeSingle();

      if (!error && data) return mapResult(data as Record<string, unknown>);

      if (isNotFound(error)) {
        const res = await supabase
          .from('obras')
          .select(OBRAS_SELECT_CON_CONTRATISTA)
          .eq('codigo', idObraNormalizado)
          .maybeSingle();
        if (!res.error && res.data) return mapResult(res.data as Record<string, unknown>);
        error = res.error;
      }

      if (isNotFound(error)) {
        const contratistaIds = await buscarContratistaIdsPorResponsable(idObraNormalizado);
        const orParts = [
          `id.ilike.${searchPattern}`,
          `contrato.ilike.${searchPattern}`,
          `codigo.ilike.${searchPattern}`,
          `nombre.ilike.${searchPattern}`,
          `estado.ilike.${searchPattern}`,
          `provincia.ilike.${searchPattern}`,
          `municipio.ilike.${searchPattern}`,
        ];
        if (contratistaIds.length > 0) {
          orParts.push(`contratista_id.in.(${contratistaIds.join(',')})`);
        }

        const { data: searchData, error: searchError } = await supabase
          .from('obras')
          .select(OBRAS_SELECT_CON_CONTRATISTA)
          .or(orParts.join(','))
          .limit(1);

        if (!searchError && searchData?.[0]) {
          return mapResult(searchData[0] as Record<string, unknown>);
        }
      }

      if (error && !isNotFound(error)) {
        const fallback = await supabase
          .from('obras')
          .select('*')
          .eq('id', idObraNormalizado)
          .maybeSingle();
        if (!fallback.error && fallback.data) {
          return mapObraRow(fallback.data as Record<string, unknown>);
        }
        throw error;
      }
      return null;
    } catch (error: any) {
      console.error('Error al obtener obra por id_obra:', error);
      if (isNotFound(error)) return null;
      throw new Error(error.message || 'Error al obtener obra');
    }
  },

  /**
   * Obtener una obra por ID (numérico interno)
   */
  obtenerObraPorId: async (id: number): Promise<Obra> => {
    try {
      const { data, error } = await supabase
        .from('obras')
        .select(OBRAS_SELECT_CON_CONTRATISTA)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Obra no encontrada');

      return mapObraRow(data as Record<string, unknown>);
    } catch (error: any) {
      console.error('Error al obtener obra:', error);
      throw new Error(error.message || 'Error al obtener obra');
    }
  },


  /**
   * Crear una nueva obra.
   * Si la tabla usa id varchar (ej. OB-0000), pasar obra con id incluido.
   * Trunca strings según límites por columna (ver OBRA_CAMPO_STRING_MAX) para evitar error 22001.
   */
  crearObra: async (
    obra:
      | (Omit<Obra, 'created_at' | 'updated_at'> & { id?: string })
      | Record<string, unknown>,
  ): Promise<Obra> => {
    try {
      const payload = await prepararPayloadObraPersistencia(obra as Record<string, unknown>);

      const { data, error } = await supabase
        .from('obras')
        .insert([payload])
        .select(OBRAS_SELECT_CON_CONTRATISTA)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Error al crear obra');

      return mapObraRow(data as Record<string, unknown>);
    } catch (error: any) {
      console.error('Error al crear obra:', error);
      throw new Error(error.message || 'Error al crear obra');
    }
  },

  /**
   * Crear muchas obras con pocos viajes de red (insert por lotes).
   */
  crearObrasLote: async (
    obras: Array<Omit<Obra, 'created_at' | 'updated_at'> | Record<string, unknown>>,
    options?: { chunkSize?: number },
  ): Promise<Obra[]> => {
    const chunkSize = options?.chunkSize ?? 50;
    if (obras.length === 0) return [];
    try {
      const todas: Obra[] = [];
      for (let i = 0; i < obras.length; i += chunkSize) {
        const slice = obras.slice(i, i + chunkSize);
        const payloads = await Promise.all(
          slice.map((o) => prepararPayloadObraPersistencia(o as Record<string, unknown>)),
        );
        const { data, error } = await supabase
          .from('obras')
          .insert(payloads)
          .select(OBRAS_SELECT_CON_CONTRATISTA);
        if (error) throw error;
        todas.push(...mapObrasRows((data || []) as Record<string, unknown>[]));
      }
      return todas;
    } catch (error: any) {
      console.error('Error al crear obras en lote:', error);
      throw new Error(error.message || 'Error al crear obras en lote');
    }
  },

  /**
   * Actualizar una obra (id puede ser number o string según el esquema de obras).
   * Trunca strings según límites por columna (OBRA_CAMPO_STRING_MAX).
   */
  actualizarObra: async (id: number | string, updates: Partial<Obra>): Promise<Obra> => {
    try {
      const payload = await prepararPayloadObraPersistencia(updates as Record<string, unknown>);

      const { data, error } = await supabase
        .from('obras')
        .update(payload)
        .eq('id', id)
        .select(OBRAS_SELECT_CON_CONTRATISTA)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Obra no encontrada');

      return mapObraRow(data as Record<string, unknown>);
    } catch (error: any) {
      console.error('Error al actualizar obra:', error);
      throw new Error(error.message || 'Error al actualizar obra');
    }
  },

  /**
   * Actualizar una obra usando su código (campo codigo).
   */
  actualizarObraPorCodigo: async (codigo: string, updates: Partial<Obra>): Promise<Obra> => {
    try {
      const payload = await prepararPayloadObraPersistencia(updates as Record<string, unknown>);

      const { data, error } = await supabase
        .from('obras')
        .update(payload)
        .eq('codigo', codigo)
        .select(OBRAS_SELECT_CON_CONTRATISTA)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Obra no encontrada para el código especificado');

      return mapObraRow(data as Record<string, unknown>);
    } catch (error: any) {
      console.error('Error al actualizar obra por código:', error);
      throw new Error(error.message || 'Error al actualizar obra por código');
    }
  },

  /**
   * Eliminar una obra por su id (string o numérico).
   */
  eliminarObra: async (id: number | string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error al eliminar obra:', error);
      throw new Error(error.message || 'Error al eliminar obra');
    }
  },

  /**
   * Estadísticas de obras aplicando los mismos filtros que listado/descarga.
   */
  obtenerEstadisticasReporte: async (filtros: ObrasFilters = {}): Promise<ReporteObrasStats> => {
    try {
      const PAGE_SIZE = 1000;
      const obras: Obra[] = [];
      let offset = 0;

      while (true) {
        const lote = await obrasService.obtenerObras({
          ...filtros,
          limit: PAGE_SIZE,
          offset,
        });
        obras.push(...(lote.data || []));
        if (!lote.data || lote.data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      const conteoPorEstado = new Map<string, number>();
      const obrasPorResponsableMap = new Map<string, number>();
      const obrasPorProvinciaMap = new Map<string, number>();
      const obrasPorMunicipioMap = new Map<string, { provincia: string; cantidad: number }>();
      const obrasPorNivelMap = new Map<string, number>();
      let totalAulas = 0;
      let conUbicacion = 0;

      const hoy = new Date().toISOString().split('T')[0];
      const limite = new Date();
      limite.setDate(limite.getDate() + 30);
      const limiteStr = limite.toISOString().split('T')[0];

      const obrasProximasInaugurar: Obra[] = [];
      const obrasConUbicacion: ObraUbicacionGps[] = [];

      for (const obra of obras) {
        const estado = obrasService.normalizarEstadoDashboard(obra.estado);
        conteoPorEstado.set(estado, (conteoPorEstado.get(estado) || 0) + 1);

        const responsable =
          (obra.contratista?.responsable || obra.responsable || '').trim() || 'Sin responsable';
        obrasPorResponsableMap.set(responsable, (obrasPorResponsableMap.get(responsable) || 0) + 1);

        const provincia = (obra.provincia || '').trim() || 'Sin provincia';
        obrasPorProvinciaMap.set(provincia, (obrasPorProvinciaMap.get(provincia) || 0) + 1);

        const municipio = (obra.municipio || '').trim() || 'Sin municipio';
        const keyMun = `${provincia}::${municipio}`;
        const prevMun = obrasPorMunicipioMap.get(keyMun);
        if (prevMun) prevMun.cantidad += 1;
        else obrasPorMunicipioMap.set(keyMun, { provincia, cantidad: 1 });

        const nivel = (obra.nivel || '').trim() || 'Sin nivel';
        obrasPorNivelMap.set(nivel, (obrasPorNivelMap.get(nivel) || 0) + 1);

        if (obra.no_aula != null && !Number.isNaN(Number(obra.no_aula))) {
          totalAulas += Number(obra.no_aula);
        }
        if (obra.latitud && obra.longitud) {
          conUbicacion += 1;
          const lat = parseFloat(String(obra.latitud).trim());
          const lng = parseFloat(String(obra.longitud).trim());
          if (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          ) {
            obrasConUbicacion.push({
              id: obra.id,
              codigo: obra.codigo,
              nombre: obra.nombre,
              estado: obrasService.normalizarEstadoDashboard(obra.estado),
              provincia: obra.provincia,
              latitud: String(obra.latitud).trim(),
              longitud: String(obra.longitud).trim(),
            });
          }
        }

        const fi = obra.fecha_inauguracion;
        if (fi && fi >= hoy && fi <= limiteStr) {
          obrasProximasInaugurar.push(obra);
        }
      }

      obrasProximasInaugurar.sort((a, b) =>
        String(a.fecha_inauguracion || '').localeCompare(String(b.fecha_inauguracion || '')),
      );

      const porEstado = Array.from(conteoPorEstado.entries())
        .map(([estado, cantidad]) => ({ estado, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

      return {
        estadisticas: {
          totalObras: obras.length,
          porEstado,
          totalAulas,
          conUbicacion,
        },
        obrasPorProvincia: Array.from(obrasPorProvinciaMap.entries())
          .map(([provincia, cantidad]) => ({ provincia, cantidad }))
          .filter((p) => p.provincia !== 'Sin provincia')
          .sort((a, b) => b.cantidad - a.cantidad),
        obrasPorMunicipio: Array.from(obrasPorMunicipioMap.entries())
          .map(([key, { provincia, cantidad }]) => ({
            municipio: key.split('::')[1] || '',
            provincia,
            cantidad,
          }))
          .filter((m) => m.municipio !== 'Sin municipio')
          .sort((a, b) => b.cantidad - a.cantidad),
        obrasPorNivel: Array.from(obrasPorNivelMap.entries())
          .map(([nivel, cantidad]) => ({ nivel, cantidad }))
          .filter((n) => n.nivel !== 'Sin nivel')
          .sort((a, b) => b.cantidad - a.cantidad),
        obrasPorResponsable: Array.from(obrasPorResponsableMap.entries())
          .map(([responsable, cantidad]) => ({ responsable, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 15),
        obrasProximasInaugurar: obrasProximasInaugurar.slice(0, 20),
        obrasConUbicacion,
        obrasDetalle: obras,
      };
    } catch (error: any) {
      console.error('Error al obtener estadísticas de reporte:', error);
      throw new Error(error.message || 'Error al obtener estadísticas del reporte');
    }
  },

  /**
   * Obtener estadísticas del dashboard
   */
  obtenerEstadisticas: async () => {
    try {
      const PAGE_SIZE = 1000;

      const obtenerTodasLasObras = async <T extends string>(columnas: T) => {
        const filas: any[] = [];
        let desde = 0;
        while (true) {
          const hasta = desde + PAGE_SIZE - 1;
          const { data, error } = await supabase
            .from('obras')
            .select(columnas)
            .range(desde, hasta);
          if (error) throw error;
          const lote = data || [];
          filas.push(...lote);
          if (lote.length < PAGE_SIZE) break;
          desde += PAGE_SIZE;
        }
        return filas;
      };

      // Obtener total de obras
      const { count: totalObras } = await supabase
        .from('obras')
        .select('*', { count: 'exact', head: true });

      // Obtener obras por estado: solo estados que existen en la base de datos
      const todasLasObras = await obtenerTodasLasObras('estado');

      const porEstado: Array<{ estado: string; cantidad: number }> = [];
      if (todasLasObras && todasLasObras.length > 0) {
        const conteoPorEstado = new Map<string, number>();
        todasLasObras.forEach((o: { estado?: string | null }) => {
          const estado = obrasService.normalizarEstadoDashboard(o.estado);
          conteoPorEstado.set(estado, (conteoPorEstado.get(estado) || 0) + 1);
        });
        Array.from(conteoPorEstado.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([estado, cantidad]) => porEstado.push({ estado, cantidad }));
      }

      // Obtener obras próximas a inaugurar (próximos 30 días)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);
      const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
      const fechaHoy = new Date().toISOString().split('T')[0];

      const { data: obrasProximasRaw, error: proximasError } = await supabase
        .from('obras')
        .select(OBRAS_SELECT_CON_CONTRATISTA)
        .not('fecha_inauguracion', 'is', null)
        .gte('fecha_inauguracion', fechaHoy)
        .lte('fecha_inauguracion', fechaLimiteStr)
        .order('fecha_inauguracion', { ascending: true })
        .limit(10);

      let obrasProximas: Obra[] = [];
      if (!proximasError && obrasProximasRaw) {
        obrasProximas = mapObrasRows(obrasProximasRaw as Record<string, unknown>[]);
      } else {
        const fb = await supabase
          .from('obras')
          .select('*')
          .not('fecha_inauguracion', 'is', null)
          .gte('fecha_inauguracion', fechaHoy)
          .lte('fecha_inauguracion', fechaLimiteStr)
          .order('fecha_inauguracion', { ascending: true })
          .limit(10);
        if (!fb.error && fb.data) {
          obrasProximas = mapObrasRows(fb.data as Record<string, unknown>[]);
        }
      }

      const todasObras = await obtenerFilasObrasUbicacionResponsablePaginadas();

      const obrasPorResponsableMap = new Map<string, number>();
      const obrasPorProvinciaMap = new Map<string, number>();
      const obrasPorMunicipioMap = new Map<string, { provincia: string; cantidad: number }>();

      if (todasObras && todasObras.length > 0) {
        todasObras.forEach((obra) => {
          const responsable = getResponsableFromJoinedRow(obra);
          obrasPorResponsableMap.set(
            responsable,
            (obrasPorResponsableMap.get(responsable) || 0) + 1
          );
          const provincia = String(obra.provincia || '').trim() || 'Sin provincia';
          obrasPorProvinciaMap.set(provincia, (obrasPorProvinciaMap.get(provincia) || 0) + 1);
          const municipio = String(obra.municipio || '').trim() || 'Sin municipio';
          const key = `${provincia}::${municipio}`;
          const prev = obrasPorMunicipioMap.get(key);
          if (prev) prev.cantidad += 1;
          else obrasPorMunicipioMap.set(key, { provincia, cantidad: 1 });
        });
      }

      const obrasPorResponsable = Array.from(obrasPorResponsableMap.entries())
        .map(([responsable, cantidad]) => ({ responsable, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10); // Top 10

      const obrasPorProvincia = Array.from(obrasPorProvinciaMap.entries())
        .map(([provincia, cantidad]) => ({ provincia, cantidad }))
        .filter(p => p.provincia !== 'Sin provincia')
        .sort((a, b) => b.cantidad - a.cantidad);

      const obrasPorMunicipio = Array.from(obrasPorMunicipioMap.entries())
        .map(([key, { provincia, cantidad }]) => ({
          municipio: key.split('::')[1] || '',
          provincia,
          cantidad,
        }))
        .filter(m => m.municipio !== 'Sin municipio')
        .sort((a, b) => b.cantidad - a.cantidad);

      return {
        estadisticas: {
          totalObras: totalObras || 0,
          porEstado: porEstado,
        },
        obrasProximasInaugurar: obrasProximas || [],
        obrasPorResponsable: obrasPorResponsable || [],
        obrasPorProvincia: obrasPorProvincia || [],
        obrasPorMunicipio: obrasPorMunicipio || [],
      };
    } catch (error: any) {
      console.error('Error al obtener estadísticas:', error);
      throw new Error(error.message || 'Error al obtener estadísticas');
    }
  },

  /** Búsqueda de obras para asignar como ID SIGEDE (código o distrito). */
  buscarObrasParaSigede: async (
    search: string,
    limit = 10,
  ): Promise<
    Array<{
      codigo?: string | null;
      nombre: string;
      contrato?: string | null;
      tipo_obra?: string | null;
      provincia?: string | null;
      municipio?: string | null;
      distrito_minerd_sigede?: string | null;
    }>
  > => {
    const term = (search || '').trim();
    if (term.length < 1) return [];
    const pattern = `%${term.replace(/'/g, "''")}%`;
    const { data, error } = await supabase
      .from('obras')
      .select('codigo, nombre, contrato, tipo_obra, provincia, municipio, distrito_minerd_sigede')
      .or(
        `codigo.ilike.${pattern},nombre.ilike.${pattern},distrito_minerd_sigede.ilike.${pattern}`,
      )
      .order('codigo', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  /** Resumen de obra (contrato, plantel, tipo, ubicación) por cada id_sigede. */
  obtenerResumenesPorSigede: async (ids: string[]): Promise<ObraSigedeResumen[]> => {
    const uniq = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (uniq.length === 0) return [];

    const cols = 'codigo, nombre, contrato, tipo_obra, provincia, municipio, distrito_minerd_sigede';
    const [resCodigo, resDistrito] = await Promise.all([
      supabase.from('obras').select(cols).in('codigo', uniq),
      supabase.from('obras').select(cols).in('distrito_minerd_sigede', uniq),
    ]);
    if (resCodigo.error) throw resCodigo.error;
    if (resDistrito.error) throw resDistrito.error;

    const porCodigo = new Map(
      (resCodigo.data || []).map((o) => [String(o.codigo || '').trim(), o]),
    );
    const porDistrito = new Map(
      (resDistrito.data || []).map((o) => [String(o.distrito_minerd_sigede || '').trim(), o]),
    );

    return uniq.map((idSigede) => {
      const obra = porCodigo.get(idSigede) || porDistrito.get(idSigede);
      if (!obra) {
        return { id_sigede: idSigede, encontrada: false };
      }
      return {
        id_sigede: idSigede,
        contrato: obra.contrato ?? null,
        plantel: obra.nombre ?? null,
        tipo: obra.tipo_obra ?? null,
        provincia: obra.provincia ?? null,
        municipio: obra.municipio ?? null,
        encontrada: true,
      };
    });
  },
};

// ============================================
// SERVICIO DE TRÁMITES
// ============================================

export const tramitesService = {
  /**
   * Obtener trámites con filtros y paginación
   */
  obtenerTramites: async (filtros: TramitesFilters = {}): Promise<ApiResponse<Tramite[]>> => {
    try {
      let query = supabase
        .from('tramites')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filtros.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros.area) {
        query = query.eq('area_destinatario', filtros.area);
      }

      // Restricción por área: solo trámites enviados a su área (area_destinatario) o enviados por su área (origen = area_destinatario en creación). Filtro único por area_destinatario.
      if (!filtros.esAdmin) {
        if (filtros.areaUsuario) {
          query = query.eq('area_destinatario', filtros.areaUsuario);
        } else {
          query = query.limit(0);
        }
      }

      // Búsqueda por texto (incluye oficio)
      if (filtros.search) {
        const term = filtros.search.trim().replace(/'/g, "''");
        query = query.or(
          `titulo.ilike.%${term}%,nombre_destinatario.ilike.%${term}%,id.ilike.%${term}%,oficio.ilike.%${term}%`
        );
      }

      // Ordenar por fecha de creación descendente
      query = query.order('fecha_creacion', { ascending: false });

      // Paginación
      if (filtros.limit) {
        query = query.limit(filtros.limit);
      }
      if (filtros.offset) {
        query = query.range(filtros.offset, filtros.offset + (filtros.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
      };
    } catch (error: any) {
      console.error('Error al obtener trámites:', error);
      throw new Error(error.message || 'Error al obtener trámites');
    }
  },

  /**
   * Obtener un trámite por ID
   */
  obtenerTramitePorId: async (id: string): Promise<Tramite> => {
    try {
      const { data, error } = await supabase
        .from('tramites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Trámite no encontrado');

      return data;
    } catch (error: any) {
      console.error('Error al obtener trámite:', error);
      throw new Error(error.message || 'Error al obtener trámite');
    }
  },

  /**
   * Crear un nuevo trámite
   */
  crearTramite: async (tramite: Omit<Tramite, 'created_at' | 'updated_at' | 'fecha_creacion'>): Promise<Tramite> => {
    try {
      const { data, error } = await supabase
        .from('tramites')
        .insert([tramite])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Error al crear trámite');

      return data;
    } catch (error: any) {
      console.error('Error al crear trámite:', error);
      throw new Error(error.message || 'Error al crear trámite');
    }
  },

  /**
   * Actualizar un trámite
   */
  actualizarTramite: async (id: string, updates: Partial<Tramite>): Promise<Tramite> => {
    try {
      const { data, error } = await supabase
        .from('tramites')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Trámite no encontrado');

      return data;
    } catch (error: any) {
      console.error('Error al actualizar trámite:', error);
      throw new Error(error.message || 'Error al actualizar trámite');
    }
  },

  /**
   * Eliminar un trámite
   */
  eliminarTramite: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tramites')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error al eliminar trámite:', error);
      throw new Error(error.message || 'Error al eliminar trámite');
    }
  },

  /**
   * Obtener historial de movimientos de un trámite
   */
  obtenerHistorialTramite: async (tramiteId: string): Promise<MovimientoTramite[]> => {
    try {
      const { data, error } = await supabase
        .from('movimientos_tramites')
        .select('*')
        .eq('tramite_id', tramiteId)
        .order('fecha_movimiento', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error al obtener historial:', error);
      throw new Error(error.message || 'Error al obtener historial');
    }
  },

  /**
   * Registrar un movimiento de trámite
   */
  registrarMovimiento: async (
    tramiteId: string,
    movimiento: Omit<MovimientoTramite, 'id' | 'fecha_movimiento' | 'tramite_id'>
  ): Promise<MovimientoTramite> => {
    try {
      // No enviar 'id' para que la BD use la secuencia (evita conflicto si la secuencia está desincronizada)
      const payload = {
        tramite_id: tramiteId,
        area_origen: movimiento.area_origen,
        area_destino: movimiento.area_destino,
        oficio: movimiento.oficio ?? null,
        observaciones: movimiento.observaciones ?? null,
        usuario: movimiento.usuario ?? null,
        estado_resultante: movimiento.estado_resultante ?? null,
      };
      const { data, error } = await supabase
        .from('movimientos_tramites')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Error al registrar movimiento');

      return data;
    } catch (error: any) {
      console.error('Error al registrar movimiento:', error);
      throw new Error(error.message || 'Error al registrar movimiento');
    }
  },

  /**
   * Cerrar el registro de tiempo en el área actual (al enviar el trámite a otra área).
   */
  cerrarTiempoEnAreaActual: async (tramiteId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tiempo_en_area')
        .update({ fecha_salida: new Date().toISOString() })
        .eq('tramite_id', tramiteId)
        .is('fecha_salida', null);
      if (error) throw error;
    } catch (error: any) {
      if (error?.code !== '42P01') console.warn('Error al cerrar tiempo en área:', error?.message);
    }
  },

  /**
   * Abrir registro de tiempo en un área (trámite entra a esta área).
   */
  abrirTiempoEnArea: async (tramiteId: string, areaNombre: string, procesoId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('tiempo_en_area').insert([
        {
          tramite_id: tramiteId,
          area_nombre: areaNombre,
          fecha_entrada: new Date().toISOString(),
          proceso_id: procesoId,
        },
      ]);
      if (error) throw error;
    } catch (error: any) {
      if (error?.code !== '42P01') console.warn('Error al abrir tiempo en área:', error?.message);
    }
  },

  /**
   * Obtener el registro actual de tiempo en área (el que tiene fecha_salida null) para un trámite.
   */
  obtenerTiempoEnAreaActual: async (tramiteId: string): Promise<TiempoEnArea | null> => {
    try {
      const { data, error } = await supabase
        .from('tiempo_en_area')
        .select('*')
        .eq('tramite_id', tramiteId)
        .is('fecha_salida', null)
        .order('fecha_entrada', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (error: any) {
      if (error?.code === '42P01') return null;
      console.warn('Error al obtener tiempo en área actual:', error?.message);
      return null;
    }
  },

  /**
   * Obtener registros actuales de tiempo (fecha_salida null) para varios trámites.
   */
  obtenerTiemposActualesPorTramites: async (tramiteIds: string[]): Promise<Record<string, TiempoEnArea | null>> => {
    if (tramiteIds.length === 0) return {};
    try {
      const { data, error } = await supabase
        .from('tiempo_en_area')
        .select('*')
        .in('tramite_id', tramiteIds)
        .is('fecha_salida', null);
      if (error) throw error;
      const result: Record<string, TiempoEnArea | null> = {};
      tramiteIds.forEach((id) => { result[id] = null; });
      (data || []).forEach((row: TiempoEnArea) => {
        if (!result[row.tramite_id] || new Date(row.fecha_entrada) > new Date((result[row.tramite_id] as TiempoEnArea).fecha_entrada)) {
          result[row.tramite_id] = row;
        }
      });
      return result;
    } catch (error: any) {
      if (error?.code === '42P01') return {};
      console.warn('Error al obtener tiempos actuales:', error?.message);
      return {};
    }
  },

  /**
   * Obtener TODOS los registros de tiempo en área para los trámites (para sumar tiempo total por área).
   */
  obtenerTodosTiemposEnAreaPorTramites: async (tramiteIds: string[]): Promise<TiempoEnArea[]> => {
    if (tramiteIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('tiempo_en_area')
        .select('*')
        .in('tramite_id', tramiteIds)
        .order('fecha_entrada', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.warn('Error al obtener todos los tiempos en área:', error?.message);
      return [];
    }
  },

  /** Registros de tiempo_en_area abiertos (sin fecha_salida) para evaluar notificaciones 50/70/100%. */
  obtenerTiemposEnAreaAbiertos: async (): Promise<TiempoEnArea[]> => {
    try {
      const { data, error } = await supabase
        .from('tiempo_en_area')
        .select('*')
        .is('fecha_salida', null)
        .order('fecha_entrada', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.warn('Error al obtener tiempos en área abiertos:', error?.message);
      return [];
    }
  },

  /** Obtener trámites por lista de IDs (solo campos necesarios para notificaciones). */
  obtenerTramitesPorIds: async (ids: string[]): Promise<Pick<Tramite, 'id' | 'titulo' | 'proceso'>[]> => {
    if (ids.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('tramites')
        .select('id, titulo, proceso')
        .in('id', ids);
      if (error) throw error;
      return (data || []) as Pick<Tramite, 'id' | 'titulo' | 'proceso'>[];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      return [];
    }
  },
};

// ============================================
// SERVICIO DE NOTIFICACIONES POR TIEMPO (50%, 70%, 100%)
// ============================================

export const notificacionesTiempoService = {
  /** Notificaciones para usuarios de un área (donde corre el tiempo del proceso). */
  obtenerPorArea: async (areaNombre: string): Promise<NotificacionTiempo[]> => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_tiempo')
        .select('*')
        .eq('area_nombre', areaNombre)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.warn('Error al obtener notificaciones por área:', error?.message);
      return [];
    }
  },

  /** Notificaciones NO leídas para un usuario concreto de un área. */
  obtenerNoLeidasPorAreaYUsuario: async (
    areaNombre: string,
    usuarioId: string
  ): Promise<NotificacionTiempo[]> => {
    try {
      const [notifsRes, leidasRes] = await Promise.all([
        supabase
          .from('notificaciones_tiempo')
          .select('*')
          .eq('area_nombre', areaNombre)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('notificacion_leida')
          .select('notificacion_id')
          .eq('usuario_id', usuarioId),
      ]);

      const notifError = (notifsRes as any).error;
      const leidasError = (leidasRes as any).error;
      if (notifError) throw notifError;
      if (leidasError) throw leidasError;

      const notifs = (notifsRes as any).data as NotificacionTiempo[] | null;
      const leidas = ((leidasRes as any).data as { notificacion_id: number }[] | null) ?? [];
      const leidasSet = new Set(leidas.map((r) => r.notificacion_id));

      return (notifs || []).filter((n) => !leidasSet.has(n.id));
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.warn('Error al obtener notificaciones no leídas:', error?.message);
      return [];
    }
  },

  /** Pares (tiempo_en_area_id, porcentaje) ya emitidos para no duplicar. */
  obtenerYaEmitidasPorTiempoEnArea: async (
    tiempoEnAreaIds: number[]
  ): Promise<{ tiempo_en_area_id: number; porcentaje: number }[]> => {
    if (tiempoEnAreaIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('notificaciones_tiempo')
        .select('tiempo_en_area_id, porcentaje')
        .in('tiempo_en_area_id', tiempoEnAreaIds);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        tiempo_en_area_id: r.tiempo_en_area_id,
        porcentaje: r.porcentaje,
      }));
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      return [];
    }
  },

  /** Insertar una notificación (evitar duplicados con unique en BD). */
  insertar: async (payload: {
    tiempo_en_area_id: number;
    tramite_id: string;
    tramite_titulo: string;
    area_nombre: string;
    porcentaje: 50 | 70 | 100;
    mensaje: string;
  }): Promise<NotificacionTiempo | null> => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_tiempo')
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') return null; // unique violation = ya existe
        throw error;
      }
      return data;
    } catch (error: any) {
      console.warn('Error al insertar notificación tiempo:', error?.message);
      return null;
    }
  },

  /** Marca una notificación como leída para un usuario (tabla notificacion_leida). */
  marcarLeida: async (notificacionId: number, usuarioId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notificacion_leida')
        .insert({
          notificacion_id: notificacionId,
          usuario_id: usuarioId,
        });
      if (error && error.code !== '23505') throw error;
    } catch (error: any) {
      if (error?.code === '42P01') return;
      console.warn('Error al marcar notificación como leída:', error?.message);
    }
  },
};

// ============================================
// SERVICIO DE HISTORIAL DE UPLOADS
// ============================================

export const historialUploadsService = {
  /**
   * Obtener historial de uploads
   */
  obtenerHistorial: async (): Promise<HistorialUpload[]> => {
    try {
      const { data, error } = await supabase
        .from('historial_uploads')
        .select('*')
        .order('fecha_subida', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error al obtener historial de uploads:', error);
      throw new Error(error.message || 'Error al obtener historial');
    }
  },

  /**
   * Registrar un nuevo upload
   */
  registrarUpload: async (upload: Omit<HistorialUpload, 'id' | 'fecha_subida'>): Promise<HistorialUpload> => {
    try {
      const { data, error } = await supabase
        .from('historial_uploads')
        .insert([upload])
        .select()
        .single();

      if (error) {
        // Si la tabla no existe, lanzar un error específico
        if (error.message?.includes('Could not find the table') || 
            error.message?.includes('relation') ||
            error.message?.includes('does not exist')) {
          const tableError = new Error('Tabla historial_uploads no encontrada. Ejecuta el script supabase-historial-uploads.sql en Supabase.');
          (tableError as any).isTableNotFound = true;
          throw tableError;
        }
        throw error;
      }
      if (!data) throw new Error('Error al registrar upload');

      return data;
    } catch (error: any) {
      // Re-lanzar el error para que el código que llama pueda manejarlo
      throw error;
    }
  },
};

// ============================================
// DOCUMENTOS TÉCNICOS DE OBRA
// ============================================

const DOC_TECNICO_SELECT = '*, contratistas(id, responsable, identificacion)';
const MOV_DOC_TECNICO_SELECT = '*, area:departamento(id, area)';

function parseNoAdendaSolicitud(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function mapDocumentoTecnicoRow(row: Record<string, unknown>): DocumentoTecnicoObra {
  const contratistaRaw = row.contratistas;
  const contratista = (
    Array.isArray(contratistaRaw) ? contratistaRaw[0] : contratistaRaw
  ) as Contratista | null;
  const { contratistas: _c, ...rest } = row;
  const idSigede = Array.isArray(rest.id_sigede)
    ? (rest.id_sigede as string[]).map(String)
    : rest.id_sigede
      ? [String(rest.id_sigede)]
      : [];
  return {
    ...(rest as unknown as DocumentoTecnicoObra),
    id_sigede: idSigede,
    no_adenda_solicitud: parseNoAdendaSolicitud(rest.no_adenda_solicitud as string | number | null),
    contratista: contratista ?? null,
  };
}

function mapMovimientoDocumentoRow(row: Record<string, unknown>): MovimientoDocumentoTecnicoObra {
  const areaRaw = row.area;
  const area = (Array.isArray(areaRaw) ? areaRaw[0] : areaRaw) as MovimientoDocumentoTecnicoObra['area'];
  const { area: _a, ...rest } = row;
  return { ...(rest as unknown as MovimientoDocumentoTecnicoObra), area: area ?? null };
}

export const documentosTecnicosService = {
  listar: async (filtros?: { busqueda?: string }): Promise<DocumentoTecnicoObra[]> => {
    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .select(DOC_TECNICO_SELECT)
      .order('created_at', { ascending: false });

    if (error) throw error;

    let filas = (data || []).map((r) => mapDocumentoTecnicoRow(r as Record<string, unknown>));
    filas = await Promise.all(
      filas.map(async (doc) => ({
        ...doc,
        obras_sigede: await obrasService.obtenerResumenesPorSigede(doc.id_sigede || []),
      })),
    );
    const term = filtros?.busqueda?.trim().toLowerCase();
    if (term) {
      filas = filas.filter((d) => {
        const responsable = (d.contratista?.responsable || '').toLowerCase();
        const sigedes = (d.id_sigede || []).join(' ').toLowerCase();
        return (
          d.solicitud.toLowerCase().includes(term) ||
          (d.cuadrantes || '').toLowerCase().includes(term) ||
          (d.tipo_adenda || '').toLowerCase().includes(term) ||
          String(d.no_adenda_solicitud ?? '').includes(term) ||
          (d.tipo_adenda_anterior || '').toLowerCase().includes(term) ||
          (d.observacion || '').toLowerCase().includes(term) ||
          responsable.includes(term) ||
          sigedes.includes(term)
        );
      });
    }
    return filas;
  },

  obtenerPorSolicitud: async (solicitud: string): Promise<DocumentoTecnicoObra | null> => {
    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .select(DOC_TECNICO_SELECT)
      .eq('solicitud', solicitud.trim())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const doc = mapDocumentoTecnicoRow(data as Record<string, unknown>);
    return {
      ...doc,
      obras_sigede: await obrasService.obtenerResumenesPorSigede(doc.id_sigede || []),
    };
  },

  crear: async (payload: {
    solicitud: string;
    cuadrantes?: string;
    tipo_adenda?: string;
    no_adenda_solicitud?: number | string | null;
    tipo_adenda_anterior?: string;
    observacion?: string;
    contratista_id?: string | null;
    id_sigede: string[];
  }): Promise<DocumentoTecnicoObra> => {
    const row = {
      solicitud: payload.solicitud.trim().slice(0, 75),
      cuadrantes: payload.cuadrantes?.trim() || null,
      tipo_adenda: payload.tipo_adenda?.trim() || null,
      no_adenda_solicitud: parseNoAdendaSolicitud(payload.no_adenda_solicitud),
      tipo_adenda_anterior: payload.tipo_adenda_anterior?.trim() || null,
      observacion: payload.observacion?.trim() || null,
      contratista_id: payload.contratista_id || null,
      id_sigede: payload.id_sigede.filter(Boolean).map((s) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .insert(row)
      .select(DOC_TECNICO_SELECT)
      .single();

    if (error) throw error;
    const doc = mapDocumentoTecnicoRow(data as Record<string, unknown>);
    return {
      ...doc,
      obras_sigede: await obrasService.obtenerResumenesPorSigede(doc.id_sigede || []),
    };
  },

  actualizar: async (
    id: string,
    payload: Partial<{
      solicitud: string;
      cuadrantes: string | null;
      tipo_adenda: string | null;
      no_adenda_solicitud: number | string | null;
      tipo_adenda_anterior: string | null;
      observacion: string | null;
      contratista_id: string | null;
      id_sigede: string[];
    }>,
  ): Promise<DocumentoTecnicoObra> => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.solicitud !== undefined) updates.solicitud = payload.solicitud.trim().slice(0, 75);
    if (payload.cuadrantes !== undefined) updates.cuadrantes = payload.cuadrantes?.trim() || null;
    if (payload.tipo_adenda !== undefined) updates.tipo_adenda = payload.tipo_adenda?.trim() || null;
    if (payload.no_adenda_solicitud !== undefined) {
      updates.no_adenda_solicitud = parseNoAdendaSolicitud(payload.no_adenda_solicitud);
    }
    if (payload.tipo_adenda_anterior !== undefined) {
      updates.tipo_adenda_anterior = payload.tipo_adenda_anterior?.trim() || null;
    }
    if (payload.observacion !== undefined) {
      updates.observacion = payload.observacion?.trim() || null;
    }
    if (payload.contratista_id !== undefined) updates.contratista_id = payload.contratista_id;
    if (payload.id_sigede !== undefined) {
      updates.id_sigede = payload.id_sigede.filter(Boolean).map((s) => s.trim()).filter(Boolean);
    }

    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .update(updates)
      .eq('id', id)
      .select(DOC_TECNICO_SELECT)
      .single();

    if (error) throw error;
    const doc = mapDocumentoTecnicoRow(data as Record<string, unknown>);
    return {
      ...doc,
      obras_sigede: await obrasService.obtenerResumenesPorSigede(doc.id_sigede || []),
    };
  },

  eliminar: async (id: string): Promise<void> => {
    const { error } = await supabase.from('documentos_tecnicos_obra').delete().eq('id', id);
    if (error) throw error;
  },

  listarMovimientos: async (solicitud: string): Promise<MovimientoDocumentoTecnicoObra[]> => {
    const { data, error } = await supabase
      .from('movimiento_documentos_tecnicos_obra')
      .select(MOV_DOC_TECNICO_SELECT)
      .eq('solicitud', solicitud.trim())
      .order('fecha_solicitud', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((r) => mapMovimientoDocumentoRow(r as Record<string, unknown>));
  },

  crearMovimiento: async (payload: {
    solicitud: string;
    fecha_solicitud?: string | null;
    no_tramite?: string | null;
    departamento?: string | null;
    fecha_salida?: string | null;
  }): Promise<MovimientoDocumentoTecnicoObra> => {
    const row = {
      solicitud: payload.solicitud.trim(),
      fecha_solicitud: payload.fecha_solicitud || null,
      no_tramite: payload.no_tramite?.trim() || null,
      departamento: payload.departamento?.trim() || null,
      fecha_salida: payload.fecha_salida || null,
    };

    const { data, error } = await supabase
      .from('movimiento_documentos_tecnicos_obra')
      .insert(row)
      .select(MOV_DOC_TECNICO_SELECT)
      .single();

    if (error) throw error;
    return mapMovimientoDocumentoRow(data as Record<string, unknown>);
  },

  eliminarMovimiento: async (id: string): Promise<void> => {
    const { error } = await supabase.from('movimiento_documentos_tecnicos_obra').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// SERVICIO DE STORAGE (para archivos)
// ============================================

export const storageService = {
  /**
   * Subir un archivo a Supabase Storage
   */
  subirArchivo: async (file: File, bucket: string, path: string): Promise<string> => {
    try {
      // Algunos buckets no permiten MIME de Excel; subir como octet-stream para que acepte
      const excelMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      const fileToUpload =
        excelMimes.includes(file.type)
          ? new File([file], file.name, { type: 'application/octet-stream' })
          : file;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;
      if (!data) throw new Error('Error al subir archivo');

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error al subir archivo:', error);
      throw new Error(error.message || 'Error al subir archivo');
    }
  },

  /**
   * Obtener URL pública de un archivo
   */
  obtenerUrlPublica: (bucket: string, path: string): string => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  /**
   * Eliminar un archivo
   */
  eliminarArchivo: async (bucket: string, path: string): Promise<void> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error al eliminar archivo:', error);
      throw new Error(error.message || 'Error al eliminar archivo');
    }
  },
};
