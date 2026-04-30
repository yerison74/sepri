import React, { useState, useEffect } from 'react';
import {
  Assignment,
  TrendingUp,
  CheckCircle,
  PauseCircle,
  Insights,
  BuildCircle,
  PendingActions,
  LocationOn,
  Public,
  Place,
} from '@mui/icons-material';
import { statsAPI, Obra } from '../services/api';
import DashboardMap from './DashboardMap';

interface StatsDashboardProps {
  refreshTrigger?: number;
  onEstadoClick?: (estado: string) => void;
  onProvinciaClick?: (provincia: string) => void;
}

const COLORS = {
  'ACTIVA': '#00BCD4',
  'INAUGURADA': '#2196F3',
  'TERMINADA': '#4CAF50',
  'DETENIDA': '#FFC107',
  'PRELIMINARES': '#FF9800',
  'INTERVENIDA MANTENIMIENTO': '#9C27B0',
  'NO ESPECIFICADO': '#9E9E9E'
};

const StatsDashboard: React.FC<StatsDashboardProps> = ({ refreshTrigger, onEstadoClick, onProvinciaClick }) => {
  const [stats, setStats] = useState<any>(null);
  const [proximasInaugurar, setProximasInaugurar] = useState<Obra[]>([]);
  const [obrasPorProvincia, setObrasPorProvincia] = useState<{ provincia: string; cantidad: number }[]>([]);
  const [obrasPorMunicipio, setObrasPorMunicipio] = useState<{ municipio: string; provincia: string; cantidad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsResponse = await statsAPI.obtenerResumenDashboard();
      const data = statsResponse.data.data;
      setStats(data);
      setProximasInaugurar(data.obrasProximasInaugurar || []);
      setObrasPorProvincia(data.obrasPorProvincia || []);
      setObrasPorMunicipio(data.obrasPorMunicipio || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    return COLORS[estado.toUpperCase() as keyof typeof COLORS] || '#757575';
  };

  const normalizeEstado = (estado?: string | null) =>
    (estado || '').trim().replace(/\s+/g, ' ').toUpperCase();

  const getEstadoIcon = (estado: string) => {
    const normalized = normalizeEstado(estado);
    if (normalized.includes('TERMINADA') || normalized.includes('INAUGURADA')) {
      return <CheckCircle className="text-5xl opacity-80" />;
    }
    if (normalized.includes('DETENIDA')) {
      return <PauseCircle className="text-5xl opacity-80" />;
    }
    if (normalized.includes('PRELIMINAR') || normalized.includes('NO INICIADA')) {
      return <PendingActions className="text-5xl opacity-80" />;
    }
    if (normalized.includes('INTERVENIDA') || normalized.includes('MANTEN')) {
      return <BuildCircle className="text-5xl opacity-80" />;
    }
    if (normalized.includes('ACTIVA')) {
      return <TrendingUp className="text-5xl opacity-80" />;
    }
    return <Insights className="text-5xl opacity-80" />;
  };

  // Preparar datos para visualización de estados
  const estadoData = stats?.estadisticas?.porEstado?.map((item: any) => {
    const estado = normalizeEstado(item.estado) || 'NO ESPECIFICADO';
    return {
      estado,
      cantidad: item.cantidad,
      color: getEstadoColor(estado)
    };
  }) || [];

  const topEstados = [...estadoData]
    .sort((a: any, b: any) => (Number(b.cantidad) || 0) - (Number(a.cantidad) || 0))
    .slice(0, 4);

  // Calcular total para porcentajes
  const totalEstados = estadoData.reduce((sum: number, item: any) => sum + item.cantidad, 0);

  // Calcular máximo para normalizar barras por estado (evitar 0 para no dividir por cero)
  const maxEstadoCantidad = estadoData.length > 0
    ? Math.max(1, ...estadoData.map((item: any) => Number(item.cantidad) || 0))
    : 1;

  // Preparar fondo para gráfico de pastel (conic-gradient) basado en estados
  let pieBackground = '';
  if (estadoData.length > 0 && totalEstados > 0) {
    let acumulado = 0;
    const segmentos: string[] = [];
    estadoData.forEach((item: any) => {
      const inicio = (acumulado / totalEstados) * 360;
      const fin = ((acumulado + item.cantidad) / totalEstados) * 360;
      segmentos.push(`${item.color} ${inicio}deg ${fin}deg`);
      acumulado += item.cantidad;
    });
    pieBackground = `conic-gradient(${segmentos.join(', ')})`;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#42A5F5]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  return (
    <div className="p-0 space-y-6">
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 p-5 sm:p-6 shadow-sm">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Dashboard de Obras
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mt-1">
          Vista general de avance, distribucion por estado y ubicacion territorial.
        </p>
      </div>

      {/* Estadísticas generales - Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Obras Totales */}
        <div className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-2xl shadow-md p-5 transition-transform hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold mb-1 leading-none">
                {stats?.estadisticas?.totalObras || 0}
              </div>
              <div className="text-sm opacity-90 font-medium">
                Obras Totales
              </div>
            </div>
            <Assignment className="text-5xl opacity-80" />
          </div>
        </div>
        {topEstados.map((item: any, index: number) => (
          <div
            key={`${item.estado}-${index}`}
            onClick={() => onEstadoClick && onEstadoClick(item.estado)}
            className="text-white rounded-2xl shadow-md p-5 transition-transform hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${item.color}, ${item.color}CC)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold mb-1 leading-none">
                  {item.cantidad}
                </div>
                <div className="text-sm opacity-90 font-medium">
                  {item.estado}
                </div>
              </div>
              {getEstadoIcon(item.estado)}
            </div>
          </div>
        ))}
      </div>

      {/* Mapa interactivo - Obras por provincia (República Dominicana) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center mb-2">
          <Public className="text-[#42A5F5] mr-2" />
          <h3 className="text-xl font-semibold text-slate-800">
            Obras por provincia – República Dominicana
          </h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Haz clic en un círculo para ver el detalle o ir a la lista de obras filtrada por provincia.
        </p>
        <DashboardMap
          obrasPorProvincia={obrasPorProvincia}
          onProvinciaClick={onProvinciaClick}
          height="420px"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Distribución por Estado */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <h3 className="text-xl font-semibold mb-4 text-slate-800">
            Distribución por Estado (Barras)
          </h3>
          {estadoData.length > 0 ? (
            <div className="flex flex-col">
              <div
                className="flex items-end justify-around gap-2 pb-2"
                style={{ minHeight: '200px' }}
              >
                {estadoData.map((item: any, index: number) => {
                  const cantidad = Number(item.cantidad) || 0;
                  const alturaPct = maxEstadoCantidad > 0 ? (cantidad / maxEstadoCantidad) * 100 : 0;
                  const porcentaje = totalEstados > 0 ? (cantidad / totalEstados) * 100 : 0;
                  const barHeight = Math.max(alturaPct, cantidad > 0 ? 4 : 0);
                  return (
                    <div
                      key={`${item.estado}-${index}`}
                      className="flex flex-col items-center flex-1 min-w-0 max-w-[120px]"
                    >
                      <div
                        className="w-full h-[200px] flex flex-col justify-end items-center"
                        title={`${item.estado}: ${cantidad} (${porcentaje.toFixed(1)}%)`}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onEstadoClick && onEstadoClick(item.estado)}
                          onKeyDown={(e) => e.key === 'Enter' && onEstadoClick && onEstadoClick(item.estado)}
                        className="w-full min-w-[24px] max-w-[48px] rounded-t-md transition-all duration-300 hover:opacity-90 cursor-pointer"
                          style={{
                            height: `${barHeight}%`,
                            backgroundColor: item.color,
                            minHeight: cantidad > 0 ? 6 : 0,
                          }}
                        />
                      </div>
                      <span className="mt-2 text-xs font-medium text-center break-words line-clamp-2 text-slate-700">
                        {item.estado}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {cantidad} ({porcentaje.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-48">
              <span className="text-slate-500">No hay datos para mostrar</span>
            </div>
          )}
        </div>

        {/* Gráfico de Pastel - Distribución por Estado */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <h3 className="text-xl font-semibold mb-4 text-slate-800">
            Distribución por Estado (Pastel)
          </h3>
          {estadoData.length > 0 && pieBackground ? (
            <div className="flex flex-col items-center mt-4">
              <div
                className="w-40 h-40 sm:w-48 sm:h-48 rounded-full shadow-inner"
                style={{ backgroundImage: pieBackground }}
              />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {estadoData.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1 truncate">{item.estado}</span>
                    <span className="text-slate-500 font-semibold text-xs">
                      {item.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-48">
              <span className="text-slate-500">No hay datos para mostrar</span>
            </div>
          )}
        </div>
      </div>

      {/* Obras por provincia y por municipio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-slate-800">
            <Place className="text-[#42A5F5] mr-2" />
            Obras por provincia
          </h3>
          {obrasPorProvincia.length > 0 ? (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {obrasPorProvincia.map((item, index) => (
                <div
                  key={index}
                  onClick={() => onProvinciaClick && onProvinciaClick(item.provincia)}
                  className={`flex justify-between items-center py-2.5 px-3 rounded-xl border ${onProvinciaClick ? 'cursor-pointer hover:bg-blue-50 border-blue-100' : 'border-slate-100'}`}
                >
                  <span className="font-medium text-slate-800">{item.provincia}</span>
                  <span className="text-[#42A5F5] font-semibold">{item.cantidad} obras</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-32 text-slate-500">
              No hay datos por provincia
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-slate-800">
            <LocationOn className="text-[#42A5F5] mr-2" />
            Obras por municipio (top 15)
          </h3>
          {obrasPorMunicipio.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-2">Municipio</th>
                    <th className="py-2 pr-2">Provincia</th>
                    <th className="py-2 text-right">Obras</th>
                  </tr>
                </thead>
                <tbody>
                  {obrasPorMunicipio.slice(0, 15).map((item, index) => (
                    <tr key={index} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-800">{item.municipio}</td>
                      <td className="py-2 pr-2 text-slate-600">{item.provincia}</td>
                      <td className="py-2 text-right font-semibold text-[#42A5F5]">{item.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex justify-center items-center h-32 text-slate-500">
              No hay datos por municipio
            </div>
          )}
        </div>
      </div>

      {/* Obras próximas a inaugurar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center mb-4">
          <LocationOn className="text-[#42A5F5] mr-2" />
          <h3 className="text-xl font-semibold text-slate-800">
            Obras Próximas a Inaugurar (este mes)
          </h3>
        </div>
        
        {proximasInaugurar.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl">
            No hay obras próximas a inaugurar este mes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Fecha Inauguración</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proximasInaugurar.map((obra) => (
                  <tr 
                    key={obra.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{obra.codigo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{obra.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                        style={{ backgroundColor: getEstadoColor(obra.estado) }}
                      >
                        {obra.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{obra.responsable || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {obra.fecha_inauguracion 
                        ? new Date(obra.fecha_inauguracion).toLocaleDateString('es-DO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsDashboard;
