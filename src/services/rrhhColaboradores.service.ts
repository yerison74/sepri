import { supabase } from '../lib/supabase';

/**
 * Convención RRHH:
 * Toda tabla nueva del módulo debe iniciar con "rrhh_".
 * Ejemplo base de este submódulo: rrhh_colaboradores.
 */
export type RrhhColaboradorEstado = 'Activo' | 'Inactivo';

export type RrhhColaborador = {
  id: string;
  nombre: string;
  identificacion: string;
  cargo?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  estado?: RrhhColaboradorEstado | null;
  usuario_app_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RrhhColaboradorCreate = {
  nombre: string;
  identificacion: string;
  cargo?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  estado?: RrhhColaboradorEstado;
  usuario_app_id?: string | null;
};

export type RrhhVinculoIdentificacion = {
  colaborador: RrhhColaborador | null;
  usuarioApp: {
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    usuario?: string | null;
    cargo?: string | null;
    area?: string | null;
    activo?: boolean | null;
  } | null;
};

const TABLA_COLABORADORES = 'rrhh_colaboradores';

const SELECT_COLS =
  'id, nombre, identificacion, cargo, departamento, telefono, correo, direccion, estado, usuario_app_id, created_at, updated_at';

export type RrhhListaItem = {
  /** Clave estable para React. */
  key: string;
  colaboradorId: string | null;
  usuarioAppId: string | null;
  /** true si solo existe en usuarios_app (sin ficha RH). */
  soloUsuario: boolean;
  nombre: string;
  identificacion: string;
  cargo: string | null;
  departamento: string | null;
  correo: string | null;
  telefono: string | null;
  estado: RrhhColaboradorEstado;
};

type UsuarioAppRow = {
  id: string;
  usuario?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  cargo?: string | null;
  area?: string | null;
  activo?: boolean | null;
  identificacion?: string | null;
};

function nombreDesdeUsuario(u: UsuarioAppRow): string {
  const full = [u.nombre, u.apellido].filter(Boolean).join(' ').trim();
  return full || u.usuario || 'Sin nombre';
}

export const rrhhColaboradoresService = {
  listar: async (): Promise<RrhhColaborador[]> => {
    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .select(SELECT_COLS)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return (data || []) as RrhhColaborador[];
  },

  /**
   * Lista unificada: todos los colaboradores + usuarios de app
   * que aún no tienen ficha en rrhh_colaboradores.
   */
  listarUnificados: async (): Promise<RrhhListaItem[]> => {
    const [colabsRes, usersRes] = await Promise.all([
      supabase.from(TABLA_COLABORADORES).select(SELECT_COLS).order('nombre', { ascending: true }),
      supabase
        .from('usuarios_app')
        .select('id, usuario, nombre, apellido, cargo, area, activo, identificacion')
        .order('nombre', { ascending: true }),
    ]);

    if (colabsRes.error) throw colabsRes.error;
    if (usersRes.error) throw usersRes.error;

    const colabs = (colabsRes.data || []) as RrhhColaborador[];
    const users = (usersRes.data || []) as UsuarioAppRow[];

    const linkedUserIds = new Set(
      colabs.map((c) => c.usuario_app_id).filter((id): id is string => Boolean(id)),
    );

    const items: RrhhListaItem[] = colabs.map((c) => ({
      key: `colab:${c.id}`,
      colaboradorId: c.id,
      usuarioAppId: c.usuario_app_id || null,
      soloUsuario: false,
      nombre: c.nombre,
      identificacion: c.identificacion || '',
      cargo: c.cargo || null,
      departamento: c.departamento || null,
      correo: c.correo || null,
      telefono: c.telefono || null,
      estado: c.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
    }));

    for (const u of users) {
      if (linkedUserIds.has(u.id)) continue;
      items.push({
        key: `user:${u.id}`,
        colaboradorId: null,
        usuarioAppId: u.id,
        soloUsuario: true,
        nombre: nombreDesdeUsuario(u),
        identificacion: u.identificacion || '',
        cargo: u.cargo || null,
        departamento: u.area || null,
        correo: u.usuario || null,
        telefono: null,
        estado: u.activo === false ? 'Inactivo' : 'Activo',
      });
    }

    items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    return items;
  },

  buscar: async (search: string): Promise<RrhhColaborador[]> => {
    const term = (search || '').trim();
    if (!term) return rrhhColaboradoresService.listar();

    const esc = term.replace(/'/g, "''");
    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .select(SELECT_COLS)
      .or(`nombre.ilike.%${esc}%,identificacion.ilike.%${esc}%`)
      .order('nombre', { ascending: true })
      .limit(80);

    if (error) throw error;
    return (data || []) as RrhhColaborador[];
  },

  obtenerPorId: async (id: string): Promise<RrhhColaborador | null> => {
    const cid = (id || '').trim();
    if (!cid) return null;
    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .select(SELECT_COLS)
      .eq('id', cid)
      .maybeSingle();
    if (error) throw error;
    return (data as RrhhColaborador) || null;
  },

  crear: async (payload: RrhhColaboradorCreate): Promise<RrhhColaborador> => {
    const row = {
      nombre: payload.nombre.trim(),
      identificacion: payload.identificacion.trim(),
      cargo: payload.cargo?.trim() || null,
      departamento: payload.departamento?.trim() || null,
      telefono: payload.telefono?.trim() || null,
      correo: payload.correo?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      estado: payload.estado || 'Activo',
      usuario_app_id: payload.usuario_app_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .insert(row)
      .select(SELECT_COLS)
      .single();

    if (error) throw error;
    return data as RrhhColaborador;
  },

  actualizar: async (
    id: string,
    payload: Partial<RrhhColaboradorCreate>,
  ): Promise<RrhhColaborador> => {
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.nombre !== undefined) row.nombre = payload.nombre.trim();
    if (payload.identificacion !== undefined) row.identificacion = payload.identificacion.trim();
    if (payload.cargo !== undefined) row.cargo = payload.cargo?.trim() || null;
    if (payload.departamento !== undefined) row.departamento = payload.departamento?.trim() || null;
    if (payload.telefono !== undefined) row.telefono = payload.telefono?.trim() || null;
    if (payload.correo !== undefined) row.correo = payload.correo?.trim() || null;
    if (payload.direccion !== undefined) row.direccion = payload.direccion?.trim() || null;
    if (payload.estado !== undefined) row.estado = payload.estado;
    if (payload.usuario_app_id !== undefined) row.usuario_app_id = payload.usuario_app_id || null;

    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .update(row)
      .eq('id', id)
      .select(SELECT_COLS)
      .single();

    if (error) throw error;
    return data as RrhhColaborador;
  },

  /**
   * Para formularios de Usuario/Colaborador:
   * al digitar identificación, devuelve coincidencias cruzadas.
   */
  buscarRelacionPorIdentificacion: async (
    identificacion: string,
  ): Promise<RrhhVinculoIdentificacion> => {
    const doc = (identificacion || '').trim();
    if (!doc) return { colaborador: null, usuarioApp: null };

    const [{ data: colab }, usuarioRes] = await Promise.all([
      supabase
        .from(TABLA_COLABORADORES)
        .select(SELECT_COLS)
        .eq('identificacion', doc)
        .maybeSingle(),
      supabase
        .from('usuarios_app')
        .select('id, nombre, apellido, usuario, cargo, area, activo, identificacion')
        .eq('identificacion', doc)
        .maybeSingle(),
    ]);

    let usuarioApp: RrhhVinculoIdentificacion['usuarioApp'] = null;
    if (!usuarioRes.error && usuarioRes.data) {
      const row = usuarioRes.data as Record<string, unknown>;
      usuarioApp = {
        id: String(row.id || ''),
        nombre: (row.nombre as string) || null,
        apellido: (row.apellido as string) || null,
        usuario: (row.usuario as string) || null,
        cargo: (row.cargo as string) || null,
        area: (row.area as string) || null,
        activo: (row.activo as boolean) ?? null,
      };
    }

    return {
      colaborador: (colab as RrhhColaborador) || null,
      usuarioApp,
    };
  },
};
