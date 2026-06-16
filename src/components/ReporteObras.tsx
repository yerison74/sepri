import React, { useState, useEffect, useMemo } from 'react';
import {
  Assessment,
  Download,
  FilterList,
  Place,
  Public,
  LocationOn,
  School,
  Groups,
  Tune,
} from '@mui/icons-material';
import { statsAPI, uploadAPI } from '../services/api';
import type { ReporteObrasStats } from '../types/database';
import AutocompleteInput from './AutocompleteInput';
import ReporteObrasMap from './ReporteObrasMap';
import ReporteObrasTablaDetalle from './ReporteObrasTablaDetalle';
import {
  REPORTE_OBRAS_COLUMNAS,
  obtenerValorReporteCampo,
  formatearValorReporte,
} from '../constants/reporteObrasAreas';

const COLORS: Record<string, string> = {
  ACTIVA: '#4361EE',
  INAUGURADA: '#3A86FF',
  TERMINADA: '#22C55E',
  DETENIDA: '#FB8500',
  PRELIMINARES: '#8338EC',
  'INTERVENIDA MANTENIMIENTO': '#FF006E',
  'NO ESPECIFICADO': '#94A3B8',
};

const EMPTY_FILTERS = {
  search: '',
  estado: '',
  responsable: '',
  provincia: '',
  municipio: '',
  nivel: '',
  fechaInauguracionDesde: '',
  fechaInauguracionHasta: '',
};

interface ReporteObrasProps {
  refreshTrigger?: number;
  soloLectura?: boolean;
}

const ReporteObras: React.FC<ReporteObrasProps> = ({ refreshTrigger, soloLectura = false }) => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [reporte, setReporte] = useState<ReporteObrasStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([]);
  const [opcionesDescarga, setOpcionesDescarga] = useState<{
    provincias: string[];
    municipios: { provincia: string; municipio: string }[];
    niveles: string[];
  }>({ provincias: [], municipios: [], niveles: [] });
  const [searchSugerencias, setSearchSugerencias] = useState<string[]>([]);
  const [responsableSugerencias, setResponsableSugerencias] = useState<string[]>([]);
  const [loadingSearchSugerencias, setLoadingSearchSugerencias] = useState(false);
  const [loadingResponsableSugerencias, setLoadingResponsableSugerencias] = useState(false);

  const selectClassName =
    'px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent w-full';

  useEffect(() => {
    const load = async () => {
      try {
        const [resEstados, resOpciones] = await Promise.all([
          statsAPI.obtenerResumenDashboard(),
          uploadAPI.obtenerOpcionesFiltroDescarga(),
        ]);
        const porEstado = resEstados?.data?.data?.estadisticas?.porEstado;
        if (Array.isArray(porEstado)) {
          setEstadosDisponibles(porEstado.map((e: { estado: string }) => e.estado));
        }
        const opciones = resOpciones?.data?.data;
        if (opciones) setOpcionesDescarga(opciones);
      } catch {
        setEstadosDisponibles([]);
        setOpcionesDescarga({ provincias: [], municipios: [], niveles: [] });
      }
    };
    load();
  }, [refreshTrigger]);

  const municipiosDisponibles = useMemo(() => {
    const { municipios } = opcionesDescarga;
    if (filters.provincia) {
      return municipios.filter((m) => m.provincia === filters.provincia).map((m) => m.municipio);
    }
    return Array.from(new Set(municipios.map((m) => m.municipio))).sort((a, b) => a.localeCompare(b, 'es'));
  }, [opcionesDescarga, filters.provincia]);

  useEffect(() => {
    const term = filters.search.trim();
    if (term.length < 2) {
      setSearchSugerencias([]);
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
  }, [filters.search]);

  useEffect(() => {
    const term = filters.responsable.trim();
    if (term.length < 2) {
      setResponsableSugerencias([]);
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
  }, [filters.responsable]);

  const generarReporte = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v && v !== ''),
      );
      const resp = await statsAPI.obtenerReporteObras(params);
      setReporte(resp.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al generar el reporte');
      setReporte(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleExportExcel = async () => {
    if (!reporte?.obrasDetalle?.length) {
      setError('No hay datos para exportar');
      return;
    }
    try {
      setExporting(true);
      const XLSX = await import('xlsx');
      const headers = ['ID', ...REPORTE_OBRAS_COLUMNAS.map((c) => `${c.areaLabel} — ${c.label}`)];
      const filas = reporte.obrasDetalle.map((obra) => {
        const obraRecord = obra as unknown as Record<string, unknown>;
        const contratistaRecord = (obra.contratista ?? null) as Record<string, unknown> | null;
        return [
          obra.codigo || obra.id,
          ...REPORTE_OBRAS_COLUMNAS.map((col) => {
            const valor = obtenerValorReporteCampo(obraRecord, contratistaRecord, col);
            return formatearValorReporte(valor, col.format);
          }),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...filas]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte obras');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-obras-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo exportar el Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (field: keyof typeof filters) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'provincia') {
        const validos = opcionesDescarga.municipios
          .filter((m) => m.provincia === value)
          .map((m) => m.municipio);
        if (prev.municipio && value && !validos.includes(prev.municipio)) {
          next.municipio = '';
        }
      }
      return next;
    });
  };

  const handleFilterValueChange = (field: keyof typeof filters) => (value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const getEstadoColor = (estado: string) =>
    COLORS[estado.toUpperCase()] || '#757575';

  const estadoData = reporte?.estadisticas?.porEstado?.map((item) => ({
    ...item,
    color: getEstadoColor(item.estado),
  })) || [];

  const totalEstados = estadoData.reduce((s, i) => s + i.cantidad, 0);
  const maxEstado = estadoData.length > 0 ? Math.max(1, ...estadoData.map((i) => i.cantidad)) : 1;

  const filtrosActivos = Object.entries(filters).filter(([, v]) => v).length;

  return (
    <div className="p-0 space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-4 sm:px-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Assessment className="text-[#42A5F5]" />
              Reporte de Obras
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Aplica filtros y obtén estadísticas del conjunto de obras seleccionado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setReporte(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
            >
              <Tune sx={{ fontSize: 18 }} />
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || !reporte?.obrasDetalle?.length || soloLectura}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#FFA726] text-[#E65100] rounded-xl hover:bg-orange-50 disabled:opacity-50"
            >
              <Download sx={{ fontSize: 18 }} />
              {exporting ? 'Exportando…' : 'Exportar Excel'}
            </button>
            <button
              type="button"
              onClick={generarReporte}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#42A5F5] text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 font-medium"
            >
              <FilterList sx={{ fontSize: 18 }} />
              {loading ? 'Generando…' : 'Generar reporte'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AutocompleteInput
            value={filters.search}
            onChange={handleFilterValueChange('search')}
            options={searchSugerencias}
            loading={loadingSearchSugerencias}
            placeholder="Buscar (nombre, código, estado…)"
          />
          <select value={filters.estado} onChange={handleFilterChange('estado')} className={selectClassName}>
            <option value="">Todos los estados</option>
            {estadosDisponibles.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
          <AutocompleteInput
            value={filters.responsable}
            onChange={handleFilterValueChange('responsable')}
            options={responsableSugerencias}
            loading={loadingResponsableSugerencias}
            placeholder="Responsable / Contratista"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={filters.provincia} onChange={handleFilterChange('provincia')} className={selectClassName}>
            <option value="">Todas las provincias</option>
            {opcionesDescarga.provincias.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={filters.municipio} onChange={handleFilterChange('municipio')} className={selectClassName}>
            <option value="">Todos los municipios</option>
            {municipiosDisponibles.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select value={filters.nivel} onChange={handleFilterChange('nivel')} className={selectClassName}>
            <option value="">Todos los niveles</option>
            {opcionesDescarga.niveles.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Inauguración desde</label>
            <input
              type="date"
              value={filters.fechaInauguracionDesde}
              onChange={handleFilterChange('fechaInauguracionDesde')}
              className={selectClassName}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Inauguración hasta</label>
            <input
              type="date"
              value={filters.fechaInauguracionHasta}
              onChange={handleFilterChange('fechaInauguracionHasta')}
              className={selectClassName}
            />
          </div>
        </div>
        {filtrosActivos > 0 && (
          <p className="text-xs text-slate-500">{filtrosActivos} filtro(s) activo(s)</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">{error}</div>
      )}

      {loading && !reporte && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#42A5F5]" />
        </div>
      )}

      {reporte && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Total obras</div>
              <div className="text-3xl font-bold text-slate-800">{reporte.estadisticas.totalObras}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Estados distintos</div>
              <div className="text-3xl font-bold text-slate-800">{estadoData.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Total aulas</div>
              <div className="text-3xl font-bold text-slate-800">{reporte.estadisticas.totalAulas}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Con ubicación GPS</div>
              <div className="text-3xl font-bold text-slate-800">{reporte.estadisticas.conUbicacion}</div>
            </div>
          </div>

          {/* Mapa + estados */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-1">
                <Public className="text-[#42A5F5]" />
                Ubicación GPS de obras
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                {reporte.obrasConUbicacion?.length ?? 0} de {reporte.estadisticas.totalObras} obras
                con coordenadas GPS en el filtro aplicado.
              </p>
              <ReporteObrasMap
                obras={reporte.obrasConUbicacion ?? []}
                height="320px"
              />
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Por estado</h3>
              {estadoData.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {estadoData.map((item) => {
                    const pct = totalEstados > 0 ? (item.cantidad / totalEstados) * 100 : 0;
                    return (
                      <div key={item.estado} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700 truncate">{item.estado}</span>
                          <span className="text-slate-500 shrink-0 ml-2">
                            {item.cantidad} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(item.cantidad / maxEstado) * 100}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Sin datos para los filtros aplicados</p>
              )}
            </div>
          </div>

          {/* Tablas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TablaReporte
              titulo="Por provincia"
              icon={<Place className="text-slate-400" />}
              columnas={['Provincia', 'Obras']}
              filas={reporte.obrasPorProvincia.map((r) => [r.provincia, String(r.cantidad)])}
            />
            <TablaReporte
              titulo="Por municipio (top 15)"
              icon={<LocationOn className="text-slate-400" />}
              columnas={['Municipio', 'Provincia', 'Obras']}
              filas={reporte.obrasPorMunicipio.slice(0, 15).map((r) => [
                r.municipio,
                r.provincia,
                String(r.cantidad),
              ])}
            />
            <TablaReporte
              titulo="Por nivel educativo"
              icon={<School className="text-slate-400" />}
              columnas={['Nivel', 'Obras']}
              filas={reporte.obrasPorNivel.map((r) => [r.nivel, String(r.cantidad)])}
            />
            <TablaReporte
              titulo="Por responsable (top 15)"
              icon={<Groups className="text-slate-400" />}
              columnas={['Responsable', 'Obras']}
              filas={reporte.obrasPorResponsable.map((r) => [r.responsable, String(r.cantidad)])}
            />
          </div>

          {/* Detalle por áreas */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Detalle por áreas
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Columnas agrupadas según PLANTEL, CONSTRUCCIÓN, UBICACIÓN, CONTRATISTA, PRESUPUESTO,
              CUBICACIÓN, TIEMPOS, SNIP y OBSERVACIONES.
            </p>
            <ReporteObrasTablaDetalle obras={reporte.obrasDetalle ?? []} />
          </div>

          {/* Próximas inauguraciones */}
          {reporte.obrasProximasInaugurar.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Próximas a inaugurar (30 días)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Código</th>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left">Provincia</th>
                      <th className="px-3 py-2 text-left">Inauguración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.obrasProximasInaugurar.map((obra) => (
                      <tr key={obra.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono">{obra.codigo || obra.id}</td>
                        <td className="px-3 py-2">{obra.nombre}</td>
                        <td className="px-3 py-2">{obra.estado}</td>
                        <td className="px-3 py-2">{obra.provincia || '—'}</td>
                        <td className="px-3 py-2">{obra.fecha_inauguracion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function TablaReporte({
  titulo,
  icon,
  columnas,
  filas,
}: {
  titulo: string;
  icon: React.ReactNode;
  columnas: string[];
  filas: string[][];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-800">
        {icon}
        {titulo}
      </h3>
      {filas.length > 0 ? (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                {columnas.map((c) => (
                  <th key={c} className="py-2 px-3 text-left font-semibold text-slate-600">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                  {fila.map((celda, j) => (
                    <td
                      key={j}
                      className={`py-2 px-3 ${j === fila.length - 1 ? 'text-right font-semibold text-slate-500' : 'text-slate-800'}`}
                    >
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-500 text-sm py-4 text-center">Sin datos</p>
      )}
    </div>
  );
}

export default ReporteObras;
