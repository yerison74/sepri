import React, { useState, useEffect } from 'react';
import {
  Search,
  FilterList,
  Delete,
  Visibility,
  MoreVert
} from '@mui/icons-material';
import { mantenimientosAPI, statsAPI, Obra } from '../services/api';
import ObraMap from './ObraMap';

interface ObrasTableProps {
  refreshTrigger?: number;
}

const ObrasTable: React.FC<ObrasTableProps> = ({ refreshTrigger }) => {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [responsableFilter, setResponsableFilter] = useState<string>('');
  const [provinciaFilter, setProvinciaFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([]);

  useEffect(() => {
    loadObras();
  }, [page, rowsPerPage, refreshTrigger]);

  // Cargar lista de estados desde la base de datos (para filtros)
  useEffect(() => {
    const loadEstados = async () => {
      try {
        const res = await statsAPI.obtenerResumenDashboard();
        const porEstado = res?.data?.data?.estadisticas?.porEstado;
        if (Array.isArray(porEstado)) {
          setEstadosDisponibles(porEstado.map((e: { estado: string }) => e.estado));
        }
      } catch {
        setEstadosDisponibles([]);
      }
    };
    loadEstados();
  }, [refreshTrigger]);

  // Escuchar eventos desde el Dashboard para aplicar filtros y cargar
  useEffect(() => {
    const handler = (e: any) => {
      const { estado, provincia } = e.detail || {};
      if (estado !== undefined) setEstadoFilter(estado || '');
      if (provincia !== undefined) setProvinciaFilter(provincia || '');
      setPage(0);
      loadObrasWithFilters({
        estado: estado !== undefined ? estado : undefined,
        provincia: provincia !== undefined ? provincia : undefined,
      });
    };
    window.addEventListener('setObrasFilters', handler);
    return () => window.removeEventListener('setObrasFilters', handler);
  }, []);

  const loadObrasWithFilters = async (overrides?: { estado?: string; provincia?: string }) => {
    const estado = overrides?.estado !== undefined ? overrides.estado : estadoFilter;
    const provincia = overrides?.provincia !== undefined ? overrides.provincia : provinciaFilter;
    try {
      setLoading(true);
      setError(null);
      const response = await mantenimientosAPI.obtenerObras({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: searchQuery || undefined,
        estado: estado || undefined,
        responsable: responsableFilter || undefined,
        provincia: provincia || undefined,
      });
      setObras(response.data.data);
      setTotalCount(response.data.count);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar obras');
    } finally {
      setLoading(false);
    }
  };

  const loadObras = () => loadObrasWithFilters();

  const handleSearch = () => {
    setPage(0);
    loadObras();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setEstadoFilter('');
    setResponsableFilter('');
    setProvinciaFilter('');
    setPage(0);
    loadObras();
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, obraId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedId(obraId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedId(null);
  };

  const handleViewDetails = (obra: Obra) => {
    setSelectedObra(obra);
    setShowDetails(true);
    handleMenuClose();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta obra?')) {
      try {
        await mantenimientosAPI.eliminarObra(id);
        loadObras();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al eliminar obra');
      }
    }
    handleMenuClose();
  };

  const getEstadoColor = (estado: string) => {
    const colores: { [key: string]: { bg: string; text: string } } = {
      'INAUGURADA': { bg: '#2196F3', text: '#FFFFFF' },
      'TERMINADA': { bg: '#4CAF50', text: '#FFFFFF' },
      'DETENIDA': { bg: '#FFC107', text: '#000000' },
      'NO INICIADA': { bg: '#F44336', text: '#FFFFFF' },
      'ACTIVA': { bg: '#00BCD4', text: '#FFFFFF' },
      'PRELIMINARES': { bg: '#FF9800', text: '#FFFFFF' },
      'INTERVENIDA MANTENIMIENTO': { bg: '#9C27B0', text: '#FFFFFF' },
      'NO ESPECIFICADO': { bg: '#9E9E9E', text: '#FFFFFF' }
    };
    
    const estadoConfig = colores[estado.toUpperCase()] || { bg: '#757575', text: '#FFFFFF' };
    return estadoConfig;
  };

  if (loading && obras.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#42A5F5]"></div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const startRow = page * rowsPerPage;
  const endRow = Math.min(startRow + rowsPerPage, totalCount);
  const estados: string[] = estadosDisponibles;

  return (
    <div className="p-0">
      <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-[#42A5F5]">
        Gestión de Obras
      </h2>

      {/* Barra de búsqueda */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar por ID (OB-0000, MT-0000 o número interno), código (0000-0000), nombre, estado, responsable, provincia, municipio, nivel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-grow min-w-[260px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Responsable contiene..."
            value={responsableFilter}
            onChange={(e) => setResponsableFilter(e.target.value)}
            className="min-w-[220px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />

          <input
            type="text"
            placeholder="Provincia..."
            value={provinciaFilter}
            onChange={(e) => setProvinciaFilter(e.target.value)}
            className="min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent"
          />

          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[#42A5F5] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
          >
            <Search />
            Buscar
          </button>
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            <FilterList />
            Limpiar filtros
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Listado de obras */}
      {obras.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-500">No se encontraron obras</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {obras.map((obra) => {
            const estadoConfig = getEstadoColor(obra.estado);
            return (
              <div
                key={obra.id}
                onClick={() => handleViewDetails(obra)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-[#42A5F5] p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Información principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                          {obra.nombre || 'Sin nombre'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          {obra.id_obra && (
                            <span className="font-mono font-medium text-[#42A5F5] font-semibold">
                              {obra.id_obra}
                            </span>
                          )}
                          {obra.codigo && (
                            <span className="font-mono font-medium text-gray-600">
                              {obra.codigo}
                            </span>
                          )}
                          {obra.nivel && (
                            <span className="text-gray-500">• {obra.nivel}</span>
                          )}
                        </div>
                      </div>
                      <span
                        className="px-3 py-1 text-xs font-semibold rounded-full text-white whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: estadoConfig.bg, color: estadoConfig.text }}
                      >
                        {obra.estado}
                      </span>
                    </div>

                    {/* Información secundaria */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                      {obra.responsable && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Contratista:</span>
                          <span className="truncate">{obra.responsable}</span>
                        </div>
                      )}
                      {obra.provincia && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Provincia:</span>
                          <span>{obra.provincia}</span>
                        </div>
                      )}
                      {obra.municipio && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Municipio:</span>
                          <span>{obra.municipio}</span>
                        </div>
                      )}
                      {(obra.fecha_inauguracion || obra.fecha_inicio) && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Fecha:</span>
                          <span>
                            {obra.fecha_inauguracion 
                              ? new Date(obra.fecha_inauguracion).toLocaleDateString('es-DO', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : obra.fecha_inicio 
                                ? new Date(obra.fecha_inicio).toLocaleDateString('es-DO', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : '-'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && obras.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#42A5F5]"></div>
          </div>
        </div>
      )}

      {/* Paginación */}
      <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">Filas por página:</span>
          <select
            value={rowsPerPage}
            onChange={handleChangeRowsPerPage}
            className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#42A5F5]"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-700">
            {startRow + 1}-{endRow} de {totalCount}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleChangePage(page - 1)}
            disabled={page === 0}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => handleChangePage(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Dialog de detalles */}
      {showDetails && selectedObra && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Detalles de la Obra</h3>
            </div>
            <div className="p-6">
              <h4 className="text-xl font-semibold mb-4 text-gray-800">{selectedObra.nombre}</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedObra.id_obra && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ID de Obra</div>
                    <div className="text-base font-semibold text-[#42A5F5] font-mono">{selectedObra.id_obra}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Código</div>
                  <div className="text-base font-medium">{selectedObra.codigo || '-'}</div>
                </div>
                {!selectedObra.id_obra && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ID (Sistema)</div>
                    <div className="text-base font-semibold text-gray-600">{selectedObra.id}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Estado</div>
                  <div className="mt-1">
                    <span
                      className="px-3 py-1 text-xs font-semibold rounded-full text-white"
                      style={{ 
                        backgroundColor: getEstadoColor(selectedObra.estado).bg,
                        color: getEstadoColor(selectedObra.estado).text
                      }}
                    >
                      {selectedObra.estado}
                    </span>
                  </div>
                </div>
                {selectedObra.responsable && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Contratista / Responsable</div>
                    <div className="text-base font-medium">{selectedObra.responsable}</div>
                  </div>
                )}
                {selectedObra.provincia && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Provincia</div>
                    <div className="text-base font-medium">{selectedObra.provincia}</div>
                  </div>
                )}
                {selectedObra.municipio && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Municipio</div>
                    <div className="text-base font-medium">{selectedObra.municipio}</div>
                  </div>
                )}
                {selectedObra.nivel && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Nivel</div>
                    <div className="text-base font-medium">{selectedObra.nivel}</div>
                  </div>
                )}
                {selectedObra.no_aula && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">No. Aulas</div>
                    <div className="text-base font-medium">{selectedObra.no_aula}</div>
                  </div>
                )}
                {selectedObra.fecha_inicio && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Fecha Inicio</div>
                    <div className="text-base font-medium">
                      {new Date(selectedObra.fecha_inicio).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {selectedObra.fecha_fin_estimada && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Fecha Fin Estimada</div>
                    <div className="text-base font-medium">
                      {new Date(selectedObra.fecha_fin_estimada).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {selectedObra.fecha_inauguracion && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Fecha Inauguración</div>
                    <div className="text-base font-medium">
                      {new Date(selectedObra.fecha_inauguracion).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {selectedObra.distrito_minerd_sigede && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Distrito MINERD SIGEDE</div>
                    <div className="text-base font-medium">{selectedObra.distrito_minerd_sigede}</div>
                  </div>
                )}
              </div>

              {selectedObra.observacion_legal && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm font-semibold mb-2 text-yellow-800">Observación Legal</div>
                  <div className="text-sm text-gray-700">{selectedObra.observacion_legal}</div>
                </div>
              )}

              {selectedObra.observacion_financiero && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold mb-2 text-blue-800">Observación Financiera</div>
                  <div className="text-sm text-gray-700">{selectedObra.observacion_financiero}</div>
                </div>
              )}

              {selectedObra.descripcion && (
                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2 text-gray-700">Descripción</div>
                  <div className="text-sm text-gray-600">{selectedObra.descripcion}</div>
                </div>
              )}

              {/* Mapa interactivo */}
              <div className="mt-6 mb-6">
                <div className="text-sm font-semibold mb-3 text-gray-700">Ubicación en el Mapa</div>
                {(selectedObra.latitud || selectedObra.longitud) && (
                  <div className="mb-2 text-xs text-gray-500">
                    Coordenadas: {selectedObra.latitud && selectedObra.longitud 
                      ? `${selectedObra.latitud}, ${selectedObra.longitud}`
                      : selectedObra.latitud || selectedObra.longitud || 'No disponibles'
                    }
                  </div>
                )}
                <ObraMap
                  latitud={selectedObra.latitud}
                  longitud={selectedObra.longitud}
                  nombre={selectedObra.nombre}
                  height="400px"
                />
              </div>

              {/* Información de auditoría */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm font-semibold mb-3 text-gray-500">Información del Sistema</div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedObra.created_at && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Fecha de Creación</div>
                      <div className="text-sm font-medium">
                        {new Date(selectedObra.created_at).toLocaleDateString('es-DO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                  {selectedObra.updated_at && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Última Actualización</div>
                      <div className="text-sm font-medium">
                        {new Date(selectedObra.updated_at).toLocaleDateString('es-DO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={async () => {
                  if (window.confirm('¿Estás seguro de que quieres eliminar esta obra?')) {
                    try {
                      await mantenimientosAPI.eliminarObra(selectedObra.id);
                      setShowDetails(false);
                      loadObras();
                    } catch (err: any) {
                      setError(err.response?.data?.error || 'Error al eliminar obra');
                    }
                  }
                }}
                className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Delete fontSize="small" />
                Eliminar
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="px-6 py-2.5 bg-[#42A5F5] text-white rounded-lg hover:bg-blue-600 transition-all font-medium shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObrasTable;
