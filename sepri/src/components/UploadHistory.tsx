import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Stack,
  Card,
  CardContent,
  CardActions,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Search,
  Add,
  QrCode,
  Print,
  Visibility,
  History as HistoryIcon,
  FollowTheSigns,
  PictureAsPdf,
  Download,
  AttachFile,
  Send,
  Person,
  CheckCircle,
  CameraAlt,
  Stop,
  Scanner,
  Clear,
  ViewList,
  ViewModule
} from '@mui/icons-material';
import { tramitesAPI, Tramite, MovimientoTramite } from '../services/api';
import { AREAS_TRAMITES, getCodigoPorArea } from '../constants/areas';
import { useAuth } from '../context/AuthContext';
import JsBarcode from 'jsbarcode';

// Componente para generar código de barras usando jsbarcode
const BarcodeDisplay: React.FC<{ codigo: string; id: string }> = ({ codigo, id }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && codigo) {
      try {
        // Limpiar el SVG antes de generar
        barcodeRef.current.innerHTML = '';
        // Generar código de barras CODE128
        JsBarcode(barcodeRef.current, codigo, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10
        });
      } catch (error) {
        console.error('Error al generar código de barras:', error);
      }
    }
  }, [codigo]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
      <svg ref={barcodeRef} />
      <Typography variant="caption" sx={{ mt: 1, fontFamily: 'monospace', fontWeight: 600 }}>
        {id}
      </Typography>
    </Box>
  );
};

interface TramiteHistoryProps {
  soloLectura?: boolean;
}

const TramiteHistory: React.FC<TramiteHistoryProps> = ({ soloLectura = false }) => {
  const { user } = useAuth();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(15);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [lastInputTime, setLastInputTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openBarcodeDialog, setOpenBarcodeDialog] = useState(false);
  const [openSeguimientoDialog, setOpenSeguimientoDialog] = useState(false);
  const [selectedTramite, setSelectedTramite] = useState<Tramite | null>(null);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [historial, setHistorial] = useState<MovimientoTramite[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [hideCompleted, setHideCompleted] = useState(false);

  // Formulario nuevo trámite (destinatario y área se rellenan con el usuario logueado)
  const [nuevoTramite, setNuevoTramite] = useState({
    titulo: '',
    oficio: '',
    nombre_destinatario: '',
    area_destinatario: '',
    area_destino_final: '',
    archivo_pdf: null as File | null
  });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario de seguimiento
  const [seguimientoData, setSeguimientoData] = useState({
    area_origen: '',
    area_destino: '',
    oficio: '',
    usuario: '',
    observaciones: '',
    actualizar_estado: ''
  });

  useEffect(() => {
    loadTramites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  // Al abrir el diálogo de nuevo trámite, rellenar solo el remitente con el usuario logueado.
  // Primera área de envío queda vacía para que el usuario la elija.
  useEffect(() => {
    if (openDialog && user) {
      const nombreCompleto = [user.nombre, user.apellido].filter(Boolean).join(' ').trim();
      setNuevoTramite((prev) => ({
        ...prev,
        nombre_destinatario: nombreCompleto || prev.nombre_destinatario
        // area_destinatario no se rellena: el usuario debe elegir la primera área de envío
      }));
    }
  }, [openDialog, user]);

  // Resetear a página 1 cuando cambian filtros
  useEffect(() => {
    setPage(1);
  }, [hideCompleted, searchQuery]);

  // Limpiar stream de cámara al desmontar
  useEffect(() => {
    return () => {
      stopCameraScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTramites = async () => {
    try {
      setLoading(true);
      setError(null);
      const areaUsuario = user?.area ?? '';
      const verTodosTramites = user?.rol === 'admin' || user?.rol === 'supervision';
      const response = await tramitesAPI.obtenerTramites({ 
        search: searchQuery,
        limit: rowsPerPage,
        offset: (page - 1) * rowsPerPage,
        areaUsuario: areaUsuario || undefined,
        esAdmin: verTodosTramites,
      });
      const tramitesData = response.data.data || [];
      const total = response.data.count ?? tramitesData.length;
      setTotalCount(total);

      // Obtener URL del backend desde variable de entorno o usar default
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

      // Convertir URLs relativas a absolutas
      const tramitesConUrl = tramitesData.map((tramite: any) => {
        if (tramite.archivo_pdf && tramite.archivo_pdf.startsWith('/api/')) {
          tramite.archivo_pdf = `${backendUrl}${tramite.archivo_pdf}`;
        }
        return tramite;
      });

      setTramites(tramitesConUrl);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('El backend aún no tiene implementados los endpoints de trámites. Los datos se guardan localmente.');
        setTramites([]);
      } else {
        setError(err.response?.data?.error || 'Error al cargar trámites');
        setTramites([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePdf = (file: File): string | null => {
    const name = file.name.toLowerCase();
    const type = file.type;
    const isPdf = name.endsWith('.pdf') || type === 'application/pdf';
    if (!isPdf) return 'Solo se permiten archivos PDF';
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return 'El archivo PDF es demasiado grande (límite 10MB)';
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const error = validatePdf(file);
      if (error) {
        setError(error);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setNuevoTramite({ ...nuevoTramite, archivo_pdf: file });
        setError(null);
      }
    }
  };

  const handleCreateTramite = async () => {
    if (!nuevoTramite.titulo || !nuevoTramite.nombre_destinatario || 
        !nuevoTramite.area_destinatario || !nuevoTramite.area_destino_final) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setError(null);
      setUploadingPdf(true);

      let nuevoTramiteData: Tramite;

      if (nuevoTramite.archivo_pdf) {
        const formData = new FormData();
        formData.append('titulo', nuevoTramite.titulo);
        formData.append('oficio', nuevoTramite.oficio);
        formData.append('nombre_destinatario', nuevoTramite.nombre_destinatario);
        formData.append('area_destinatario', nuevoTramite.area_destinatario);
        formData.append('area_destino_final', nuevoTramite.area_destino_final);
        // Código del ID según el área del usuario que crea el trámite
        formData.append('codigo_area', getCodigoPorArea(user?.area || ''));
        formData.append('archivo_pdf', nuevoTramite.archivo_pdf);

        const response = await tramitesAPI.crearTramiteConArchivo(formData);
        nuevoTramiteData = response.data.data;

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
        if (nuevoTramiteData.archivo_pdf && nuevoTramiteData.archivo_pdf.startsWith('/api/')) {
          nuevoTramiteData.archivo_pdf = `${backendUrl}${nuevoTramiteData.archivo_pdf}`;
        }
      } else {
        const response = await tramitesAPI.crearTramite({
          titulo: nuevoTramite.titulo,
          oficio: nuevoTramite.oficio || undefined,
          nombre_destinatario: nuevoTramite.nombre_destinatario,
          area_destinatario: nuevoTramite.area_destinatario,
          area_destino_final: nuevoTramite.area_destino_final,
          // Código del ID según el área del usuario que crea el trámite
          codigo_area: getCodigoPorArea(user?.area || ''),
        });
        nuevoTramiteData = response.data.data;
      }

      // Movimiento 1: desde el área del usuario hasta la primera área de envío, por quien creó el trámite
      const areaOrigenCreador = user?.area || 'Área del creador';
      const nombreCreador = [user?.nombre, user?.apellido].filter(Boolean).join(' ').trim() || nuevoTramite.nombre_destinatario;
      try {
        await tramitesAPI.registrarMovimiento(nuevoTramiteData.id, {
          area_origen: areaOrigenCreador,
          area_destino: nuevoTramite.area_destinatario,
          usuario: nombreCreador,
          observaciones: 'Trámite creado',
          actualizar_estado: 'en_transito',
        });
      } catch (errMov: any) {
        console.warn('No se pudo registrar el movimiento inicial del trámite:', errMov?.response?.data?.error || errMov);
      }

      setTramites([{ ...nuevoTramiteData, estado: 'en_transito' }, ...tramites]);

      setOpenDialog(false);
      setNuevoTramite({
        titulo: '',
        oficio: '',
        nombre_destinatario: '',
        area_destinatario: '',
        area_destino_final: '',
        archivo_pdf: null
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el trámite');
    } finally {
      setUploadingPdf(false);
    }
  };

  const processScannedCode = (code: string) => {
    // Buscar por ID (ej. OAIP-123456, JURI-123456) o solo números
    setSearchQuery(code);
    setPage(1);
    setTimeout(() => loadTramites(), 100);
  };

  const handleSearch = () => {
    setPage(1);
    loadTramites();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const now = Date.now();
    const timeSinceLastInput = now - lastInputTime;
    
    setSearchQuery(value);
    setLastInputTime(now);
    
    // Detectar escaneo de escáner profesional: si se escribe muy rápido (menos de 50ms entre caracteres)
    // y el código tiene al menos 6 caracteres, probablemente es un escaneo
    if (value.length >= 6 && timeSinceLastInput < 50 && timeSinceLastInput > 0) {
      // Esperar un momento para ver si hay más caracteres
      setTimeout(() => {
        if (searchInputRef.current?.value === value) {
          processScannedCode(value);
        }
      }, 200);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const startCameraScan = async () => {
    try {
      setScanning(true);
      setError(null);
      
      // Verificar si el navegador soporta BarcodeDetector API
      if ('BarcodeDetector' in window) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Cámara trasera en móviles
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'codabar', 'i2of5']
          });
          
          const detectBarcode = async () => {
            if (videoRef.current && scanning) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const code = barcodes[0].rawValue;
                  stopCameraScan();
                  processScannedCode(code);
                }
              } catch (err) {
                // Continuar escaneando
              }
              if (scanning) {
                requestAnimationFrame(detectBarcode);
              }
            }
          };
          
          detectBarcode();
        }
      } else {
        // Fallback: usar input manual con foco automático
        setError('Tu navegador no soporta escaneo con cámara. Usa un escáner de código de barras profesional o escribe el código manualmente.');
        searchInputRef.current?.focus();
        setScanning(false);
      }
    } catch (err: any) {
      setError('No se pudo acceder a la cámara. Asegúrate de dar permisos de cámara.');
      setScanning(false);
    }
  };

  const stopCameraScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const handleViewPdf = async (tramite: Tramite) => {
    if (!tramite.archivo_pdf) {
      setError('No hay archivo PDF asociado a este trámite');
      return;
    }

    try {
      // Obtener URL del backend desde variable de entorno o usar default
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      // Asegurar que la URL sea absoluta
      let pdfUrl = tramite.archivo_pdf.trim();
      
      // Si es una URL relativa que empieza con /api/
      if (pdfUrl.startsWith('/api/')) {
        pdfUrl = `${backendUrl}${pdfUrl}`;
      }
      // Si es una blob URL (creada localmente), usarla directamente
      else if (pdfUrl.startsWith('blob:')) {
        // Mantener la blob URL - estas son válidas localmente
      }
      // Si ya es una URL completa (http/https), usarla directamente
      else if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
        // URL completa, usar tal cual
      }
      // Si no tiene protocolo, intentar construir URL
      else {
        // Si no tiene protocolo, asumir que es relativa al backend
        pdfUrl = `${backendUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
      }
      
      console.log('Abriendo PDF en nueva pestaña:', pdfUrl);
      
      // Verificar si la URL es válida antes de abrir
      if (!pdfUrl || pdfUrl.trim() === '') {
        setError('URL del PDF no válida');
        return;
      }
      
      // Abrir PDF en nueva pestaña del navegador
      // El navegador usará su visor de PDF integrado o el lector del sistema según configuración
      const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      
      // Si el navegador bloquea la ventana emergente, mostrar mensaje
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        setError('No se pudo abrir el PDF. Por favor, verifica que tu navegador permita ventanas emergentes.');
      }
    } catch (error: any) {
      console.error('Error al abrir PDF:', error);
      setError(`Error al abrir el PDF: ${error.message || 'Error desconocido'}. Verifica que el backend esté corriendo y que la URL del PDF sea válida.`);
    }
  };

  const handleDownloadPdf = (tramite: Tramite) => {
    if (!tramite.archivo_pdf) {
      setError('No hay archivo PDF asociado a este trámite');
      return;
    }

    try {
      // Obtener URL del backend desde variable de entorno o usar default
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      // Asegurar que la URL sea absoluta
      let pdfUrl = tramite.archivo_pdf.trim();
      
      // Si es una URL relativa que empieza con /api/
      if (pdfUrl.startsWith('/api/')) {
        pdfUrl = `${backendUrl}${pdfUrl}`;
      }
      // Si ya es una URL completa (http/https/blob), usarla directamente
      else if (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://') && !pdfUrl.startsWith('blob:')) {
        // Si no tiene protocolo, asumir que es relativa al backend
        pdfUrl = `${backendUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
      }
      
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = tramite.nombre_archivo || `tramite-${tramite.id}.pdf`;
      link.target = '_blank'; // Abrir en nueva pestaña como respaldo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Error al descargar PDF:', error);
      setError(`Error al descargar el PDF: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleViewBarcode = (tramite: Tramite) => {
    setSelectedTramite(tramite);
    setOpenBarcodeDialog(true);
  };

  const handleSeguimiento = (tramite: Tramite) => {
    setSelectedTramite(tramite);
    const nombreCompleto = user ? [user.nombre, user.apellido].filter(Boolean).join(' ').trim() : '';
    // Área origen = última área en la que llegó el trámite (donde está actualmente)
    const ultimaAreaLlegada = tramite.area_destinatario;
    setSeguimientoData({
      area_origen: ultimaAreaLlegada,
      area_destino: '',
      oficio: '',
      usuario: nombreCompleto,
      observaciones: '',
      actualizar_estado: tramite.estado
    });
    setOpenSeguimientoDialog(true);
  };

  const handleRegistrarSeguimiento = async () => {
    if (!selectedTramite) return;

    if (!seguimientoData.area_destino || !seguimientoData.usuario || !seguimientoData.oficio?.trim()) {
      setError('Por favor complete el área destino, el usuario y el oficio');
      return;
    }

    try {
      setError(null);
      await tramitesAPI.registrarMovimiento(selectedTramite.id, {
        area_origen: seguimientoData.area_origen,
        area_destino: seguimientoData.area_destino,
        oficio: seguimientoData.oficio.trim(),
        usuario: seguimientoData.usuario,
        observaciones: seguimientoData.observaciones,
        actualizar_estado: seguimientoData.actualizar_estado
      });

      // Actualizar el trámite localmente
      const tramiteActualizado = { ...selectedTramite };
      if (seguimientoData.actualizar_estado) {
        tramiteActualizado.estado = seguimientoData.actualizar_estado as any;
        tramiteActualizado.area_destinatario = seguimientoData.area_destino;
      }

      setTramites(tramites.map(t => t.id === selectedTramite.id ? tramiteActualizado : t));
      setOpenSeguimientoDialog(false);
      setSeguimientoData({
        area_origen: '',
        area_destino: '',
        oficio: '',
        usuario: '',
        observaciones: '',
        actualizar_estado: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar el seguimiento');
    }
  };

  const handleViewHistory = async (tramite: Tramite) => {
    setSelectedTramite(tramite);
    setOpenHistoryDialog(true);
    setLoadingHistorial(true);
    setHistorial([]);
    
    try {
      const response = await tramitesAPI.obtenerHistorialTramite(tramite.id);
      setHistorial(response.data.data || []);
    } catch (err: any) {
      console.error('Error al cargar historial:', err);
      if (err.response?.status === 404 || err.response?.status === 500) {
        // Si no hay historial o hay error, mostrar lista vacía
        setHistorial([]);
      } else {
        setError('Error al cargar el historial del trámite');
        // Aún así mostrar el modal con lista vacía
        setHistorial([]);
      }
    } finally {
      setLoadingHistorial(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    const colores: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      'en_transito': 'warning',
      'detenido': 'error',
      'firmado': 'info',
      'procesado': 'primary',
      'completado': 'success'
    };
    return colores[estado] || 'default';
  };

  const getEstadoLabel = (estado: string) => {
    const labels: { [key: string]: string } = {
      'en_transito': 'En Tránsito',
      'detenido': 'Detenido',
      'firmado': 'Firmado',
      'procesado': 'Procesado',
      'completado': 'Completado'
    };
    return labels[estado] || estado;
  };

  // Obtener código de barras del ID (solo números)
  const getCodigoBarras = (id: string) => {
    // Extraer solo los números del ID (ej. OAIP-123456 -> 123456)
    return id.replace(/[^0-9]/g, '');
  };

  // Filtrar trámites según búsqueda y estado completado
  const filteredTramites = tramites.filter(tramite => {
    // Ocultar trámites completados si está activado
    if (hideCompleted && tramite.estado === 'completado') {
      return false;
    }
    
    const searchLower = searchQuery.toLowerCase();
    const codigoBarras = getCodigoBarras(tramite.id);
    
    return (
      tramite.titulo.toLowerCase().includes(searchLower) ||
      (tramite.oficio && tramite.oficio.toLowerCase().includes(searchLower)) ||
      tramite.nombre_destinatario.toLowerCase().includes(searchLower) ||
      tramite.id.toLowerCase().includes(searchLower) ||
      tramite.area_destinatario.toLowerCase().includes(searchLower) ||
      tramite.area_destino_final.toLowerCase().includes(searchLower) ||
      codigoBarras.includes(searchQuery.replace(/[^0-9]/g, '')) // Buscar por código de barras (solo números)
    );
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const paginatedTramites = filteredTramites;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FollowTheSigns sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600,
              color: 'primary.main'
            }}
          >
            Seguimiento de Trámites
          </Typography>
        </Box>
        {!soloLectura && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Nuevo Trámite
          </Button>
        )}
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Sistema de seguimiento de documentos físicos. Registre y rastree el movimiento de trámites entre áreas.
      </Typography>

      {/* Buscador Mejorado */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2.5, 
          mb: 3,
          background: 'linear-gradient(135deg, rgba(66, 165, 245, 0.05) 0%, rgba(255, 255, 255, 1) 100%)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3
        }}
      >
        <Box 
          display="flex" 
          gap={1.5} 
          alignItems="stretch"
          sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <TextField
              inputRef={searchInputRef}
              label="Buscar trámite"
              variant="outlined"
              size="medium"
              fullWidth
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleSearchKeyPress}
              placeholder="ID, título, oficio, destinatario, área o código de barras..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                  },
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: 2,
                    },
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <Search sx={{ color: 'primary.main', fontSize: 22 }} />
                  </Box>
                ),
                endAdornment: searchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    sx={{ mr: 0.5 }}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                ),
              }}
            />
          </Box>
          
          <Box display="flex" gap={1} alignItems="stretch">
            <Tooltip 
              title={scanning ? "Detener escaneo con cámara" : "Escanear código de barras con cámara"} 
              arrow
            >
              <Button
                variant={scanning ? "contained" : "outlined"}
                onClick={scanning ? stopCameraScan : startCameraScan}
                color={scanning ? "error" : "primary"}
                startIcon={scanning ? <Stop /> : <CameraAlt />}
                sx={{
                  minWidth: { xs: 'auto', sm: 140 },
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderWidth: scanning ? 0 : 2,
                  boxShadow: scanning ? 2 : 0,
                  '&:hover': {
                    borderWidth: scanning ? 0 : 2,
                    boxShadow: scanning ? 4 : 2,
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {scanning ? 'Detener' : 'Cámara'}
                </Box>
              </Button>
            </Tooltip>
            
            <Tooltip title="Buscar trámites" arrow>
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<Search />}
                sx={{
                  minWidth: { xs: 'auto', sm: 120 },
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Buscar
                </Box>
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Indicador de escaneo profesional */}
        {!scanning && searchQuery && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Scanner sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              También puedes usar un escáner de código de barras profesional
            </Typography>
          </Box>
        )}

        {/* Vista de cámara */}
        {scanning && (
          <Box 
            sx={{ 
              mt: 2.5, 
              textAlign: 'center',
              p: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'primary.main'
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxWidth: '500px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                backgroundColor: '#000'
              }}
            />
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'error.main',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Apunta la cámara al código de barras
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Switches de control */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={viewMode === 'list'}
              onChange={(e) => setViewMode(e.target.checked ? 'list' : 'cards')}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {viewMode === 'list' ? <ViewList /> : <ViewModule />}
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {viewMode === 'list' ? 'Vista de Lista' : 'Vista de Tarjetas'}
              </Typography>
            </Box>
          }
          sx={{
            '& .MuiFormControlLabel-label': {
              ml: 1
            }
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle fontSize="small" color={hideCompleted ? 'action' : 'success'} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Ocultar Completados
              </Typography>
            </Box>
          }
          sx={{
            '& .MuiFormControlLabel-label': {
              ml: 1
            }
          }}
        />
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : filteredTramites.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <FollowTheSigns sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No se encontraron trámites' : 'No hay trámites registrados'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchQuery 
              ? 'Intente con otros términos de búsqueda'
              : 'Comience creando un nuevo trámite para rastrear documentos físicos.'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2 }}
            >
              Crear Primer Trámite
            </Button>
          )}
        </Paper>
      ) : (
        <>
          {viewMode === 'list' ? (
            /* Vista de Lista (Tabla) */
            <TableContainer component={Paper} elevation={3} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Título</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Oficio</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Remitente</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Primera área de envío</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Área Destino Final</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Estado</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Fecha Creación</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Documento</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTramites.map((tramite) => (
                    <TableRow
                      key={tramite.id}
                      onClick={() => handleViewHistory(tramite)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' },
                        borderLeft: tramite.estado === 'completado' ? '4px solid #4CAF50' : tramite.estado === 'detenido' ? '4px solid #F44336' : 'none',
                        backgroundColor: tramite.estado === 'detenido' ? 'rgba(244, 67, 54, 0.04)' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {tramite.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {tramite.titulo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {tramite.oficio || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2">
                            {tramite.nombre_destinatario}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {tramite.area_destinatario}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {tramite.area_destino_final}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getEstadoLabel(tramite.estado)}
                          size="small"
                          color={getEstadoColor(tramite.estado)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {tramite.fecha_creacion 
                            ? new Date(tramite.fecha_creacion).toLocaleDateString('es-DO')
                            : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        {tramite.archivo_pdf ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<PictureAsPdf />}
                            onClick={() => handleViewPdf(tramite)}
                          >
                            Ver PDF
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver Código de Barras">
                            <IconButton
                              size="small"
                              onClick={() => handleViewBarcode(tramite)}
                              color="primary"
                            >
                              <QrCode fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {tramite.estado !== 'completado' && !soloLectura && (
                            <Tooltip title="Registrar Seguimiento">
                              <IconButton
                                size="small"
                                onClick={() => handleSeguimiento(tramite)}
                                color="success"
                              >
                                <Send fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* Vista de Cards */
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
              mb: 3
            }}>
            {paginatedTramites.map((tramite) => {
              const codigoBarras = getCodigoBarras(tramite.id);
              return (
                <Box key={tramite.id}>
                  <Card 
                    elevation={3}
                    onClick={() => handleViewHistory(tramite)}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      border: tramite.estado === 'completado' ? '2px solid #4CAF50' : tramite.estado === 'detenido' ? '2px solid #F44336' : 'none',
                      borderLeft: tramite.estado === 'completado' ? '4px solid #4CAF50' : tramite.estado === 'detenido' ? '4px solid #F44336' : 'none',
                      backgroundColor: tramite.estado === 'completado' ? 'rgba(76, 175, 80, 0.05)' : tramite.estado === 'detenido' ? 'rgba(244, 67, 54, 0.05)' : 'inherit',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* Información básica */}
                      <Box sx={{ mb: 2 }}>
                        {tramite.estado === 'completado' && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1,
                            p: 1,
                            bgcolor: 'success.light',
                            borderRadius: 1
                          }}>
                            <CheckCircle color="success" fontSize="small" />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.dark' }}>
                              TRÁMITE COMPLETADO
                            </Typography>
                          </Box>
                        )}
                        {tramite.estado === 'detenido' && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1,
                            p: 1,
                            bgcolor: 'rgba(244, 67, 54, 0.12)',
                            borderRadius: 1,
                            border: '1px solid rgba(244, 67, 54, 0.3)'
                          }}>
                            <Stop sx={{ color: '#c62828', fontSize: 20 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#c62828' }}>
                              TRÁMITE DETENIDO
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          {tramite.titulo}
                        </Typography>
                        {tramite.oficio && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <strong>Oficio:</strong> {tramite.oficio}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {tramite.nombre_destinatario}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Primera área de envío:</strong> {tramite.area_destinatario}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Destino Final:</strong> {tramite.area_destino_final}
                        </Typography>
                        <Chip
                          label={getEstadoLabel(tramite.estado)}
                          size="small"
                          color={getEstadoColor(tramite.estado)}
                          sx={{ mt: 1 }}
                        />
                      </Box>

                      {/* Archivo PDF - clic para ver */}
                      {tramite.archivo_pdf && (
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<PictureAsPdf />}
                          onClick={(e) => { e.stopPropagation(); handleViewPdf(tramite); }}
                          sx={{ mb: 2, justifyContent: 'flex-start', textTransform: 'none' }}
                        >
                          Ver PDF: {tramite.nombre_archivo || 'documento.pdf'}
                        </Button>
                      )}

                      {/* Código de Barras en la parte inferior */}
                      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
                        <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #e0e0e0' }}>
                          <BarcodeDisplay codigo={codigoBarras} id={tramite.id} />
                        </Box>
                      </Box>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }} onClick={(e) => e.stopPropagation()}>
                      <Box>
                        {tramite.archivo_pdf && (
                          <Tooltip title="Ver PDF">
                            <IconButton
                              size="small"
                              onClick={() => handleViewPdf(tramite)}
                              color="error"
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Ver Código de Barras">
                          <IconButton
                            size="small"
                            onClick={() => handleViewBarcode(tramite)}
                            color="primary"
                          >
                            <QrCode />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      {tramite.estado !== 'completado' && !soloLectura && (
                        <Tooltip title="Registrar Seguimiento">
                          <IconButton
                            size="small"
                            onClick={() => handleSeguimiento(tramite)}
                            color="success"
                          >
                            <Send />
                          </IconButton>
                        </Tooltip>
                      )}
                      {tramite.estado === 'completado' && (
                        <Tooltip title="Trámite completado - No se puede enviar a otro lugar">
                          <span>
                            <IconButton
                              size="small"
                              disabled
                              color="success"
                            >
                              <Send />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </CardActions>
                  </Card>
                </Box>
              );
            })}
            </Box>
          )}

          {/* Navegación de páginas */}
          {totalCount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Mostrando {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, totalCount)} de {totalCount} trámites
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Dialog para nuevo trámite */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Crear Nuevo Trámite</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField
              label="Título del Documento"
              fullWidth
              required
              value={nuevoTramite.titulo}
              onChange={(e) => setNuevoTramite({ ...nuevoTramite, titulo: e.target.value })}
              placeholder="Ej: Solicitud de Presupuesto"
            />
            <TextField
              label="Oficio"
              fullWidth
              value={nuevoTramite.oficio}
              onChange={(e) => setNuevoTramite({ ...nuevoTramite, oficio: e.target.value })}
              placeholder="Ej: OF-2025-001"
            />
            <TextField
              label="Remitente"
              fullWidth
              required
              value={nuevoTramite.nombre_destinatario}
              InputProps={{ readOnly: true }}
              placeholder="Se rellena con el usuario logueado"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Primera área de envío</InputLabel>
                <Select
                  value={nuevoTramite.area_destinatario}
                  label="Primera área de envío"
                  onChange={(e) => setNuevoTramite({ ...nuevoTramite, area_destinatario: e.target.value })}
                >
                  {AREAS_TRAMITES.map((area) => (
                    <MenuItem key={area.codigo} value={area.nombre}>{area.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Área Destino Final</InputLabel>
                <Select
                  value={nuevoTramite.area_destino_final}
                  label="Área Destino Final"
                  onChange={(e) => setNuevoTramite({ ...nuevoTramite, area_destino_final: e.target.value })}
                >
                  {AREAS_TRAMITES.map((area) => (
                    <MenuItem key={area.codigo} value={area.nombre}>{area.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Archivo PDF (opcional)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFile />}
                fullWidth
                sx={{ mb: 1 }}
              >
                {nuevoTramite.archivo_pdf ? nuevoTramite.archivo_pdf.name : 'Seleccionar archivo PDF'}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </Button>
              {nuevoTramite.archivo_pdf && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                  <PictureAsPdf color="error" />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {nuevoTramite.archivo_pdf.name} ({(nuevoTramite.archivo_pdf.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setNuevoTramite({ ...nuevoTramite, archivo_pdf: null });
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <Typography variant="body2">✕</Typography>
                  </IconButton>
                </Box>
              )}
              <Typography variant="caption" color="text.secondary">
                Solo se permiten archivos PDF. Tamaño máximo: 10MB
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setNuevoTramite({
              titulo: '',
              oficio: '',
              nombre_destinatario: '',
              area_destinatario: '',
              area_destino_final: '',
              archivo_pdf: null
            });
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateTramite} 
            variant="contained"
            disabled={uploadingPdf}
          >
            {uploadingPdf ? 'Creando...' : 'Crear Trámite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para código de barras */}
      <Dialog open={openBarcodeDialog} onClose={() => setOpenBarcodeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Código de Barras - {selectedTramite?.id}
        </DialogTitle>
        <DialogContent>
          {selectedTramite && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <BarcodeDisplay 
                codigo={getCodigoBarras(selectedTramite.id)} 
                id={selectedTramite.id} 
              />
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Título:</strong> {selectedTramite.titulo}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Remitente:</strong> {selectedTramite.nombre_destinatario}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBarcodeDialog(false)}>Cerrar</Button>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para visualizar PDF */}
      <Dialog 
        open={openPdfDialog} 
        onClose={() => {
          setOpenPdfDialog(false);
          setPdfUrl(null);
          setPdfError(false);
        }} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            height: '90vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          borderBottom: '2px solid',
          borderColor: 'divider',
          backgroundColor: 'error.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <PictureAsPdf />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedTramite?.nombre_archivo || 'Documento PDF'}
              </Typography>
              {selectedTramite && (
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedTramite.id} - {selectedTramite.titulo}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {pdfUrl && (
              <Tooltip title="Abrir en nueva pestaña">
                <IconButton
                  size="small"
                  onClick={() => window.open(pdfUrl || '', '_blank')}
                  sx={{ color: 'white' }}
                >
                  <Visibility />
                </IconButton>
              </Tooltip>
            )}
            {selectedTramite && (
              <Tooltip title="Descargar PDF">
                <IconButton
                  size="small"
                  onClick={() => handleDownloadPdf(selectedTramite)}
                  sx={{ color: 'white' }}
                >
                  <Download />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden', position: 'relative' }}>
          {pdfError ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 6,
              height: '100%',
              backgroundColor: '#f5f5f5'
            }}>
              <PictureAsPdf sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No se pudo cargar el PDF
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 400 }}>
                El PDF no se puede mostrar en el visor. Puedes intentar abrirlo en una nueva pestaña o descargarlo.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {pdfUrl && (
                  <Button
                    variant="contained"
                    startIcon={<Visibility />}
                    onClick={() => window.open(pdfUrl, '_blank')}
                  >
                    Abrir en nueva pestaña
                  </Button>
                )}
                {selectedTramite && (
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => handleDownloadPdf(selectedTramite)}
                  >
                    Descargar PDF
                  </Button>
                )}
              </Box>
            </Box>
          ) : pdfUrl ? (
            <Box sx={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#525252',
              position: 'relative'
            }}>
              {/* Usar embed para mejor soporte de PDFs en navegadores */}
              <embed
                src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                type="application/pdf"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  flex: 1,
                  minHeight: '500px'
                }}
              />
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 6,
              height: '100%'
            }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Cargando PDF...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => {
              setOpenPdfDialog(false);
              setPdfUrl(null);
              setPdfError(false);
            }}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Cerrar
          </Button>
          {pdfUrl && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => {
                if (selectedTramite) {
                  handleDownloadPdf(selectedTramite);
                }
              }}
            >
              Descargar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog para registrar seguimiento */}
      <Dialog open={openSeguimientoDialog} onClose={() => setOpenSeguimientoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Registrar Seguimiento - {selectedTramite?.id}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Área Origen</InputLabel>
              <Select
                value={seguimientoData.area_origen}
                label="Área Origen"
                disabled
              >
                <MenuItem value={seguimientoData.area_origen}>{seguimientoData.area_origen}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Área Destino</InputLabel>
              <Select
                value={seguimientoData.area_destino}
                label="Área Destino"
                onChange={(e) => setSeguimientoData({ ...seguimientoData, area_destino: e.target.value })}
              >
{AREAS_TRAMITES.map((area) => (
                    <MenuItem key={area.codigo} value={area.nombre}>{area.nombre}</MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="Oficio"
              fullWidth
              required
              value={seguimientoData.oficio}
              onChange={(e) => setSeguimientoData({ ...seguimientoData, oficio: e.target.value })}
              placeholder="Ej: OF-2025-001"
            />
            <TextField
              label="Usuario / Quién envía (Remitente)"
              fullWidth
              required
              value={seguimientoData.usuario}
              InputProps={{ readOnly: true }}
              placeholder="Se rellena con el usuario logueado"
            />
            <FormControl fullWidth>
              <InputLabel>Actualizar Estado</InputLabel>
              <Select
                value={seguimientoData.actualizar_estado}
                label="Actualizar Estado"
                onChange={(e) => setSeguimientoData({ ...seguimientoData, actualizar_estado: e.target.value })}
              >
                <MenuItem value="en_transito">En Tránsito</MenuItem>
                <MenuItem value="detenido">Detenido</MenuItem>
                <MenuItem value="firmado">Firmado</MenuItem>
                <MenuItem value="procesado">Procesado</MenuItem>
                <MenuItem value="completado">Completado</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Observaciones"
              fullWidth
              multiline
              rows={3}
              value={seguimientoData.observaciones}
              onChange={(e) => setSeguimientoData({ ...seguimientoData, observaciones: e.target.value })}
              placeholder="Notas adicionales sobre el movimiento..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSeguimientoDialog(false)}>Cancelar</Button>
          <Button onClick={handleRegistrarSeguimiento} variant="contained" startIcon={<Send />}>
            Registrar Seguimiento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para historial */}
      <Dialog 
        open={openHistoryDialog} 
        onClose={() => {
          setOpenHistoryDialog(false);
          setHistorial([]);
          setLoadingHistorial(false);
        }} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
                <DialogTitle sx={{ 
          pb: 2,
          borderBottom: '2px solid',
          borderColor: 'divider',
          backgroundColor: 'primary.main',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon />
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                  Historial de Movimientos
                </Typography>
              {selectedTramite && (
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                  {selectedTramite.id} - {selectedTramite.titulo}
                  {selectedTramite.oficio && ` · Oficio: ${selectedTramite.oficio}`}
                </Typography>
              )}
              </Box>
            </Box>
            {selectedTramite?.archivo_pdf && (
              <Button
                variant="contained"
                size="small"
                color="error"
                startIcon={<PictureAsPdf />}
                onClick={() => {
                  setOpenHistoryDialog(false);
                  handleViewPdf(selectedTramite);
                }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Ver PDF del trámite
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, minHeight: '300px' }}>
          {loadingHistorial ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Cargando historial de movimientos...
              </Typography>
            </Box>
          ) : historial.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <HistoryIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Sin movimientos registrados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aún no hay movimientos registrados para este trámite
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                Total de movimientos: {historial.length}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                maxHeight: '500px',
                overflowY: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.3)',
                  },
                },
              }}>
                {historial.map((movimiento, index) => {
                  const esUltimo = index === 0;
                  return (
                    <Paper 
                      key={movimiento.id || index} 
                      elevation={esUltimo ? 3 : 1} 
                      sx={{ 
                        p: 2.5, 
                        position: 'relative',
                        borderLeft: esUltimo ? '4px solid' : '2px solid',
                        borderColor: esUltimo ? 'primary.main' : 'divider',
                        backgroundColor: esUltimo ? 'rgba(66, 165, 245, 0.05)' : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateX(4px)',
                        }
                      }}
                    >
                      {esUltimo && (
                        <Chip 
                          label="Más Reciente" 
                          size="small" 
                          color="primary" 
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8,
                            fontWeight: 600
                          }} 
                        />
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                          }}>
                            {historial.length - index}
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                            Movimiento #{historial.length - index}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {movimiento.fecha_movimiento
                            ? new Date(movimiento.fecha_movimiento).toLocaleString('es-DO', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Fecha no disponible'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 2, 
                        mb: 1.5,
                        flexWrap: 'wrap'
                      }}>
                        <Box sx={{ 
                          flex: 1, 
                          minWidth: '200px',
                          p: 1.5,
                          backgroundColor: 'rgba(255, 152, 0, 0.1)',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'warning.light'
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Desde
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {movimiento.area_origen || 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          flex: 1, 
                          minWidth: '200px',
                          p: 1.5,
                          backgroundColor: 'rgba(76, 175, 80, 0.1)',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'success.light'
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Hacia
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {movimiento.area_destino || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {movimiento.oficio && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1, 
                          mb: 1,
                          p: 1,
                          backgroundColor: 'rgba(33, 150, 243, 0.08)',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'primary.light'
                        }}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Oficio:</strong> {movimiento.oficio}
                          </Typography>
                        </Box>
                      )}
                      {movimiento.usuario && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1, 
                          mb: 1,
                          p: 1,
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          borderRadius: 1
                        }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            <strong>Usuario:</strong> {movimiento.usuario}
                          </Typography>
                        </Box>
                      )}
                      
                      {movimiento.observaciones && (
                        <Box sx={{ 
                          mt: 1.5,
                          p: 1.5,
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          borderRadius: 1,
                          borderLeft: '3px solid',
                          borderColor: 'info.main'
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                            Observaciones
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                            {movimiento.observaciones}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => {
              setOpenHistoryDialog(false);
              setHistorial([]);
              setLoadingHistorial(false);
            }}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TramiteHistory;
