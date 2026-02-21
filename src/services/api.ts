import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { obrasService, historialUploadsService, storageService, tramitesService } from './supabaseService';
import type { Obra, Tramite, MovimientoTramite } from '../types/database';
import { 
  procesarArchivoXml, 
  procesarArchivoExcel, 
  validarArchivoXml, 
  validarArchivoExcel 
} from './fileProcessor';
import * as XLSX from 'xlsx';

// Re-exportar tipos para compatibilidad
export type { Obra, Tramite, MovimientoTramite };

// Mantener apiClient para operaciones que aún requieren el backend (uploads, etc.)
// Usar backend local para seguimiento de trámites
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// API de Mantenimientos usando Supabase
export const mantenimientosAPI = {
  obtenerObras: async (params: { limit?: number; offset?: number; search?: string; estado?: string; responsable?: string; provincia?: string }) => {
    try {
      const response = await obrasService.obtenerObras({
        limit: params.limit,
        offset: params.offset,
        search: params.search,
        estado: params.estado,
        responsable: params.responsable,
        provincia: params.provincia,
      });
      // Simular respuesta de Axios para compatibilidad
      return {
        data: response,
      } as AxiosResponse<{ data: Obra[]; count: number }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },

  eliminarObra: async (id: number) => {
    try {
      await obrasService.eliminarObra(id);
      return {
        data: { success: true },
      } as AxiosResponse<{ success: boolean }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },
};

// API de Estadísticas usando Supabase
export const statsAPI = {
  obtenerResumenDashboard: async () => {
    try {
      const stats = await obrasService.obtenerEstadisticas();
      return {
        data: { data: stats },
      } as AxiosResponse<{ data: any }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },

  obtenerObrasProximasInaugurar: async () => {
    try {
      const stats = await obrasService.obtenerEstadisticas();
      return {
        data: { data: stats.obrasProximasInaugurar },
      } as AxiosResponse<{ data: Obra[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message },
          status: 500,
        },
      };
    }
  },
};

// Upload API - Usando Supabase
export const uploadAPI = {
  descargarDatos: async (params: {
    estado?: string;
    responsable?: string;
    search?: string;
    provincia?: string;
    municipio?: string;
    nivel?: string;
    fechaInauguracionDesde?: string;
    fechaInauguracionHasta?: string;
  }) => {
    try {
      // Obtener obras con filtros desde Supabase
      const response = await obrasService.obtenerObras({
        estado: params.estado,
        responsable: params.responsable,
        search: params.search,
        provincia: params.provincia,
        municipio: params.municipio,
        nivel: params.nivel,
        fechaInauguracionDesde: params.fechaInauguracionDesde,
        fechaInauguracionHasta: params.fechaInauguracionHasta,
      });

      // Convertir a Excel
      const obras = response.data;
      const worksheet = XLSX.utils.json_to_sheet(obras);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Obras');
      
      // Generar blob
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      return {
        data: blob,
      } as AxiosResponse<Blob>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al exportar datos' },
          status: 500,
        },
      };
    }
  },

  subirXml: async (file: File) => {
    try {
      // Intentar subir archivo a Supabase Storage (opcional)
      let storageUrl: string | null = null;
      try {
        const timestamp = Date.now();
        const fileName = `uploads/xml/${timestamp}-${file.name}`;
        storageUrl = await storageService.subirArchivo(file, 'documentos', fileName);
      } catch (storageError: any) {
        // Si el bucket no existe, continuar sin guardar en storage
        console.warn('No se pudo subir a Storage (el bucket puede no existir):', storageError.message);
        if (storageError.message?.includes('Bucket not found')) {
          console.warn('⚠️  Bucket "documentos" no encontrado. Por favor, créalo en Supabase Storage.');
        }
      }

      // Procesar archivo (esto es lo importante)
      const resultado = await procesarArchivoXml(file);

      // Registrar en historial (opcional - si la tabla no existe, se omite)
      try {
        await historialUploadsService.registrarUpload({
          nombre_archivo: file.name,
          tipo_archivo: 'XML',
          registros_procesados: resultado.total,
          registros_exitosos: resultado.exitosas,
          registros_fallidos: resultado.fallidas,
          observaciones: resultado.errores.length > 0 
            ? `Errores: ${resultado.errores.slice(0, 5).join('; ')}` 
            : null,
        });
      } catch (historialError: any) {
        // Silenciar error si la tabla no existe - no es crítico para el procesamiento
        if (historialError?.message?.includes('Could not find the table') || 
            historialError?.message?.includes('relation') ||
            historialError?.message?.includes('does not exist')) {
          console.warn('⚠️  Tabla historial_uploads no encontrada. El procesamiento continuó exitosamente.');
          console.warn('💡 Para habilitar el historial, ejecuta el script SQL en Supabase.');
        } else {
          console.warn('No se pudo registrar en historial:', historialError);
        }
      }

      return {
        data: {
          success: true,
          message: 'Archivo XML procesado exitosamente',
          data: resultado,
        },
      } as AxiosResponse<any>;
    } catch (error: any) {
      throw {
        response: {
          data: { 
            error: error.message || 'Error al procesar archivo XML',
            detalles: error.message?.split('\n') || [error.message]
          },
          status: 500,
        },
      };
    }
  },

  validarXml: async (file: File) => {
    try {
      await validarArchivoXml(file);
      return {
        data: { success: true, message: 'Archivo XML válido' },
      } as AxiosResponse<any>;
    } catch (error: any) {
      throw {
        response: {
          data: { 
            error: error.message || 'El archivo XML no es válido',
            detalles: error.message?.split('\n') || [error.message]
          },
          status: 400,
        },
      };
    }
  },

  descargarPlantilla: () => {
    // Generar plantilla XML vacía con todas las columnas requeridas
    const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<mantenimientos>
  <obra>
    <!-- Campos obligatorios -->
    <!-- id_obra: ID de la obra (formato: OB-0000 o MT-0000) - OBLIGATORIO -->
    <id_obra>OB-0000</id_obra>
    <!-- codigo: Código de contrato (formato: número con guion, ej: 123-456) -->
    <codigo>123-456</codigo>
    <nombre>Nombre de la obra</nombre>
    <estado>ACTIVA</estado>
    
    <!-- Información general -->
    <responsable>Nombre del responsable o contratista</responsable>
    <descripcion>Descripción detallada de la obra</descripcion>
    
    <!-- Ubicación -->
    <provincia>Nombre de la provincia</provincia>
    <municipio>Nombre del municipio</municipio>
    <nivel>Nivel educativo (Inicial, Primario, Secundario, etc.)</nivel>
    <no_aula>1</no_aula>
    <distrito_minerd_sigede>Código del distrito MINERD SIGEDE</distrito_minerd_sigede>
    <latitud>18.4861</latitud>
    <longitud>-69.9312</longitud>
    
    <!-- Fechas (formato: YYYY-MM-DD) -->
    <fecha_inicio>2024-01-01</fecha_inicio>
    <fecha_fin_estimada>2024-12-31</fecha_fin_estimada>
    <fecha_inauguracion>2024-06-01</fecha_inauguracion>
    
    <!-- Observaciones -->
    <observacion_legal>Observaciones del área legal</observacion_legal>
    <observacion_financiero>Observaciones del área financiero</observacion_financiero>
  </obra>
</mantenimientos>`;
    
    const blob = new Blob([xmlTemplate], { type: 'application/xml' });
    return Promise.resolve({
      data: blob,
    } as AxiosResponse<Blob>);
  },

  descargarPlantillaExcel: () => {
    // Generar plantilla Excel vacía con todas las columnas requeridas
    // Orden: Obligatorios primero, luego información general, ubicación, fechas, observaciones
    const headers = [
      // Campos obligatorios
      'id_obra', // ID de la obra (OB-0000, MT-0000) - OBLIGATORIO
      'codigo', // Código de contrato (número con guion, ej: 123-456)
      'nombre',
      'estado',
      
      // Información general
      'responsable',
      'descripcion',
      
      // Ubicación
      'provincia',
      'municipio',
      'nivel',
      'no_aula',
      'distrito_minerd_sigede',
      'latitud',
      'longitud',
      
      // Fechas (formato: YYYY-MM-DD)
      'fecha_inicio',
      'fecha_fin_estimada',
      'fecha_inauguracion',
      
      // Observaciones
      'observacion_legal',
      'observacion_financiero'
    ];
    
    // Crear hoja con encabezados y una fila de ejemplo con valores de muestra
    const ejemplo = [
      // Campos obligatorios
      'OB-0000', // id_obra (OB-0000 o MT-0000) - OBLIGATORIO
      '123-456', // codigo (número con guion)
      'Nombre de la obra',
      'ACTIVA',
      
      // Información general
      'Nombre del responsable o contratista',
      'Descripción detallada de la obra',
      
      // Ubicación
      'Nombre de la provincia',
      'Nombre del municipio',
      'Nivel educativo (Inicial, Primario, Secundario, etc.)',
      1,
      'Código del distrito MINERD SIGEDE',
      '18.4861',
      '-69.9312',
      
      // Fechas
      '2024-01-01',
      '2024-12-31',
      '2024-06-01',
      
      // Observaciones
      'Observaciones del área legal',
      'Observaciones del área financiero'
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
    
    // Ajustar ancho de columnas para mejor visualización
    const colWidths = [
      { wch: 12 },  // codigo
      { wch: 30 },  // nombre
      { wch: 15 },  // estado
      { wch: 30 },  // responsable
      { wch: 40 },  // descripcion
      { wch: 20 },  // provincia
      { wch: 20 },  // municipio
      { wch: 25 },  // nivel
      { wch: 10 },  // no_aula
      { wch: 25 },  // distrito_minerd_sigede
      { wch: 12 },  // latitud
      { wch: 12 },  // longitud
      { wch: 12 },  // fecha_inicio
      { wch: 15 },  // fecha_fin_estimada
      { wch: 15 },  // fecha_inauguracion
      { wch: 35 },  // observacion_legal
      { wch: 35 },  // observacion_financiero
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Obras');
    
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    return Promise.resolve({
      data: blob,
    } as AxiosResponse<Blob>);
  },

  subirExcel: async (file: File) => {
    try {
      // Intentar subir archivo a Supabase Storage (opcional)
      let storageUrl: string | null = null;
      try {
        const timestamp = Date.now();
        const fileName = `uploads/excel/${timestamp}-${file.name}`;
        storageUrl = await storageService.subirArchivo(file, 'documentos', fileName);
      } catch (storageError: any) {
        // Si el bucket no existe, continuar sin guardar en storage
        console.warn('No se pudo subir a Storage (el bucket puede no existir):', storageError.message);
        if (storageError.message?.includes('Bucket not found')) {
          console.warn('⚠️  Bucket "documentos" no encontrado. Por favor, créalo en Supabase Storage.');
        }
      }

      // Procesar archivo (esto es lo importante)
      const resultado = await procesarArchivoExcel(file);

      // Registrar en historial (opcional - si la tabla no existe, se omite)
      try {
        await historialUploadsService.registrarUpload({
          nombre_archivo: file.name,
          tipo_archivo: 'EXCEL',
          registros_procesados: resultado.total,
          registros_exitosos: resultado.exitosas,
          registros_fallidos: resultado.fallidas,
          observaciones: resultado.errores.length > 0 
            ? `Errores: ${resultado.errores.slice(0, 5).join('; ')}` 
            : null,
        });
      } catch (historialError: any) {
        // Silenciar error si la tabla no existe - no es crítico para el procesamiento
        if (historialError?.message?.includes('Could not find the table') || 
            historialError?.message?.includes('relation') ||
            historialError?.message?.includes('does not exist')) {
          console.warn('⚠️  Tabla historial_uploads no encontrada. El procesamiento continuó exitosamente.');
          console.warn('💡 Para habilitar el historial, ejecuta el script SQL en Supabase.');
        } else {
          console.warn('No se pudo registrar en historial:', historialError);
        }
      }

      return {
        data: {
          success: true,
          message: 'Archivo Excel procesado exitosamente',
          data: resultado,
        },
      } as AxiosResponse<any>;
    } catch (error: any) {
      throw {
        response: {
          data: { 
            error: error.message || 'Error al procesar archivo Excel',
            detalles: error.message?.split('\n') || [error.message]
          },
          status: 500,
        },
      };
    }
  },

  validarExcel: async (file: File) => {
    try {
      await validarArchivoExcel(file);
      return {
        data: { success: true, message: 'Archivo Excel válido' },
      } as AxiosResponse<any>;
    } catch (error: any) {
      throw {
        response: {
          data: { 
            error: error.message || 'El archivo Excel no es válido',
            detalles: error.message?.split('\n') || [error.message]
          },
          status: 400,
        },
      };
    }
  },

  obtenerHistorial: async () => {
    try {
      const historial = await historialUploadsService.obtenerHistorial();
      return {
        data: { success: true, data: historial },
      } as AxiosResponse<{ success: boolean; data: any[]; message?: string }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener historial' },
          status: 500,
        },
      };
    }
  },
};

// Trámites API - Conectado a Supabase (seguimiento de trámites)
export const tramitesAPI = {
  obtenerTramites: async (params?: { search?: string; estado?: string; area?: string; areaUsuario?: string; esAdmin?: boolean; limit?: number; offset?: number }) => {
    try {
      const response = await tramitesService.obtenerTramites({
        search: params?.search,
        estado: params?.estado,
        area: params?.area,
        areaUsuario: params?.areaUsuario,
        esAdmin: params?.esAdmin,
        limit: params?.limit ?? 12,
        offset: params?.offset ?? 0,
      });
      return {
        data: { data: response.data, count: response.count ?? response.data.length },
      } as AxiosResponse<{ data: Tramite[]; count: number }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener trámites' },
          status: 500,
        },
      };
    }
  },

  obtenerTramitePorId: async (id: string) => {
    try {
      const data = await tramitesService.obtenerTramitePorId(id);
      return { data: { data } } as AxiosResponse<{ data: Tramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Trámite no encontrado' },
          status: 404,
        },
      };
    }
  },

  crearTramite: async (tramite: {
    titulo: string;
    oficio?: string | null;
    nombre_destinatario: string;
    area_destinatario: string;
    area_destino_final: string;
    proceso?: string | null;
    codigo_area?: string;
  }) => {
    try {
      const prefijo = tramite.codigo_area || 'TR';
      // Sufijo numérico de 6 dígitos para el ID (ej: TR-123456)
      const sufijo = (Date.now() % 1000000).toString().padStart(6, '0');
      const id = `${prefijo}-${sufijo}`;
      const { codigo_area: _, ...resto } = tramite;
      const data = await tramitesService.crearTramite({
        ...resto,
        id,
        estado: 'en_transito',
        codigo_barras: `${Date.now()}`,
        proceso: tramite.proceso ?? undefined,
      });
      return { data: { data } } as AxiosResponse<{ data: Tramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al crear trámite' },
          status: 500,
        },
      };
    }
  },

  crearTramiteConArchivo: async (formData: FormData) => {
    try {
      const titulo = formData.get('titulo') as string;
      const oficio = (formData.get('oficio') as string) || null;
      const nombre_destinatario = formData.get('nombre_destinatario') as string;
      const area_destinatario = formData.get('area_destinatario') as string;
      const area_destino_final = formData.get('area_destino_final') as string;
      const codigo_area = (formData.get('codigo_area') as string) || 'TR';
      const proceso = (formData.get('proceso') as string) || null;
      const archivoPdf = formData.get('archivo_pdf') as File | null;

      if (!titulo || !nombre_destinatario || !area_destinatario || !area_destino_final) {
        throw new Error('Faltan campos requeridos del trámite');
      }
      if (!archivoPdf || !(archivoPdf instanceof File)) {
        throw new Error('Debe adjuntar un archivo PDF');
      }

      const prefijo = codigo_area || 'TR';
      // Sufijo numérico de 6 dígitos para el ID (ej: TR-123456)
      const sufijo = (Date.now() % 1000000).toString().padStart(6, '0');
      const id = `${prefijo}-${sufijo}`;
      const codigoBarras = `${Date.now()}`;
      let archivoPdfUrl: string | null = null;

      try {
        const path = `tramites/${id}-${archivoPdf.name}`;
        archivoPdfUrl = await storageService.subirArchivo(archivoPdf, 'documentos', path);
      } catch (storageError: any) {
        console.warn('No se pudo subir PDF a Storage:', storageError?.message);
        if (storageError?.message?.includes('Bucket not found')) {
          console.warn('⚠️  Crea el bucket "documentos" en Supabase Storage para guardar los PDFs.');
        }
      }

      const data = await tramitesService.crearTramite({
        id,
        titulo,
        oficio: oficio || undefined,
        nombre_destinatario,
        area_destinatario,
        area_destino_final,
        proceso: proceso || undefined,
        estado: 'en_transito',
        codigo_barras: codigoBarras,
        archivo_pdf: archivoPdfUrl,
        nombre_archivo: archivoPdf.name,
      });

      return { data: { data } } as AxiosResponse<{ data: Tramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al crear trámite con archivo' },
          status: 500,
        },
      };
    }
  },

  actualizarTramite: async (id: string, tramite: Partial<Tramite>) => {
    try {
      const data = await tramitesService.actualizarTramite(id, tramite);
      return { data: { data } } as AxiosResponse<{ data: Tramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al actualizar trámite' },
          status: 500,
        },
      };
    }
  },

  eliminarTramite: async (id: string) => {
    try {
      await tramitesService.eliminarTramite(id);
      return { data: { success: true } } as AxiosResponse<{ success: boolean }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al eliminar trámite' },
          status: 500,
        },
      };
    }
  },

  obtenerHistorialTramite: async (id: string) => {
    try {
      const data = await tramitesService.obtenerHistorialTramite(id);
      return { data: { data } } as AxiosResponse<{ data: MovimientoTramite[] }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al obtener historial' },
          status: 500,
        },
      };
    }
  },

  obtenerTiemposActualesPorTramites: async (tramiteIds: string[]) => {
    try {
      const data = await tramitesService.obtenerTiemposActualesPorTramites(tramiteIds);
      return { data: { data } } as AxiosResponse<{ data: Record<string, import('../types/database').TiempoEnArea | null> }>;
    } catch (error: any) {
      return { data: { data: {} } } as AxiosResponse<{ data: Record<string, import('../types/database').TiempoEnArea | null> }>;
    }
  },

  registrarMovimiento: async (id: string, movimiento: {
    area_origen: string;
    area_destino: string;
    oficio?: string | null;
    observaciones?: string;
    usuario?: string;
    actualizar_estado?: string;
  }) => {
    try {
      const tramite = await tramitesService.obtenerTramitePorId(id);
      const data = await tramitesService.registrarMovimiento(id, {
        area_origen: movimiento.area_origen,
        area_destino: movimiento.area_destino,
        oficio: movimiento.oficio ?? null,
        observaciones: movimiento.observaciones,
        usuario: movimiento.usuario,
        estado_resultante: movimiento.actualizar_estado ?? null,
      });
      if (movimiento.actualizar_estado) {
        await tramitesService.actualizarTramite(id, {
          estado: movimiento.actualizar_estado as Tramite['estado'],
          area_destinatario: movimiento.area_destino,
        });
      }
      if (tramite.proceso) {
        await tramitesService.cerrarTiempoEnAreaActual(id);
        if (movimiento.actualizar_estado !== 'completado') {
          await tramitesService.abrirTiempoEnArea(id, movimiento.area_destino, tramite.proceso);
        }
      }
      return { data: { data } } as AxiosResponse<{ data: MovimientoTramite }>;
    } catch (error: any) {
      throw {
        response: {
          data: { error: error.message || 'Error al registrar movimiento' },
          status: 500,
        },
      };
    }
  },
};

export default apiClient;


