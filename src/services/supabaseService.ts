import { supabase } from '../lib/supabase';
import type {
  Obra,
  Tramite,
  MovimientoTramite,
  HistorialUpload,
  ObrasFilters,
  TramitesFilters,
  ApiResponse,
} from '../types/database';

/**
 * Servicio de Supabase para reemplazar las llamadas API del backend
 */

// ============================================
// SERVICIO DE OBRAS
// ============================================

export const obrasService = {
  /**
   * Obtener obras con filtros y paginación
   */
  obtenerObras: async (filtros: ObrasFilters = {}): Promise<ApiResponse<Obra[]>> => {
    try {
      let query = supabase
        .from('obras')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filtros.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros.responsable) {
        query = query.eq('responsable', filtros.responsable);
      }

      if (filtros.provincia) {
        query = query.eq('provincia', filtros.provincia);
      }

      if (filtros.municipio) {
        query = query.eq('municipio', filtros.municipio);
      }

      if (filtros.nivel) {
        query = query.eq('nivel', filtros.nivel);
      }

      if (filtros.fechaInauguracionDesde) {
        query = query.gte('fecha_inauguracion', filtros.fechaInauguracionDesde);
      }

      if (filtros.fechaInauguracionHasta) {
        query = query.lte('fecha_inauguracion', filtros.fechaInauguracionHasta);
      }

      // Búsqueda por texto - busca en TODOS los campos posibles
      if (filtros.search) {
        const searchTerm = filtros.search.trim();
        const searchPattern = `%${searchTerm}%`;
        
        // Verificar si es numérico (ID interno de Supabase - campo id numérico auto-incrementado)
        const isNumeric = /^\d+$/.test(searchTerm);
        
        // Construir búsqueda en todos los campos que existen
        let searchConditions: string[] = [];
        
        // Si es numérico, buscar por ID interno de Supabase (campo id numérico auto-incrementado)
        if (isNumeric) {
          searchConditions.push(`id.eq.${searchTerm}`);
        }
        
        // Buscar en todos los campos de texto que existen en la BD
        // NOTA: El ID del sistema (OB-0000, MT-0000) se busca en el campo "codigo"
        // ya que la columna id_obra no existe en la base de datos actual
        searchConditions.push(
          `codigo.ilike.${searchPattern}`, // Código (formato 0000-0000) - también contiene IDs del sistema (OB-0000, MT-0000)
          `nombre.ilike.${searchPattern}`,
          `estado.ilike.${searchPattern}`,
          `responsable.ilike.${searchPattern}`,
          `descripcion.ilike.${searchPattern}`,
          `provincia.ilike.${searchPattern}`,
          `municipio.ilike.${searchPattern}`,
          `nivel.ilike.${searchPattern}`,
          `distrito_minerd_sigede.ilike.${searchPattern}`
        );
        
        // Aplicar búsqueda OR en todos los campos
        query = query.or(searchConditions.join(','));
      }

      // Ordenar por fecha de creación descendente
      query = query.order('created_at', { ascending: false });

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
      console.error('Error al obtener obras:', error);
      throw new Error(error.message || 'Error al obtener obras');
    }
  },

  /**
   * Obtener una obra por cualquier identificador
   * Busca en: id (numérico), codigo (0000-0000), o cualquier campo
   * NOTA: id_obra NO existe en la BD de Supabase
   * - "codigo" = formato 0000-0000 (almacenado en codigo)
   * - "id" en la API probablemente se refiere al codigo o al id numérico
   */
  obtenerObraPorIdObra: async (idObra: string): Promise<Obra | null> => {
    try {
      const idObraNormalizado = idObra.trim().toUpperCase();
      const searchPattern = `%${idObraNormalizado}%`;
      
      // Verificar si es numérico (ID interno de Supabase)
      const isNumeric = /^\d+$/.test(idObraNormalizado);
      
      // Intentar búsqueda exacta primero
      // 1. Por codigo (0000-0000) - esto es "codigo" en la API
      let { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('codigo', idObraNormalizado)
        .single();

      // 2. Si es numérico, buscar por ID interno de Supabase
      if (error && error.code === 'PGRST116' && isNumeric) {
        const idNumerico = parseInt(idObraNormalizado);
        const result = await supabase
          .from('obras')
          .select('*')
          .eq('id', idNumerico)
          .single();
        
        if (!result.error && result.data) {
          return result.data;
        }
        error = result.error;
      }

      // 3. Si aún no encuentra, buscar en todos los campos con LIKE (sin id_obra)
      if (error && error.code === 'PGRST116') {
        const { data: searchData, error: searchError } = await supabase
          .from('obras')
          .select('*')
          .or(
            `codigo.ilike.${searchPattern},` +
            `nombre.ilike.${searchPattern},` +
            `estado.ilike.${searchPattern},` +
            `responsable.ilike.${searchPattern},` +
            `provincia.ilike.${searchPattern},` +
            `municipio.ilike.${searchPattern}`
          )
          .limit(1);
        
        if (!searchError && searchData && searchData.length > 0) {
          return searchData[0];
        }
      }

      // Si hay error y no es "no encontrado", lanzar error
      if (error) {
        // Si no se encuentra, retornar null
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error al obtener obra por id_obra:', error);
      // Si no se encuentra, retornar null en lugar de lanzar error
      if (error.code === 'PGRST116') {
        return null;
      }
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
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Obra no encontrada');

      return data;
    } catch (error: any) {
      console.error('Error al obtener obra:', error);
      throw new Error(error.message || 'Error al obtener obra');
    }
  },


  /**
   * Crear una nueva obra
   */
  crearObra: async (obra: Omit<Obra, 'id' | 'created_at' | 'updated_at'>): Promise<Obra> => {
    try {
      const { data, error } = await supabase
        .from('obras')
        .insert([obra])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Error al crear obra');

      return data;
    } catch (error: any) {
      console.error('Error al crear obra:', error);
      throw new Error(error.message || 'Error al crear obra');
    }
  },

  /**
   * Actualizar una obra
   */
  actualizarObra: async (id: number, updates: Partial<Obra>): Promise<Obra> => {
    try {
      const { data, error } = await supabase
        .from('obras')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Obra no encontrada');

      return data;
    } catch (error: any) {
      console.error('Error al actualizar obra:', error);
      throw new Error(error.message || 'Error al actualizar obra');
    }
  },

  /**
   * Eliminar una obra
   */
  eliminarObra: async (id: number): Promise<void> => {
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
   * Obtener estadísticas del dashboard
   */
  obtenerEstadisticas: async () => {
    try {
      // Obtener total de obras
      const { count: totalObras } = await supabase
        .from('obras')
        .select('*', { count: 'exact', head: true });

      // Obtener obras por estado (estados específicos del dashboard)
      const estadosEspecificos = ['ACTIVA', 'INAUGURADA', 'TERMINADA', 'DETENIDA', 'PRELIMINARES', 'INTERVENIDA MANTENIMIENTO', 'NO ESPECIFICADO'];
      const porEstado: Array<{ estado: string; cantidad: number }> = [];

      for (const estado of estadosEspecificos) {
        const { count } = await supabase
          .from('obras')
          .select('*', { count: 'exact', head: true })
          .eq('estado', estado);
        porEstado.push({
          estado: estado,
          cantidad: count || 0,
        });
      }

      // Obtener todas las obras para contar otros estados
      const { data: todasLasObras } = await supabase
        .from('obras')
        .select('estado');

      // Agregar estados que no están en la lista específica
      if (todasLasObras) {
        const estadosEncontrados = new Set(todasLasObras.map(o => o.estado));
        const estadosYaIncluidos = new Set(estadosEspecificos);
        
        estadosEncontrados.forEach(estado => {
          if (!estadosYaIncluidos.has(estado) && estado) {
            const cantidad = todasLasObras.filter(o => o.estado === estado).length;
            porEstado.push({ estado, cantidad });
          }
        });
      }

      // Obtener obras próximas a inaugurar (próximos 30 días)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);
      const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
      const fechaHoy = new Date().toISOString().split('T')[0];

      const { data: obrasProximas } = await supabase
        .from('obras')
        .select('*')
        .not('fecha_inauguracion', 'is', null)
        .gte('fecha_inauguracion', fechaHoy)
        .lte('fecha_inauguracion', fechaLimiteStr)
        .order('fecha_inauguracion', { ascending: true })
        .limit(10);

      // Obtener obras por responsable
      const { data: todasObras } = await supabase
        .from('obras')
        .select('responsable, provincia, municipio');

      const obrasPorResponsableMap = new Map<string, number>();
      const obrasPorProvinciaMap = new Map<string, number>();
      const obrasPorMunicipioMap = new Map<string, { provincia: string; cantidad: number }>();

      if (todasObras) {
        todasObras.forEach(obra => {
          const responsable = obra.responsable || 'Sin responsable';
          obrasPorResponsableMap.set(
            responsable,
            (obrasPorResponsableMap.get(responsable) || 0) + 1
          );
          const provincia = (obra.provincia || '').trim() || 'Sin provincia';
          obrasPorProvinciaMap.set(provincia, (obrasPorProvinciaMap.get(provincia) || 0) + 1);
          const municipio = (obra.municipio || '').trim() || 'Sin municipio';
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
          const tableError = new Error('Tabla historial_uploads no encontrada. Ejecuta el script SQL en Supabase.');
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
// SERVICIO DE STORAGE (para archivos)
// ============================================

export const storageService = {
  /**
   * Subir un archivo a Supabase Storage
   */
  subirArchivo: async (file: File, bucket: string, path: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
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
