import React, { useState, useRef, useMemo, useEffect } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import { uploadAPI, statsAPI } from '../services/api';
import type { ProgresoCargaObra } from '../services/api';
import { obrasService, contratistasService } from '../services/supabaseService';
import AutocompleteInput from './AutocompleteInput';
import ObraFormulario from './ObraFormulario';
import {
  createEmptyObraFormState,
  obraToFormState,
  formStateToObraUpdates,
  formStateToContratistaUpdates,
  type ObraFormState,
} from '../utils/obraFormulario';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_ACCENT,
  BTN_GHOST,
} from '../constants/buttonStyles';

interface FileUploadProps {
  onUploadComplete?: () => void;
  onError?: (error: unknown) => void;
  /** Solo visualización: sin subir/editar/descargar */
  soloLectura?: boolean;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onError, soloLectura = false }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validMessage, setValidMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  /** Avance al subir XML/Excel (mensaje + %); se limpia al terminar. */
  const [uploadProgress, setUploadProgress] = useState<ProgresoCargaObra | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [estadosParaDescarga, setEstadosParaDescarga] = useState<string[]>([]);
  const [opcionesDescarga, setOpcionesDescarga] = useState<{
    provincias: string[];
    municipios: { provincia: string; municipio: string }[];
    niveles: string[];
  }>({ provincias: [], municipios: [], niveles: [] });
  const [searchSugerencias, setSearchSugerencias] = useState<string[]>([]);
  const [responsableSugerencias, setResponsableSugerencias] = useState<string[]>([]);
  const [loadingSearchSugerencias, setLoadingSearchSugerencias] = useState(false);
  const [loadingResponsableSugerencias, setLoadingResponsableSugerencias] = useState(false);
  const [downloadFilters, setDownloadFilters] = useState({
    search: '',
    estado: '',
    responsable: '',
    provincia: '',
    municipio: '',
    nivel: '',
    fechaInauguracionDesde: '',
    fechaInauguracionHasta: ''
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cargar estados y opciones de filtro desde la BD para la descarga
  useEffect(() => {
    const load = async () => {
      try {
        const [resEstados, resOpciones] = await Promise.all([
          statsAPI.obtenerResumenDashboard(),
          uploadAPI.obtenerOpcionesFiltroDescarga(),
        ]);
        const porEstado = resEstados?.data?.data?.estadisticas?.porEstado;
        if (Array.isArray(porEstado)) {
          setEstadosParaDescarga(porEstado.map((e: { estado: string }) => e.estado));
        }
        const opciones = resOpciones?.data?.data;
        if (opciones) {
          setOpcionesDescarga(opciones);
        }
      } catch {
        setEstadosParaDescarga([]);
        setOpcionesDescarga({ provincias: [], municipios: [], niveles: [] });
      }
    };
    load();
  }, []);

  const municipiosDisponibles = useMemo(() => {
    const { municipios } = opcionesDescarga;
    if (downloadFilters.provincia) {
      return municipios
        .filter((m) => m.provincia === downloadFilters.provincia)
        .map((m) => m.municipio);
    }
    const unicos = new Set(municipios.map((m) => m.municipio));
    return Array.from(unicos).sort((a, b) => a.localeCompare(b, 'es'));
  }, [opcionesDescarga, downloadFilters.provincia]);

  useEffect(() => {
    const term = downloadFilters.search.trim();
    if (term.length < 2) {
      setSearchSugerencias([]);
      setLoadingSearchSugerencias(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoadingSearchSugerencias(true);
      try {
        const resp = await uploadAPI.obtenerSugerenciasBuscar(term, 8);
        setSearchSugerencias(resp.data.data || []);
      } catch {
        setSearchSugerencias([]);
      } finally {
        setLoadingSearchSugerencias(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [downloadFilters.search]);

  useEffect(() => {
    const term = downloadFilters.responsable.trim();
    if (term.length < 2) {
      setResponsableSugerencias([]);
      setLoadingResponsableSugerencias(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoadingResponsableSugerencias(true);
      try {
        const resp = await uploadAPI.obtenerSugerenciasResponsable(term, 8);
        setResponsableSugerencias(resp.data.data || []);
      } catch {
        setResponsableSugerencias([]);
      } finally {
        setLoadingResponsableSugerencias(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [downloadFilters.responsable]);

  const [obraFormState, setObraFormState] = useState<ObraFormState>(createEmptyObraFormState());
  const [obraFormResponsableSugerencias, setObraFormResponsableSugerencias] = useState<string[]>([]);
  const [loadingObraFormResponsable, setLoadingObraFormResponsable] = useState(false);
  const [obraId, setObraId] = useState<string>('');
  const [loadingObra, setLoadingObra] = useState(false);
  const [savingObra, setSavingObra] = useState(false);
  const [obraMessage, setObraMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [obraActualId, setObraActualId] = useState<string | null>(null);

  useEffect(() => {
    const term = obraFormState.contratista.responsable.trim();
    if (term.length < 2) {
      setObraFormResponsableSugerencias([]);
      setLoadingObraFormResponsable(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoadingObraFormResponsable(true);
      try {
        const resp = await uploadAPI.obtenerSugerenciasResponsable(term, 8);
        setObraFormResponsableSugerencias(resp.data.data || []);
      } catch {
        setObraFormResponsableSugerencias([]);
      } finally {
        setLoadingObraFormResponsable(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [obraFormState.contratista.responsable]);

  const resetMessages = () => {
    setError(null);
    setValidMessage(null);
  };

  const validateLocal = (f: File): string | null => {
    const name = f.name.toLowerCase();
    const type = f.type;
    const isXml = name.endsWith('.xml') || type === 'text/xml' || type === 'application/xml';
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') ||
      type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      type === 'application/vnd.ms-excel';
    if (!isXml && !isExcel) return 'Solo se permiten archivos .xml, .xlsx o .xls';
    if (f.size > MAX_SIZE_BYTES) return 'El archivo es demasiado grande (límite 10MB)';
    return null;
  };

  const onChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0] || null;
    setFile(chosen);
    resetMessages();
    if (chosen) {
      const localError = validateLocal(chosen);
      if (localError) {
        setError(localError);
      }
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    const localError = validateLocal(file);
    if (localError) return setError(localError);
    try {
      resetMessages();
      const isXml = file.name.toLowerCase().endsWith('.xml');
      if (isXml) {
        await uploadAPI.validarXml(file);
      } else {
        await uploadAPI.validarExcel(file);
      }
      setValidMessage('Archivo válido.');
    } catch (err: any) {
      const errorData = err?.response?.data;
      let msg = errorData?.error || 'El archivo no es válido.';
      
      // Si hay detalles, agregarlos al mensaje
      if (errorData?.detalles && Array.isArray(errorData.detalles)) {
        msg = errorData.detalles.join('\n');
      } else if (errorData?.detalles && typeof errorData.detalles === 'string') {
        msg = errorData.detalles;
      }
      
      setError(msg);
      if (onError) onError(err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const localError = validateLocal(file);
    if (localError) return setError(localError);
    try {
      resetMessages();
      setUploadProgress({ mensaje: 'Preparando archivo…', porcentaje: 0 });
      setUploading(true);
      const isXml = file.name.toLowerCase().endsWith('.xml');
      const onProg = (p: ProgresoCargaObra) => setUploadProgress(p);
      let resultado;
      if (isXml) {
        resultado = await uploadAPI.subirXml(file, onProg);
      } else {
        resultado = await uploadAPI.subirExcel(file, onProg);
      }
      
      // Mostrar información detallada del procesamiento
      const data = resultado?.data?.data;
      if (data) {
        const mensaje = `Archivo procesado exitosamente.\n` +
          `Total: ${data.total || 0} | ` +
          `Exitosas: ${data.exitosas || 0} | ` +
          `Creadas: ${data.creadas || 0} | ` +
          `Actualizadas: ${data.actualizadas || 0}` +
          (data.fallidas > 0 ? ` | Fallidas: ${data.fallidas}` : '');
        setValidMessage(mensaje);
      } else {
        setValidMessage('Archivo subido y procesado correctamente.');
      }
      if (onUploadComplete) onUploadComplete();
      // Limpiar selección
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      const errorData = err?.response?.data;
      let msg = errorData?.error || 'Error al subir el archivo';
      
      // Si hay detalles, agregarlos al mensaje
      if (errorData?.detalles && Array.isArray(errorData.detalles)) {
        msg = errorData.detalles.join('\n');
      } else if (errorData?.detalles && typeof errorData.detalles === 'string') {
        msg = errorData.detalles;
      }
      
      setError(msg);
      if (onError) onError(err);
    } finally {
      setUploading(false);
      window.setTimeout(() => setUploadProgress(null), 1400);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const resp = await uploadAPI.descargarPlantilla();
      const blob = new Blob([resp.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-obras.xml';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('No se pudo descargar la plantilla.');
      if (onError) onError(err);
    }
  };

  const handleDownloadTemplateExcel = async () => {
    try {
      const resp = await uploadAPI.descargarPlantillaExcel();
      const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-obras.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('No se pudo descargar la plantilla Excel.');
      if (onError) onError(err);
    }
  };

  const handleDownloadData = async () => {
    try {
      resetMessages();
      setDownloading(true);

      const params = Object.fromEntries(
        Object.entries(downloadFilters).filter(([, value]) => value && value !== '')
      );

      const response = await uploadAPI.descargarDatos(params);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'obras-export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setValidMessage('Archivo de obras descargado correctamente.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudo descargar la información de las obras.';
      setError(msg);
      if (onError) onError(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleFilterChange = (field: keyof typeof downloadFilters) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setDownloadFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'provincia') {
        const municipiosValidos = opcionesDescarga.municipios
          .filter((m) => m.provincia === value)
          .map((m) => m.municipio);
        if (prev.municipio && value && !municipiosValidos.includes(prev.municipio)) {
          next.municipio = '';
        }
      }
      return next;
    });
  };

  const handleFilterValueChange = (field: keyof typeof downloadFilters) => (value: string) => {
    setDownloadFilters((prev) => ({ ...prev, [field]: value }));
  };

  const selectClassName =
    'px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent w-full';

  // Buscar obra por ID
  const handleBuscarObra = async () => {
    if (!obraId.trim()) {
      setObraMessage({ type: 'error', text: 'Por favor ingrese un ID de obra' });
      return;
    }

    try {
      setLoadingObra(true);
      setObraMessage(null);
      
      // Buscar por codigo o id (sin validación estricta de formato)
      const idObraNormalizado = obraId.trim().toUpperCase();

      const obra = await obrasService.obtenerObraPorIdObra(idObraNormalizado);
      
      if (!obra) {
        setObraMessage({ type: 'error', text: `No se encontró una obra con el ID: ${idObraNormalizado}` });
        setObraFormState(createEmptyObraFormState());
        setObraActualId(null);
        return;
      }

      setObraFormState(obraToFormState(obra));
      setObraActualId(obra.id);
      setObraMessage({ type: 'success', text: `Obra encontrada: ${obra.nombre}` });
    } catch (err: any) {
      setObraMessage({ type: 'error', text: err.message || 'Error al buscar la obra' });
      setObraActualId(null);
    } finally {
      setLoadingObra(false);
    }
  };

  // Actualizar obra
  const handleActualizarObra = async () => {
    if (!obraActualId) {
      setObraMessage({ type: 'error', text: 'Primero debe buscar una obra existente' });
      return;
    }

    if (!obraFormState.obra.nombre || !obraFormState.obra.estado) {
      setObraMessage({ type: 'error', text: 'Los campos Nombre y Estado son obligatorios' });
      return;
    }

    try {
      setSavingObra(true);
      setObraMessage(null);

      const updates = formStateToObraUpdates(obraFormState);
      const obraActualizada = await obrasService.actualizarObra(obraActualId, updates);

      const contratistaUpdates = formStateToContratistaUpdates(obraFormState);
      const contratistaId = obraActualizada.contratista_id;
      if (contratistaUpdates && contratistaId) {
        await contratistasService.actualizar(contratistaId, contratistaUpdates);
      }

      const refreshed = await obrasService.obtenerObraPorIdObra(obraActualId);
      if (refreshed) {
        setObraFormState(obraToFormState(refreshed));
      }
      setObraMessage({ type: 'success', text: 'Obra actualizada exitosamente' });
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      setObraMessage({ type: 'error', text: err.message || 'Error al actualizar la obra' });
    } finally {
      setSavingObra(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="space-y-3 sm:space-y-4 p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold">Carga de archivo</h3>

        {!soloLectura && (
          <>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <CloudUploadIcon className="mr-2" />
                Seleccionar archivo (XML/Excel)
                <input 
                  ref={inputRef} 
                  hidden 
                  type="file" 
                  accept=".xml,.xlsx,.xls,application/xml,text/xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                  onChange={onChooseFile} 
                />
              </label>
              <span className="text-sm text-gray-600">
                {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Ningún archivo seleccionado'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleValidate}
                disabled={!file || uploading || downloading}
                className={BTN_SECONDARY}
              >
                <CheckCircleIcon className="mr-2" />
                Validar archivo
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading || downloading}
                className={BTN_PRIMARY}
              >
                <CloudUploadIcon className="mr-2" />
                Subir y procesar
              </button>
            </div>
          </>
        )}
        {soloLectura && (
          <p className="text-sm text-gray-600">Solo visualización: no tienes permiso para cargar o editar obras.</p>
        )}

        <hr className="my-4 border-gray-200" />

        <div className="space-y-2">
          <h4 className="text-lg font-medium">Descarga de datos</h4>
          <p className="text-sm text-gray-600">
            Selecciona los filtros para exportar las obras en formato Excel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AutocompleteInput
            value={downloadFilters.search}
            onChange={handleFilterValueChange('search')}
            options={searchSugerencias}
            loading={loadingSearchSugerencias}
            placeholder="Buscar (nombre, código, estado, responsable)"
          />
          <select
            value={downloadFilters.estado}
            onChange={handleFilterChange('estado')}
            className={selectClassName}
          >
            <option value="">Todos</option>
            {estadosParaDescarga.map((estado: string) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
          <AutocompleteInput
            value={downloadFilters.responsable}
            onChange={handleFilterValueChange('responsable')}
            options={responsableSugerencias}
            loading={loadingResponsableSugerencias}
            placeholder="Responsable / Contratista"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={downloadFilters.provincia}
            onChange={handleFilterChange('provincia')}
            className={selectClassName}
          >
            <option value="">Todas las provincias</option>
            {opcionesDescarga.provincias.map((provincia) => (
              <option key={provincia} value={provincia}>
                {provincia}
              </option>
            ))}
          </select>
          <select
            value={downloadFilters.municipio}
            onChange={handleFilterChange('municipio')}
            className={selectClassName}
          >
            <option value="">Todos los municipios</option>
            {municipiosDisponibles.map((municipio) => (
              <option key={municipio} value={municipio}>
                {municipio}
              </option>
            ))}
          </select>
          <select
            value={downloadFilters.nivel}
            onChange={handleFilterChange('nivel')}
            className={selectClassName}
          >
            <option value="">Todos los niveles</option>
            {opcionesDescarga.niveles.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="date"
            value={downloadFilters.fechaInauguracionDesde}
            onChange={handleFilterChange('fechaInauguracionDesde')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />
          <input
            type="date"
            value={downloadFilters.fechaInauguracionHasta}
            onChange={handleFilterChange('fechaInauguracionHasta')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />
          {!soloLectura && (
            <button
              onClick={handleDownloadData}
              disabled={downloading}
              className={BTN_ACCENT}
            >
              <DownloadIcon className="mr-2" />
              {downloading ? 'Generando archivo...' : 'Descargar obras'}
            </button>
          )}
        </div>

        {(uploading || downloading) && (
          <div className="space-y-2">
            {uploading && (
              <div
                className="rounded-lg border border-stone-200/80 bg-stone-50/90 px-3 py-2.5 shadow-sm"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3 text-xs text-stone-600 mb-1.5">
                  <span className="truncate min-w-0 flex-1 leading-snug">
                    {uploadProgress?.mensaje ?? 'Iniciando…'}
                  </span>
                  <span className="tabular-nums text-stone-500 font-medium shrink-0 pt-px">
                    {uploadProgress?.porcentaje ?? 0}%
                  </span>
                </div>
                <div
                  className="h-1 w-full overflow-hidden rounded-full bg-stone-200/90"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress?.porcentaje ?? 0}
                  aria-label="Progreso de carga"
                >
                  <div
                    className="h-full rounded-full bg-[#42A5F5]/88 transition-[width] duration-200 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, uploadProgress?.porcentaje ?? 0))}%` }}
                  />
                </div>
              </div>
            )}
            {downloading && !uploading && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-[#42A5F5] h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded whitespace-pre-line">
            {error}
          </div>
        )}
        {validMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            {validMessage}
          </div>
        )}

        <p className="text-sm text-gray-600">
          Archivos permitidos: .xml, .xlsx, .xls. Tamaño máximo: 10MB.
        </p>

        <hr className="my-4 border-gray-200" />

        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <strong>Plantillas vacías:</strong> Descarga archivos con el formato correcto para crear nuevas obras desde cero. 
            Útil si necesitas preparar un archivo manualmente con la estructura adecuada.
          </p>
          {!soloLectura && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDownloadTemplate}
                className={BTN_GHOST}
              >
                <DownloadIcon className="mr-1 text-sm" />
                Plantilla XML
              </button>
              <button
                onClick={handleDownloadTemplateExcel}
                className={BTN_GHOST}
              >
                <DownloadIcon className="mr-1 text-sm" />
                Plantilla Excel
              </button>
            </div>
          )}
        </div>

        <hr className="my-6 border-gray-200" />

        {/* Formulario de edición de obra - oculto en solo lectura */}
        {!soloLectura && (
        <div className="space-y-6">
          {/* Encabezado de la sección */}
          <div className="bg-gradient-to-r from-[#42A5F5] to-blue-600 rounded-lg shadow-md p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <EditIcon className="text-2xl" />
              <h4 className="text-xl font-semibold">Editar Obra</h4>
            </div>
            <p className="text-blue-50 text-sm">
              Busque una obra por su ID (OB-0000 o MT-0000) para cargar y editar su información.
            </p>
          </div>

          {/* Búsqueda de obra - Card destacado */}
          <div className="bg-white border-2 border-[#42A5F5] rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <SearchIcon className="text-[#42A5F5] text-xl" />
              <h5 className="text-lg font-semibold text-gray-800">Buscar Obra</h5>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                ID de Obra (OB-0000, MT-0000)
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Ej: OB-0000 o MT-0000"
                    value={obraId}
                    onChange={(e) => setObraId(e.target.value.toUpperCase())}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleBuscarObra();
                      }
                    }}
                    pattern="^(OB|MT)-\d{4}$"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all text-base font-mono"
                  />
                </div>
                <button
                  onClick={handleBuscarObra}
                  disabled={loadingObra || !obraId.trim()}
                  className={BTN_PRIMARY}
                >
                  <SearchIcon className="mr-2" />
                  {loadingObra ? 'Buscando...' : 'Buscar Obra'}
                </button>
              </div>
              <p className="text-xs text-gray-500">Formato: OB-0000 o MT-0000 (4 dígitos)</p>
            </div>

            {obraMessage && (
              <div className={`mt-4 px-4 py-3 rounded-lg border-2 ${
                obraMessage.type === 'success' 
                  ? 'bg-green-50 border-green-300 text-green-800' 
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {obraMessage.type === 'success' ? (
                    <CheckCircleIcon className="text-green-600" />
                  ) : (
                    <InfoIcon className="text-red-600" />
                  )}
                  <span className="font-medium">{obraMessage.text}</span>
                </div>
              </div>
            )}
          </div>

          {/* Formulario de obra - Solo se muestra si hay una obra cargada */}
          {obraActualId && (
            <div className="space-y-6">
              <ObraFormulario
                form={obraFormState}
                onChange={setObraFormState}
                estadosDisponibles={estadosParaDescarga}
                responsableSugerencias={obraFormResponsableSugerencias}
                loadingResponsableSugerencias={loadingObraFormResponsable}
                readOnly={soloLectura}
              />

              {!soloLectura && (
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-white">
                    <p className="font-semibold text-lg mb-1">¿Listo para guardar los cambios?</p>
                    <p className="text-sm text-green-50">
                      Revisa todas las áreas antes de actualizar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleActualizarObra}
                    disabled={savingObra}
                    className={`${BTN_PRIMARY} !bg-white/20 !text-white border border-white/40 hover:!bg-white/30`}
                  >
                    <SaveIcon className="mr-2" />
                    {savingObra ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
