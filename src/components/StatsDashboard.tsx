import React, { useState, useEffect } from 'react';
import {
  Assignment,
  CheckCircle,
  Pause,
  TrendingUp,
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
  const [obrasPorResponsable, setObrasPorResponsable] = useState<any[]>([]);
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
      setObrasPorResponsable(data.obrasPorResponsable || []);
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

  // Preparar datos para visualización de estados
  const estadoData = stats?.estadisticas?.porEstado?.map((item: any) => ({
    estado: item.estado,
    cantidad: item.cantidad,
    color: getEstadoColor(item.estado)
  })) || [];

  // Calcular total para porcentajes
  const totalEstados = estadoData.reduce((sum: number, item: any) => sum + item.cantidad, 0);

  // Preparar datos para gráfico de barras (responsables - top 10)
  const barChartData = obrasPorResponsable
    .slice(0, 10)
    .map((item: any) => ({
      name: item.responsable?.length > 20 
        ? item.responsable.substring(0, 20) + '...' 
        : item.responsable || 'Sin responsable',
      cantidad: item.cantidad,
      fullName: item.responsable
    }));

  // Calcular máximo para normalizar barras
  const maxCantidad = barChartData.length > 0 
    ? Math.max(...barChartData.map((item: any) => item.cantidad))
    : 1;

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

  const activa = stats?.estadisticas?.porEstado?.find((e: any) => e.estado === 'ACTIVA');
  const inaugurada = stats?.estadisticas?.porEstado?.find((e: any) => e.estado === 'INAUGURADA');
  const terminada = stats?.estadisticas?.porEstado?.find((e: any) => e.estado === 'TERMINADA');
  const detenida = stats?.estadisticas?.porEstado?.find((e: any) => e.estado === 'DETENIDA');

  return (
    <div className="p-0">
      <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-[#42A5F5]">
        Dashboard de Obras
      </h2>

      {/* Estadísticas generales - Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {/* Obras Totales */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg shadow-lg p-6 transition-transform hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold mb-1">
                {stats?.estadisticas?.totalObras || 0}
              </div>
              <div className="text-sm opacity-90">
                Obras Totales
              </div>
            </div>
            <Assignment className="text-5xl opacity-80" />
          </div>
        </div>

        {/* Activas */}
        <div 
          onClick={() => onEstadoClick && onEstadoClick('ACTIVA')}
          className="bg-gradient-to-br from-cyan-400 to-cyan-600 text-white rounded-lg shadow-lg p-6 transition-transform hover:scale-105 hover:shadow-xl cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold mb-1">
                {activa?.cantidad || 0}
              </div>
              <div className="text-sm opacity-90">
                Activas
              </div>
            </div>
            <TrendingUp className="text-5xl opacity-80" />
          </div>
        </div>

        {/* Inauguradas */}
        <div 
          onClick={() => onEstadoClick && onEstadoClick('INAUGURADA')}
          className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg shadow-lg p-6 transition-transform hover:scale-105 hover:shadow-xl cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold mb-1">
                {inaugurada?.cantidad || 0}
              </div>
              <div className="text-sm opacity-90">
                Inauguradas
              </div>
            </div>
            <CheckCircle className="text-5xl opacity-80" />
          </div>
        </div>

        {/* Terminadas */}
        <div 
          onClick={() => onEstadoClick && onEstadoClick('TERMINADA')}
          className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-lg shadow-lg p-6 transition-transform hover:scale-105 hover:shadow-xl cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold mb-1">
                {terminada?.cantidad || 0}
              </div>
              <div className="text-sm opacity-90">
                Terminadas
              </div>
            </div>
            <CheckCircle className="text-5xl opacity-80" />
          </div>
        </div>

        {/* Detenidas */}
        <div 
          onClick={() => onEstadoClick && onEstadoClick('DETENIDA')}
          className="bg-gradient-to-br from-yellow-400 to-orange-600 text-white rounded-lg shadow-lg p-6 transition-transform hover:scale-105 hover:shadow-xl cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold mb-1">
                {detenida?.cantidad || 0}
              </div>
              <div className="text-sm opacity-90">
                Detenidas
              </div>
            </div>
            <Pause className="text-5xl opacity-80" />
          </div>
        </div>
      </div>

      {/* Mapa interactivo - Obras por provincia (República Dominicana) */}
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <Public className="text-[#42A5F5] mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">
            Obras por provincia – República Dominicana
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Haz clic en un círculo para ver el detalle o ir a la lista de obras filtrada por provincia.
        </p>
        <DashboardMap
          obrasPorProvincia={obrasPorProvincia}
          onProvinciaClick={onProvinciaClick}
          height="420px"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Pastel - Distribución por Estado */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            Distribución por Estado
          </h3>
          {estadoData.length > 0 ? (
            <div className="mt-4 space-y-4">
              {estadoData.map((item: any, index: number) => {
                const porcentaje = totalEstados > 0 ? (item.cantidad / totalEstados) * 100 : 0;
                return (
                  <div key={index} className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">
                          {item.estado}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 font-semibold">
                        {item.cantidad} ({porcentaje.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${porcentaje}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-center items-center h-48">
              <span className="text-gray-500">No hay datos para mostrar</span>
            </div>
          )}
        </div>

        {/* Gráfico de Barras - Top Responsables */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            Top 10 Responsables / Contratistas
          </h3>
          {barChartData.length > 0 ? (
            <div className="mt-4 space-y-4">
              {barChartData.map((item: any, index: number) => {
                const porcentaje = maxCantidad > 0 ? (item.cantidad / maxCantidad) * 100 : 0;
                return (
                  <div key={index} className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span 
                        className="text-sm font-medium flex-1 overflow-hidden text-ellipsis whitespace-nowrap mr-4"
                        title={item.fullName}
                      >
                        {item.name}
                      </span>
                      <span className="text-sm text-gray-600 font-semibold min-w-[60px] text-right">
                        {item.cantidad} {item.cantidad === 1 ? 'obra' : 'obras'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full bg-[#42A5F5] transition-all duration-300"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-center items-center h-48">
              <span className="text-gray-500">No hay datos para mostrar</span>
            </div>
          )}
        </div>
      </div>

      {/* Obras por provincia y por municipio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Place className="text-[#42A5F5] mr-2" />
            Obras por provincia
          </h3>
          {obrasPorProvincia.length > 0 ? (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {obrasPorProvincia.map((item, index) => (
                <div
                  key={index}
                  onClick={() => onProvinciaClick && onProvinciaClick(item.provincia)}
                  className={`flex justify-between items-center py-2 px-3 rounded-lg border ${onProvinciaClick ? 'cursor-pointer hover:bg-blue-50 border-blue-100' : 'border-gray-100'}`}
                >
                  <span className="font-medium text-gray-800">{item.provincia}</span>
                  <span className="text-[#42A5F5] font-semibold">{item.cantidad} obras</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-32 text-gray-500">
              No hay datos por provincia
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <LocationOn className="text-[#42A5F5] mr-2" />
            Obras por municipio (top 15)
          </h3>
          {obrasPorMunicipio.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-2">Municipio</th>
                    <th className="py-2 pr-2">Provincia</th>
                    <th className="py-2 text-right">Obras</th>
                  </tr>
                </thead>
                <tbody>
                  {obrasPorMunicipio.slice(0, 15).map((item, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-2 font-medium text-gray-800">{item.municipio}</td>
                      <td className="py-2 pr-2 text-gray-600">{item.provincia}</td>
                      <td className="py-2 text-right font-semibold text-[#42A5F5]">{item.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex justify-center items-center h-32 text-gray-500">
              No hay datos por municipio
            </div>
          )}
        </div>
      </div>

      {/* Obras próximas a inaugurar */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <LocationOn className="text-[#42A5F5] mr-2" />
          <h3 className="text-xl font-semibold">
            Obras Próximas a Inaugurar (este mes)
          </h3>
        </div>
        
        {proximasInaugurar.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
            No hay obras próximas a inaugurar este mes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-[#42A5F5]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Fecha Inauguración</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proximasInaugurar.map((obra) => (
                  <tr 
                    key={obra.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{obra.codigo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{obra.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                        style={{ backgroundColor: getEstadoColor(obra.estado) }}
                      >
                        {obra.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{obra.responsable || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
