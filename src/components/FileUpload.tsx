import React, { useState, useRef } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import InfoIcon from '@mui/icons-material/Info';
import { uploadAPI } from '../services/api';
import { obrasService } from '../services/supabaseService';
import type { Obra } from '../types/database';

interface FileUploadProps {
  onUploadComplete?: () => void;
  onError?: (error: unknown) => void;
  /** Solo visualización: sin subir/editar/descargar */
  soloLectura?: boolean;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ESTADOS_OPCIONES = [
  'ACTIVA',
  'INAUGURADA',
  'TERMINADA',
  'DETENIDA',
  'PENDIENTE',
  'EN PROGRESO',
  'COMPLETADO',
  'CANCELADO',
  'PAUSADO'
];

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onError, soloLectura = false }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validMessage, setValidMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
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

  // Estado para el formulario de edición de obra
  const [obraForm, setObraForm] = useState<Partial<Obra>>({
    id_obra: '',
    codigo: '',
    nombre: '',
    estado: '',
    fecha_inicio: '',
    fecha_fin_estimada: '',
    responsable: '',
    descripcion: '',
    provincia: '',
    municipio: '',
    nivel: '',
    no_aula: undefined,
    observacion_legal: '',
    observacion_financiero: '',
    latitud: '',
    longitud: '',
    distrito_minerd_sigede: '',
    fecha_inauguracion: ''
  });
  const [obraId, setObraId] = useState<string>('');
  const [loadingObra, setLoadingObra] = useState(false);
  const [savingObra, setSavingObra] = useState(false);
  const [obraMessage, setObraMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [obraActualId, setObraActualId] = useState<number | null>(null);

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
      setUploading(true);
      const isXml = file.name.toLowerCase().endsWith('.xml');
      let resultado;
      if (isXml) {
        resultado = await uploadAPI.subirXml(file);
      } else {
        resultado = await uploadAPI.subirExcel(file);
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
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const resp = await uploadAPI.descargarPlantilla();
      const blob = new Blob([resp.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-mantenimientos.xml';
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
      a.download = 'plantilla-mantenimientos.xlsx';
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
    setDownloadFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

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
        setObraForm({
          id_obra: '',
          codigo: '',
          nombre: '',
          estado: '',
          fecha_inicio: '',
          fecha_fin_estimada: '',
          responsable: '',
          descripcion: '',
          provincia: '',
          municipio: '',
          nivel: '',
          no_aula: undefined,
          observacion_legal: '',
          observacion_financiero: '',
          latitud: '',
          longitud: '',
          distrito_minerd_sigede: '',
          fecha_inauguracion: ''
        });
        setObraActualId(null);
        return;
      }

      // Llenar el formulario con los datos de la obra
      setObraForm({
        id_obra: obra.id_obra || '',
        codigo: obra.codigo || '',
        nombre: obra.nombre || '',
        estado: obra.estado || '',
        fecha_inicio: obra.fecha_inicio || '',
        fecha_fin_estimada: obra.fecha_fin_estimada || '',
        responsable: obra.responsable || '',
        descripcion: obra.descripcion || '',
        provincia: obra.provincia || '',
        municipio: obra.municipio || '',
        nivel: obra.nivel || '',
        no_aula: obra.no_aula || undefined,
        observacion_legal: obra.observacion_legal || '',
        observacion_financiero: obra.observacion_financiero || '',
        latitud: obra.latitud || '',
        longitud: obra.longitud || '',
        distrito_minerd_sigede: obra.distrito_minerd_sigede || '',
        fecha_inauguracion: obra.fecha_inauguracion || ''
      });
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

    if (!obraForm.nombre || !obraForm.estado) {
      setObraMessage({ type: 'error', text: 'Los campos Nombre y Estado son obligatorios' });
      return;
    }

    if (!obraForm.id_obra || obraForm.id_obra.trim() === '') {
      setObraMessage({ type: 'error', text: 'El campo ID de Obra (OB-0000 o MT-0000) es obligatorio' });
      return;
    }

    try {
      setSavingObra(true);
      setObraMessage(null);

      // Normalizar id_obra si está presente
      let idObraNormalizado = obraForm.id_obra?.trim().toUpperCase();
      if (idObraNormalizado) {
        const idObraPattern = /^(OB|MT)-\d{4}$/;
        if (!idObraPattern.test(idObraNormalizado)) {
          setObraMessage({ type: 'error', text: 'El ID de obra debe tener el formato OB-0000 o MT-0000 (4 dígitos)' });
          setSavingObra(false);
          return;
        }
      }

      const updates: Partial<Obra> = {
        id_obra: idObraNormalizado || undefined,
        codigo: obraForm.codigo || undefined,
        nombre: obraForm.nombre,
        estado: obraForm.estado,
        fecha_inicio: obraForm.fecha_inicio || undefined,
        fecha_fin_estimada: obraForm.fecha_fin_estimada || undefined,
        responsable: obraForm.responsable || undefined,
        descripcion: obraForm.descripcion || undefined,
        provincia: obraForm.provincia || undefined,
        municipio: obraForm.municipio || undefined,
        nivel: obraForm.nivel || undefined,
        no_aula: obraForm.no_aula || undefined,
        observacion_legal: obraForm.observacion_legal || undefined,
        observacion_financiero: obraForm.observacion_financiero || undefined,
        latitud: obraForm.latitud || undefined,
        longitud: obraForm.longitud || undefined,
        distrito_minerd_sigede: obraForm.distrito_minerd_sigede || undefined,
        fecha_inauguracion: obraForm.fecha_inauguracion || undefined
      };

      await obrasService.actualizarObra(obraActualId, updates);
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

  const handleObraFormChange = (field: keyof Obra) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setObraForm((prev) => ({
      ...prev,
      [field]: field === 'no_aula' ? (value ? parseInt(value) : undefined) : value
    }));
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
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#42A5F5] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#42A5F5] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircleIcon className="mr-2" />
                Validar archivo
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading || downloading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#42A5F5] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#42A5F5] disabled:opacity-50 disabled:cursor-not-allowed"
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
          <input
            type="text"
            placeholder="Buscar (nombre, código, estado, responsable)"
            value={downloadFilters.search}
            onChange={handleFilterChange('search')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />
          <select
            value={downloadFilters.estado}
            onChange={handleFilterChange('estado')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          >
            <option value="">Todos</option>
            {ESTADOS_OPCIONES.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Responsable / Contratista"
            value={downloadFilters.responsable}
            onChange={handleFilterChange('responsable')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Provincia"
            value={downloadFilters.provincia}
            onChange={handleFilterChange('provincia')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Municipio"
            value={downloadFilters.municipio}
            onChange={handleFilterChange('municipio')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Nivel"
            value={downloadFilters.nivel}
            onChange={handleFilterChange('nivel')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />
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
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#FFA726] hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFA726] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="mr-2" />
              {downloading ? 'Generando archivo...' : 'Descargar obras'}
            </button>
          )}
        </div>

        {(uploading || downloading) && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#42A5F5] h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
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
                className="inline-flex items-center px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                <DownloadIcon className="mr-1 text-sm" />
                Plantilla XML
              </button>
              <button
                onClick={handleDownloadTemplateExcel}
                className="inline-flex items-center px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
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
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-[#42A5F5] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#42A5F5] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 whitespace-nowrap"
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
              {/* Sección: Información Básica */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200">
                  <InfoIcon className="text-[#42A5F5] text-xl" />
                  <h5 className="text-lg font-semibold text-gray-800">Información Básica</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID de Obra (OB-0000, MT-0000) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={obraForm.id_obra || ''}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleObraFormChange('id_obra')({ target: { value } } as any);
                      }}
                      placeholder="OB-0000 o MT-0000"
                      pattern="^(OB|MT)-\d{4}$"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Formato: OB-0000 o MT-0000 (4 dígitos)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código
                    </label>
                    <input
                      type="text"
                      value={obraForm.codigo || ''}
                      onChange={handleObraFormChange('codigo')}
                      placeholder="123-456"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Obra <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={obraForm.nombre || ''}
                      onChange={handleObraFormChange('nombre')}
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={obraForm.estado || ''}
                      onChange={handleObraFormChange('estado')}
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all bg-white"
                    >
                      <option value="">Seleccione un estado</option>
                      {ESTADOS_OPCIONES.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <PersonIcon className="inline mr-1 text-gray-500" style={{ fontSize: '18px', verticalAlign: 'middle' }} />
                      Responsable / Contratista
                    </label>
                    <input
                      type="text"
                      value={obraForm.responsable || ''}
                      onChange={handleObraFormChange('responsable')}
                      placeholder="Nombre del responsable"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={obraForm.descripcion || ''}
                      onChange={handleObraFormChange('descripcion')}
                      rows={3}
                      placeholder="Descripción detallada de la obra..."
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Ubicación */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200">
                  <LocationOnIcon className="text-[#42A5F5] text-xl" />
                  <h5 className="text-lg font-semibold text-gray-800">Ubicación</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={obraForm.provincia || ''}
                      onChange={handleObraFormChange('provincia')}
                      placeholder="Nombre de la provincia"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Municipio
                    </label>
                    <input
                      type="text"
                      value={obraForm.municipio || ''}
                      onChange={handleObraFormChange('municipio')}
                      placeholder="Nombre del municipio"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nivel Educativo
                    </label>
                    <input
                      type="text"
                      value={obraForm.nivel || ''}
                      onChange={handleObraFormChange('nivel')}
                      placeholder="Inicial, Primario, Secundario, etc."
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Aula
                    </label>
                    <input
                      type="number"
                      value={obraForm.no_aula || ''}
                      onChange={handleObraFormChange('no_aula')}
                      placeholder="Ej: 1"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitud
                    </label>
                    <input
                      type="text"
                      value={obraForm.latitud || ''}
                      onChange={handleObraFormChange('latitud')}
                      placeholder="Ej: 18.4861"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitud
                    </label>
                    <input
                      type="text"
                      value={obraForm.longitud || ''}
                      onChange={handleObraFormChange('longitud')}
                      placeholder="Ej: -69.9312"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distrito MINERD SIGEDE
                    </label>
                    <input
                      type="text"
                      value={obraForm.distrito_minerd_sigede || ''}
                      onChange={handleObraFormChange('distrito_minerd_sigede')}
                      placeholder="Código del distrito"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Fechas */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200">
                  <CalendarTodayIcon className="text-[#42A5F5] text-xl" />
                  <h5 className="text-lg font-semibold text-gray-800">Fechas Importantes</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={obraForm.fecha_inicio || ''}
                      onChange={handleObraFormChange('fecha_inicio')}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Fin Estimada
                    </label>
                    <input
                      type="date"
                      value={obraForm.fecha_fin_estimada || ''}
                      onChange={handleObraFormChange('fecha_fin_estimada')}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inauguración
                    </label>
                    <input
                      type="date"
                      value={obraForm.fecha_inauguracion || ''}
                      onChange={handleObraFormChange('fecha_inauguracion')}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Observaciones */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200">
                  <DescriptionIcon className="text-[#42A5F5] text-xl" />
                  <h5 className="text-lg font-semibold text-gray-800">Observaciones</h5>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observación Legal
                    </label>
                    <textarea
                      value={obraForm.observacion_legal || ''}
                      onChange={handleObraFormChange('observacion_legal')}
                      rows={3}
                      placeholder="Observaciones del área legal..."
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observación Financiero
                    </label>
                    <textarea
                      value={obraForm.observacion_financiero || ''}
                      onChange={handleObraFormChange('observacion_financiero')}
                      rows={3}
                      placeholder="Observaciones del área financiero..."
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-[#42A5F5] transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botón de guardar */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="font-semibold text-lg mb-1">¿Listo para guardar los cambios?</p>
                    <p className="text-sm text-green-50">Asegúrate de revisar toda la información antes de actualizar.</p>
                  </div>
                  <button
                    onClick={handleActualizarObra}
                    disabled={savingObra}
                    className="inline-flex items-center px-8 py-3 border-2 border-white rounded-lg shadow-lg text-base font-semibold text-white bg-white bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                  >
                    <SaveIcon className="mr-2" />
                    {savingObra ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
