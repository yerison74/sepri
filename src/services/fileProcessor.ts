/**
 * Servicio para procesar archivos XML y Excel en el frontend
 */

import * as XLSX from 'xlsx';
import { XMLParser } from 'fast-xml-parser';
import { obrasService } from './supabaseService';
import { supabase } from '../lib/supabase';
import type { Obra } from '../types/database';

/**
 * Generar un ID de obra siguiendo las reglas:
 * - tipo_obra = "Construccion"  -> OB-XXXX
 * - tipo_obra = "Mantenimiento" -> MT-XXXX
 * Donde XXXX son 4 dígitos aleatorios. Se verifica que no exista en la tabla obras.
 */
const generarIdObra = async (tipoObra: string): Promise<string> => {
  const prefijo = (tipoObra || '').toLowerCase() === 'mantenimiento' ? 'MT' : 'OB';

  for (let i = 0; i < 5; i++) {
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const id = `${prefijo}-${random}`;

    const { data, error } = await supabase
      .from('obras')
      .select('id')
      .eq('id', id)
      .limit(1);

    if (error) {
      console.warn('Error comprobando unicidad de ID de obra:', error.message || error);
      continue;
    }

    if (!data || data.length === 0) {
      return id;
    }
  }

  throw new Error('No se pudo generar un ID único para la obra después de varios intentos');
};

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

        if (!result.mantenimientos || !result.mantenimientos.obra) {
          reject(
            new Error(
              'Estructura XML inválida: No se encontró el elemento mantenimientos.obra',
            ),
          );
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

        for (const obraXml of obrasXml) {
          try {
            const obra = mapearObraDesdeXml(obraXml);

            if (!obra.codigo || obra.codigo.trim() === '') {
              resultados.fallidas++;
              resultados.errores.push(
                'Obra sin código. El campo "codigo" es obligatorio para crear/actualizar.',
              );
              continue;
            }

            const codigoNormalizado = obra.codigo.trim().toUpperCase();
            const tipoObra = (obra as any).tipo_obra || 'Construccion';

            console.log(`🔍 Buscando obra por código: "${codigoNormalizado}"`);

            const { data: obrasExistentes, error: searchError } = await supabase
              .from('obras')
              .select('*')
              .eq('codigo', codigoNormalizado)
              .limit(1);

            if (searchError) {
              console.error('Error al buscar obra existente:', searchError);
              throw searchError;
            }

            const obraExistente =
              obrasExistentes && obrasExistentes.length > 0 ? obrasExistentes[0] : null;

            if (obraExistente) {
              console.log(
                `✅ ACTUALIZANDO obra con código "${codigoNormalizado}" (ID en BD: ${obraExistente.id})`,
              );
              const obraParaActualizar = Object.fromEntries(
                Object.entries(obra).filter(([_, v]) => v !== undefined),
              ) as Partial<Omit<Obra, 'id' | 'created_at' | 'updated_at'>>;
              await obrasService.actualizarObraPorCodigo(codigoNormalizado, obraParaActualizar);
              resultados.actualizadas++;
            } else {
              console.log(`➕ CREANDO nueva obra con código "${codigoNormalizado}"`);
              const nuevoId = await generarIdObra(tipoObra);
              const obraParaCrear = {
                ...Object.fromEntries(Object.entries(obra).filter(([_, v]) => v !== undefined)),
                id: nuevoId,
                codigo: codigoNormalizado,
                tipo_obra: tipoObra,
              } as Omit<Obra, 'created_at' | 'updated_at'>;
              await obrasService.crearObra(obraParaCrear);
              resultados.creadas++;
            }

            resultados.exitosas++;
          } catch (error: any) {
            resultados.fallidas++;
            resultados.errores.push(
              `Error en obra ${obraXml.id || obraXml['@_id'] || 'desconocida'}: ${
                error.message
              }`,
            );
          }
        }

        resolve(resultados);
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
        const workbook = XLSX.read(data as string, { type: 'binary' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

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

        for (const row of jsonData as any[]) {
          try {
            const obra = mapearObraDesdeExcel(row);

            if (!obra.codigo || obra.codigo.trim() === '') {
              resultados.fallidas++;
              resultados.errores.push(
                'Fila sin código. El campo "codigo" es obligatorio para crear/actualizar. Columnas encontradas: ' +
                  JSON.stringify(Object.keys(row)),
              );
              continue;
            }

            const codigoNormalizado = obra.codigo.trim().toUpperCase();
            const tipoObra = (obra as any).tipo_obra || 'Construccion';

            console.log(`🔍 Buscando obra por código: "${codigoNormalizado}"`);

            const { data: obrasExistentes, error: searchError } = await supabase
              .from('obras')
              .select('*')
              .eq('codigo', codigoNormalizado)
              .limit(1);

            if (searchError) {
              console.error('Error al buscar obra existente:', searchError);
              throw searchError;
            }

            const obraExistente =
              obrasExistentes && obrasExistentes.length > 0 ? obrasExistentes[0] : null;

            if (obraExistente) {
              console.log(
                `✅ ACTUALIZANDO obra con código "${codigoNormalizado}" (ID en BD: ${obraExistente.id})`,
              );
              const obraParaActualizar = Object.fromEntries(
                Object.entries(obra).filter(([_, v]) => v !== undefined),
              ) as Partial<Omit<Obra, 'id' | 'created_at' | 'updated_at'>>;
              await obrasService.actualizarObraPorCodigo(codigoNormalizado, obraParaActualizar);
              resultados.actualizadas++;
            } else {
              console.log(`➕ CREANDO nueva obra con código "${codigoNormalizado}"`);
              const nuevoId = await generarIdObra(tipoObra);
              const obraParaCrear = {
                ...Object.fromEntries(Object.entries(obra).filter(([_, v]) => v !== undefined)),
                id: nuevoId,
                codigo: codigoNormalizado,
                tipo_obra: tipoObra,
              } as Omit<Obra, 'created_at' | 'updated_at'>;
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
const mapearObraDesdeXml = (
  obraXml: any,
): Omit<Obra, 'id' | 'created_at' | 'updated_at'> => {
  const getValue = (field: any): string | null => {
    if (!field) return null;
    if (typeof field === 'string') {
      return field.trim() || null;
    }
    if (typeof field === 'object') {
      if (field['#text'] !== undefined) {
        return String(field['#text']).trim() || null;
      }
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

    try {
      let date: Date | null = null;

      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date = new Date(value + 'T00:00:00');
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        const parts = value.split('/');
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        date = new Date(value);
      }

      if (!date || isNaN(date.getTime())) {
        console.warn(`Fecha inválida en XML: ${value}`);
        return null;
      }

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

  const codigo = getValue(obraXml.codigo) || getValue(obraXml.codigo_contrato) || '';
  const contrato = getValue(obraXml.contrato);
  const tipoObra = getValue(obraXml.tipo_obra);

  return {
    id_obra: null,
    codigo: codigo || null,
    contrato: contrato || null,
    tipo_obra: tipoObra || null,
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
const mapearObraDesdeExcel = (
  row: any,
): Omit<Obra, 'id' | 'created_at' | 'updated_at'> => {
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

    if (typeof field === 'number') {
      try {
        if (field < 1 || field > 100000) {
          console.warn(`Fecha serial de Excel fuera de rango: ${field}`);
          return null;
        }

        const excelEpoch = new Date(1899, 11, 30);
        const jsDate = new Date(excelEpoch.getTime() + field * 24 * 60 * 60 * 1000);

        if (isNaN(jsDate.getTime())) {
          console.warn(`Fecha inválida generada desde serial: ${field}`);
          return null;
        }

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

    const value = String(field).trim();
    if (!value || value === '') return null;

    try {
      let date: Date | null = null;

      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date = new Date(value + 'T00:00:00');
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        const parts = value.split('/');
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        date = new Date(value);
      }

      if (!date || isNaN(date.getTime())) {
        console.warn(`Fecha inválida: ${value}`);
        return null;
      }

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

  const codigo =
    getValue(row.codigo) ||
    getValue(row.Código) ||
    getValue(row.CODIGO) ||
    getValue(row['NO. CONTRATO']) ||
    getValue(row['No. Contrato']) ||
    getValue(row['CÓDIGO']) ||
    '';

  const contrato =
    getValue(row.contrato) || getValue(row.Contrato) || getValue(row.CONTRATO) || null;

  const tipoObra =
    getValue(row.tipo_obra) ||
    getValue(row.Tipo_Obra) ||
    getValue(row.TIPO_OBRA) ||
    null;

  return {
    id_obra: null,
    codigo: codigo || null,
    contrato,
    tipo_obra: tipoObra,
    nombre:
      getValue(row.nombre) ||
      getValue(row.Nombre) ||
      getValue(row.NOMBRE) ||
      '',
    estado:
      getValue(row.estado) ||
      getValue(row.Estado) ||
      getValue(row.ESTADO) ||
      'NO ESPECIFICADO',
    fecha_inicio:
      getDate(row.fecha_inicio) ||
      getDate(row['Fecha Inicio']) ||
      getDate(row['FECHA_INICIO']),
    fecha_fin_estimada:
      getDate(row.fecha_fin_estimada) ||
      getDate(row['Fecha Fin Estimada']) ||
      getDate(row['FECHA_FIN_ESTIMADA']),
    responsable:
      getValue(row.responsable) ||
      getValue(row.Responsable) ||
      getValue(row.RESPONSABLE),
    descripcion:
      getValue(row.descripcion) ||
      getValue(row.Descripción) ||
      getValue(row.DESCRIPCION),
    provincia:
      getValue(row.provincia) || getValue(row.Provincia) || getValue(row.PROVINCIA),
    municipio:
      getValue(row.municipio) || getValue(row.Municipio) || getValue(row.MUNICIPIO),
    nivel: getValue(row.nivel) || getValue(row.Nivel) || getValue(row.NIVEL),
    no_aula:
      getNumber(row.no_aula) ||
      getNumber(row['No. Aula']) ||
      getNumber(row['NO_AULA']),
    observacion_legal:
      getValue(row.observacion_legal) ||
      getValue(row['Observación Legal']) ||
      getValue(row['OBSERVACION_LEGAL']),
    observacion_financiero:
      getValue(row.observacion_financiero) ||
      getValue(row['Observación Financiero']) ||
      getValue(row['OBSERVACION_FINANCIERO']),
    latitud:
      getValue(row.latitud) ||
      getValue(row.Latitud) ||
      getValue(row.LATITUD),
    longitud:
      getValue(row.longitud) ||
      getValue(row.Longitud) ||
      getValue(row.LONGITUD),
    distrito_minerd_sigede:
      getValue(row.distrito_minerd_sigede) ||
      getValue(row['Distrito MINERD SIGEDE']) ||
      getValue(row['DISTRITO_MINERD_SIGEDE']),
    fecha_inauguracion:
      getDate(row.fecha_inauguracion) ||
      getDate(row['Fecha Inauguración']) ||
      getDate(row['FECHA_INAUGURACION']),
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
          reject(
            new Error(
              'Estructura XML inválida: No se encontró el elemento mantenimientos.obra',
            ),
          );
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
        const workbook = XLSX.read(data as string, { type: 'binary' });

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

        const firstRow = jsonData[0] as any;
        if (!firstRow.codigo && !firstRow.Código && !firstRow.nombre && !firstRow.Nombre) {
          reject(
            new Error(
              'El archivo Excel no tiene las columnas requeridas (código o nombre)',
            ),
          );
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