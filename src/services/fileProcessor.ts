/**
 * Servicio para procesar archivos XML y Excel en el frontend
 */

import * as XLSX from 'xlsx';
import { XMLParser } from 'fast-xml-parser';
import { obrasService, historialUploadsService, storageService } from './supabaseService';
import { supabase } from '../lib/supabase';
import type { Obra } from '../types/database';

/**
 * Procesar archivo XML y extraer obras
 */
export const procesarArchivoXml = async (file: File): Promise<{
  total: number;
  exitosas: number;
  fallidas: number;
  errores: string[];
  creadas: number;
  actualizadas: number;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const xmlContent = e.target?.result as string;
        
        // Parsear XML usando fast-xml-parser
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          textNodeName: '#text',
          parseAttributeValue: true,
          trimValues: true,
        });

        let result: any;
        try {
          result = parser.parse(xmlContent);
        } catch (err: any) {
          reject(new Error(`Error al parsear XML: ${err.message}`));
          return;
        }

        try {
          // Validar estructura
          if (!result.mantenimientos || !result.mantenimientos.obra) {
            reject(new Error('Estructura XML inválida: No se encontró el elemento mantenimientos.obra'));
            return;
          }

          const obrasXml = Array.isArray(result.mantenimientos.obra)
            ? result.mantenimientos.obra
            : [result.mantenimientos.obra];

          const resultados = {
            total: obrasXml.length,
            exitosas: 0,
            fallidas: 0,
            errores: [] as string[],
            creadas: 0,
            actualizadas: 0,
          };

          // Procesar cada obra
          for (const obraXml of obrasXml) {
            try {
              const obra = mapearObraDesdeXml(obraXml);
              
              // Validar que id_obra esté presente (obligatorio)
              if (!obra.id_obra || obra.id_obra.trim() === '') {
                resultados.fallidas++;
                resultados.errores.push(`Obra sin ID (id_obra es obligatorio, formato: OB-0000 o MT-0000)`);
                continue;
              }
              
              // Validar formato de id_obra (OB-0000 o MT-0000)
              const idObraPattern = /^(OB|MT)-\d{4}$/i;
              const idObraNormalizado = obra.id_obra.trim().toUpperCase();
              if (!idObraPattern.test(idObraNormalizado)) {
                resultados.fallidas++;
                resultados.errores.push(`ID inválido: "${obra.id_obra}". Debe ser OB-0000 o MT-0000 (4 dígitos)`);
                continue;
              }
              
              // En la BD el identificador es la columna id (varchar), no id_obra
              console.log(`🔍 Buscando obra con ID: "${idObraNormalizado}"`);
              
              const { data: obrasExistentes, error: searchError } = await supabase
                .from('obras')
                .select('*')
                .eq('id', idObraNormalizado)
                .limit(1);

              if (searchError) {
                console.error('Error al buscar obra existente:', searchError);
                throw searchError;
              }

              const obraExistente = obrasExistentes && obrasExistentes.length > 0 ? obrasExistentes[0] : null;
              
              if (obraExistente) {
                console.log(`✅ ACTUALIZANDO obra con ID "${idObraNormalizado}" (ID en BD: ${obraExistente.id})`);
                const { id_obra: _, ...rest } = obra;
                const obraParaActualizar = Object.fromEntries(
                  Object.entries(rest).filter(([k, v]) => v !== undefined && k !== 'id_obra')
                ) as Partial<Omit<Obra, 'id' | 'created_at' | 'updated_at'>>;
                await obrasService.actualizarObra(obraExistente.id as number | string, obraParaActualizar);
                resultados.actualizadas++;
              } else {
                console.log(`➕ CREANDO nueva obra con ID "${idObraNormalizado}"`);
                const { id_obra: __, ...rest } = obra;
                const obraParaCrear = {
                  ...Object.fromEntries(Object.entries(rest).filter(([k, v]) => v !== undefined && k !== 'id_obra')),
                  id: idObraNormalizado
                };
                await obrasService.crearObra(obraParaCrear);
                resultados.creadas++;
              }
              
              resultados.exitosas++;
            } catch (error: any) {
              resultados.fallidas++;
              resultados.errores.push(`Error en obra ${obraXml.id || obraXml['@_id'] || 'desconocida'}: ${error.message}`);
            }
          }

          resolve(resultados);
        } catch (error: any) {
          reject(new Error(`Error al procesar obras: ${error.message}`));
        }
      } catch (error: any) {
        reject(new Error(`Error al leer archivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file);
  });
};

/**
 * Procesar archivo Excel y extraer obras
 */
export const procesarArchivoExcel = async (file: File): Promise<{
  total: number;
  exitosas: number;
  fallidas: number;
  errores: string[];
  creadas: number;
  actualizadas: number;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Obtener la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (!jsonData || jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío o no tiene datos'));
          return;
        }

        const resultados = {
          total: jsonData.length,
          exitosas: 0,
          fallidas: 0,
          errores: [] as string[],
          creadas: 0,
          actualizadas: 0,
        };

        // Procesar cada fila
        for (const row of jsonData as any[]) {
          try {
            const obra = mapearObraDesdeExcel(row);
            
            // Validar que id_obra esté presente (obligatorio)
            if (!obra.id_obra || obra.id_obra.trim() === '') {
              resultados.fallidas++;
              resultados.errores.push('Fila sin ID (id_obra es obligatorio, formato: OB-0000 o MT-0000). Columnas encontradas: ' + JSON.stringify(Object.keys(row)));
              continue;
            }
            
            // Validar formato de id_obra (OB-0000 o MT-0000)
            const idObraPattern = /^(OB|MT)-\d{4}$/i;
            const idObraNormalizado = obra.id_obra.trim().toUpperCase();
            if (!idObraPattern.test(idObraNormalizado)) {
              resultados.fallidas++;
              resultados.errores.push(`ID inválido: "${obra.id_obra}". Debe ser OB-0000 o MT-0000 (4 dígitos)`);
              continue;
            }
            
            // En la BD el identificador es la columna id (varchar), no id_obra
            console.log(`🔍 Buscando obra con ID: "${idObraNormalizado}"`);
            
            const { data: obrasExistentes, error: searchError } = await supabase
              .from('obras')
              .select('*')
              .eq('id', idObraNormalizado)
              .limit(1);

            if (searchError) {
              console.error('Error al buscar obra existente:', searchError);
              throw searchError;
            }

            const obraExistente = obrasExistentes && obrasExistentes.length > 0 ? obrasExistentes[0] : null;
            
            if (obraExistente) {
              console.log(`✅ ACTUALIZANDO obra con ID "${idObraNormalizado}" (ID en BD: ${obraExistente.id})`);
              const { id_obra: _, ...rest } = obra;
              const obraParaActualizar = Object.fromEntries(
                Object.entries(rest).filter(([k, v]) => v !== undefined && k !== 'id_obra')
              ) as Partial<Omit<Obra, 'id' | 'created_at' | 'updated_at'>>;
              await obrasService.actualizarObra(obraExistente.id as number | string, obraParaActualizar);
              resultados.actualizadas++;
            } else {
              console.log(`➕ CREANDO nueva obra con ID "${idObraNormalizado}"`);
              const { id_obra: __, ...rest } = obra;
              const obraParaCrear = {
                ...Object.fromEntries(Object.entries(rest).filter(([k, v]) => v !== undefined && k !== 'id_obra')),
                id: idObraNormalizado
              };
              await obrasService.crearObra(obraParaCrear);
              resultados.creadas++;
            }
            
            resultados.exitosas++;
          } catch (error: any) {
            resultados.fallidas++;
            resultados.errores.push(`Error en fila: ${error.message}`);
          }
        }

        resolve(resultados);
      } catch (error: any) {
        reject(new Error(`Error al procesar Excel: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Mapear datos XML a objeto Obra
 */
const mapearObraDesdeXml = (obraXml: any): Omit<Obra, 'id' | 'created_at' | 'updated_at'> => {
  const getValue = (field: any): string | null => {
    if (!field) return null;
    // fast-xml-parser puede devolver strings directamente o objetos con #text
    if (typeof field === 'string') {
      return field.trim() || null;
    }
    if (typeof field === 'object') {
      // Si es un objeto con #text, usar ese valor
      if (field['#text'] !== undefined) {
        return String(field['#text']).trim() || null;
      }
      // Si es un array, tomar el primer elemento
      if (Array.isArray(field) && field.length > 0) {
        const first = field[0];
        if (typeof first === 'string') {
          return first.trim() || null;
        }
        if (first && first['#text'] !== undefined) {
          return String(first['#text']).trim() || null;
        }
        return String(first).trim() || null;
      }
      // Si es un objeto simple, convertirlo a string
      return String(field).trim() || null;
    }
    return String(field).trim() || null;
  };

  const getNumber = (field: any): number | null => {
    const value = getValue(field);
    if (!value) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  };

  const getDate = (field: any): string | null => {
    const value = getValue(field);
    if (!value) return null;
    
    // Intentar parsear como fecha
    try {
      let date: Date | null = null;
      
      // Formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date = new Date(value + 'T00:00:00');
      }
      // Formato DD/MM/YYYY o MM/DD/YYYY
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        const parts = value.split('/');
        // Asumir formato DD/MM/YYYY (más común en español)
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      // Otros formatos, usar Date constructor
      else {
        date = new Date(value);
      }
      
      if (!date || isNaN(date.getTime())) {
        console.warn(`Fecha inválida en XML: ${value}`);
        return null;
      }
      
      // Validar que la fecha esté en un rango razonable (1900-2100)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        console.warn(`Año fuera de rango en XML: ${year} (valor: ${value})`);
        return null;
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn(`Error al parsear fecha en XML: ${value}`, error);
      return null;
    }
  };

  // Extraer id_obra (OB-0000, MT-0000) - identificador principal
  const idObra = getValue(obraXml.id_obra) || getValue(obraXml.id) || getValue(obraXml['@_id']) || '';
  // Normalizar a mayúsculas
  const idObraNormalizado = idObra.trim().toUpperCase();
  
  // Extraer codigo (número con guion)
  const codigo = getValue(obraXml.codigo) || getValue(obraXml.codigo_contrato) || '';

  return {
    id_obra: idObraNormalizado || null, // ID de la obra (OB-0000, MT-0000) - OBLIGATORIO
    codigo: codigo || null, // Código de contrato (número con guion)
    nombre: getValue(obraXml.nombre) || '',
    estado: getValue(obraXml.estado) || 'NO ESPECIFICADO',
    fecha_inicio: getDate(obraXml.fecha_inicio),
    fecha_fin_estimada: getDate(obraXml.fecha_fin_estimada),
    responsable: getValue(obraXml.responsable),
    descripcion: getValue(obraXml.descripcion),
    provincia: getValue(obraXml.provincia),
    municipio: getValue(obraXml.municipio),
    nivel: getValue(obraXml.nivel),
    no_aula: getNumber(obraXml.no_aula),
    observacion_legal: getValue(obraXml.observacion_legal),
    observacion_financiero: getValue(obraXml.observacion_financiero),
    latitud: getValue(obraXml.latitud),
    longitud: getValue(obraXml.longitud),
    distrito_minerd_sigede: getValue(obraXml.distrito_minerd_sigede),
    fecha_inauguracion: getDate(obraXml.fecha_inauguracion),
  };
};

/**
 * Mapear datos Excel a objeto Obra
 */
const mapearObraDesdeExcel = (row: any): Omit<Obra, 'id' | 'created_at' | 'updated_at'> => {
  const getValue = (field: any): string | null => {
    if (field === null || field === undefined || field === '') return null;
    return String(field).trim() || null;
  };

  const getNumber = (field: any): number | null => {
    const value = getValue(field);
    if (!value) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  };

  const getDate = (field: any): string | null => {
    if (field === null || field === undefined || field === '') return null;
    
    // Si es un número (fecha serial de Excel), convertir
    if (typeof field === 'number') {
      try {
        // Excel usa fechas seriales desde 1900-01-01
        // Validar que sea un número razonable (entre 1 y 100000)
        if (field < 1 || field > 100000) {
          console.warn(`Fecha serial de Excel fuera de rango: ${field}`);
          return null;
        }
        
        // Convertir fecha serial de Excel a fecha JavaScript
        // Excel cuenta desde 1900-01-01, pero tiene un bug: cuenta 1900 como año bisiesto
        const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
        const jsDate = new Date(excelEpoch.getTime() + field * 24 * 60 * 60 * 1000);
        
        // Validar que la fecha sea válida
        if (isNaN(jsDate.getTime())) {
          console.warn(`Fecha inválida generada desde serial: ${field}`);
          return null;
        }
        
        // Validar que la fecha esté en un rango razonable (1900-2100)
        const year = jsDate.getFullYear();
        if (year < 1900 || year > 2100) {
          console.warn(`Año fuera de rango: ${year}`);
          return null;
        }
        
        return jsDate.toISOString().split('T')[0];
      } catch (error) {
        console.warn(`Error al convertir fecha serial de Excel: ${field}`, error);
        return null;
      }
    }
    
    // Si es string, intentar parsear
    const value = String(field).trim();
    if (!value || value === '') return null;
    
    // Intentar parsear como fecha
    try {
      // Intentar diferentes formatos de fecha comunes
      let date: Date | null = null;
      
      // Formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date = new Date(value + 'T00:00:00');
      }
      // Formato DD/MM/YYYY o MM/DD/YYYY
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        const parts = value.split('/');
        // Asumir formato DD/MM/YYYY (más común en español)
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      // Otros formatos, usar Date constructor
      else {
        date = new Date(value);
      }
      
      if (!date || isNaN(date.getTime())) {
        console.warn(`Fecha inválida: ${value}`);
        return null;
      }
      
      // Validar que la fecha esté en un rango razonable
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        console.warn(`Año fuera de rango: ${year} (valor: ${value})`);
        return null;
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn(`Error al parsear fecha: ${value}`, error);
      return null;
    }
  };

  // Extraer id_obra (OB-0000, MT-0000) - identificador principal
  const idObra = getValue(row.id_obra) || 
                 getValue(row['ID OBRA']) || 
                 getValue(row['ID_OBRA']) || 
                 getValue(row.id) || 
                 getValue(row.ID) || 
                 getValue(row.Id) || 
                 getValue(row['ID SIGEDE']) ||
                 '';
  // Normalizar a mayúsculas
  const idObraNormalizado = idObra.trim().toUpperCase();
  
  // codigo es el número de contrato (número con guion, ej: 123-456)
  const codigo = getValue(row.codigo) || 
                 getValue(row.Código) || 
                 getValue(row.CODIGO) || 
                 getValue(row['NO. CONTRATO']) ||
                 getValue(row['No. Contrato']) ||
                 getValue(row['CÓDIGO']) ||
                 '';

  return {
    id_obra: idObraNormalizado || null, // ID de la obra (OB-0000, MT-0000) - OBLIGATORIO
    codigo: codigo || null, // Código de contrato (número con guion)
    nombre: getValue(row.nombre) || getValue(row.Nombre) || getValue(row.NOMBRE) || '',
    estado: getValue(row.estado) || getValue(row.Estado) || getValue(row.ESTADO) || 'NO ESPECIFICADO',
    fecha_inicio: getDate(row.fecha_inicio) || getDate(row['Fecha Inicio']) || getDate(row['FECHA_INICIO']),
    fecha_fin_estimada: getDate(row.fecha_fin_estimada) || getDate(row['Fecha Fin Estimada']) || getDate(row['FECHA_FIN_ESTIMADA']),
    responsable: getValue(row.responsable) || getValue(row.Responsable) || getValue(row.RESPONSABLE),
    descripcion: getValue(row.descripcion) || getValue(row.Descripción) || getValue(row.DESCRIPCION),
    provincia: getValue(row.provincia) || getValue(row.Provincia) || getValue(row.PROVINCIA),
    municipio: getValue(row.municipio) || getValue(row.Municipio) || getValue(row.MUNICIPIO),
    nivel: getValue(row.nivel) || getValue(row.Nivel) || getValue(row.NIVEL),
    no_aula: getNumber(row.no_aula) || getNumber(row['No. Aula']) || getNumber(row['NO_AULA']),
    observacion_legal: getValue(row.observacion_legal) || getValue(row['Observación Legal']) || getValue(row['OBSERVACION_LEGAL']),
    observacion_financiero: getValue(row.observacion_financiero) || getValue(row['Observación Financiero']) || getValue(row['OBSERVACION_FINANCIERO']),
    latitud: getValue(row.latitud) || getValue(row.Latitud) || getValue(row.LATITUD),
    longitud: getValue(row.longitud) || getValue(row.Longitud) || getValue(row.LONGITUD),
    distrito_minerd_sigede: getValue(row.distrito_minerd_sigede) || getValue(row['Distrito MINERD SIGEDE']) || getValue(row['DISTRITO_MINERD_SIGEDE']),
    fecha_inauguracion: getDate(row.fecha_inauguracion) || getDate(row['Fecha Inauguración']) || getDate(row['FECHA_INAUGURACION']),
  };
};

/**
 * Validar estructura XML sin procesarlo
 */
export const validarArchivoXml = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const xmlContent = e.target?.result as string;
        
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          textNodeName: '#text',
          parseAttributeValue: true,
          trimValues: true,
        });

        let result: any;
        try {
          result = parser.parse(xmlContent);
        } catch (err: any) {
          reject(new Error(`XML inválido: ${err.message}`));
          return;
        }

        if (!result.mantenimientos || !result.mantenimientos.obra) {
          reject(new Error('Estructura XML inválida: No se encontró el elemento mantenimientos.obra'));
          return;
        }

        resolve();
      } catch (error: any) {
        reject(new Error(`Error al leer archivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file);
  });
};

/**
 * Validar estructura Excel sin procesarlo
 */
export const validarArchivoExcel = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('El archivo Excel no tiene hojas'));
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }

        // Verificar que tenga al menos código o nombre
        const firstRow = jsonData[0] as any;
        if (!firstRow.codigo && !firstRow.Código && !firstRow.nombre && !firstRow.Nombre) {
          reject(new Error('El archivo Excel no tiene las columnas requeridas (código o nombre)'));
          return;
        }

        resolve();
      } catch (error: any) {
        reject(new Error(`Error al leer archivo Excel: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
};
