/**
 * Tipos TypeScript para la base de datos Supabase
 * Estos tipos deben coincidir con el esquema de la base de datos
 */

export interface Obra {
  id: number; // ID auto-incrementado de Supabase (interno del sistema)
  id_obra?: string | null; // ID de la obra en la API (formato: OB-0000 o MT-0000) - NOTA: En la API esto se llama "id"
  codigo?: string | null; // Código de contrato (formato: 0000-0000) - NOTA: En la API esto se llama "codigo"
  nombre: string;
  estado: string;
  fecha_inicio?: string | null;
  fecha_fin_estimada?: string | null;
  responsable?: string | null;
  descripcion?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  nivel?: string | null;
  no_aula?: number | null;
  observacion_legal?: string | null;
  observacion_financiero?: string | null;
  latitud?: string | null;
  longitud?: string | null;
  distrito_minerd_sigede?: string | null;
  fecha_inauguracion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HistorialEstado {
  id: number;
  obra_id: number;
  estado_anterior?: string | null;
  estado_nuevo: string;
  fecha_cambio?: string | null;
  usuario?: string | null;
  observaciones?: string | null;
}

export interface Tramite {
  id: string;
  titulo: string;
  oficio?: string | null;
  nombre_destinatario: string;
  area_destinatario: string;
  area_destino_final: string;
  estado: 'en_transito' | 'detenido' | 'firmado' | 'procesado' | 'completado';
  codigo_barras?: string | null;
  archivo_pdf?: string | null;
  nombre_archivo?: string | null;
  fecha_creacion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MovimientoTramite {
  id: number;
  tramite_id: string;
  area_origen: string;
  area_destino: string;
  oficio?: string | null;
  fecha_movimiento?: string | null;
  observaciones?: string | null;
  usuario?: string | null;
  /** Estado que quedó el trámite tras este movimiento (ej. 'detenido', 'completado'). Para indicadores en historial. */
  estado_resultante?: string | null;
}

export interface HistorialUpload {
  id: number;
  nombre_archivo: string;
  tipo_archivo: string;
  fecha_subida?: string | null;
  registros_procesados?: number | null;
  registros_exitosos?: number | null;
  registros_fallidos?: number | null;
  usuario?: string | null;
  observaciones?: string | null;
}

// Tipos para filtros y consultas
export interface ObrasFilters {
  limit?: number;
  offset?: number;
  search?: string;
  estado?: string;
  responsable?: string;
  provincia?: string;
  municipio?: string;
  nivel?: string;
  fechaInauguracionDesde?: string;
  fechaInauguracionHasta?: string;
}

export interface TramitesFilters {
  search?: string;
  estado?: string;
  area?: string;
  /** Si se indica, solo se devuelven trámites enviados por o enviados a esta área (ignorado si esAdmin) */
  areaUsuario?: string;
  /** Si true, se ignoran filtros por área y se devuelven todos los trámites */
  esAdmin?: boolean;
  limit?: number;
  offset?: number;
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  data: T;
  count?: number;
  error?: string;
}
