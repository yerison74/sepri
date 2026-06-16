import React, { useState } from 'react';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import AutocompleteInput from './AutocompleteInput';
import {
  REPORTE_OBRAS_FILTRO_GRUPOS,
  TIPO_OBRA_OPCIONES,
  contarFiltrosActivos,
  type ReporteObrasFiltrosState,
  type ObraFiltroCampoDef,
} from '../constants/obraFiltrosReporte';

interface ReporteObrasFiltrosProps {
  filters: ReporteObrasFiltrosState;
  onChange: (next: ReporteObrasFiltrosState) => void;
  estadosDisponibles: string[];
  searchSugerencias: string[];
  responsableSugerencias: string[];
  loadingSearchSugerencias: boolean;
  loadingResponsableSugerencias: boolean;
}

const inputClassName =
  'px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent w-full text-sm';

const ReporteObrasFiltros: React.FC<ReporteObrasFiltrosProps> = ({
  filters,
  onChange,
  estadosDisponibles,
  searchSugerencias,
  responsableSugerencias,
  loadingSearchSugerencias,
  loadingResponsableSugerencias,
}) => {
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({
    PLANTEL: true,
  });

  const setField = (key: keyof ReporteObrasFiltrosState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleGrupo = (label: string) => {
    setGruposAbiertos((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderCampo = (campo: ObraFiltroCampoDef) => {
    if (campo.tipo === 'dateRange' && campo.hastaKey) {
      return (
        <div key={String(campo.key)} className="md:col-span-2 space-y-1">
          <span className="block text-xs font-medium text-slate-600">{campo.label}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Desde</label>
              <input
                type="date"
                value={String(filters[campo.key] ?? '')}
                onChange={(e) => setField(campo.key, e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Hasta</label>
              <input
                type="date"
                value={String(filters[campo.hastaKey] ?? '')}
                onChange={(e) => setField(campo.hastaKey!, e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>
        </div>
      );
    }

    if (campo.tipo === 'select' && campo.selectKey === 'estado') {
      return (
        <div key={String(campo.key)} className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">{campo.label}</label>
          <select
            value={filters.estado}
            onChange={(e) => setField('estado', e.target.value)}
            className={inputClassName}
          >
            <option value="">Todos</option>
            {estadosDisponibles.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (campo.tipo === 'select' && campo.selectKey === 'tipo_obra') {
      return (
        <div key={String(campo.key)} className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">{campo.label}</label>
          <select
            value={filters.tipo_obra}
            onChange={(e) => setField('tipo_obra', e.target.value)}
            className={inputClassName}
          >
            <option value="">Todos</option>
            {TIPO_OBRA_OPCIONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      );
    }

    const inputType = campo.tipo === 'number' ? 'text' : 'text';
    const placeholder =
      campo.tipo === 'number' ? 'Valor numérico exacto' : 'Contiene…';

    return (
      <div key={String(campo.key)} className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">{campo.label}</label>
        <input
          type={inputType}
          value={String(filters[campo.key] ?? '')}
          onChange={(e) => setField(campo.key, e.target.value)}
          placeholder={placeholder}
          className={inputClassName}
        />
      </div>
    );
  };

  const activos = contarFiltrosActivos(filters);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Filtros</h3>
        {activos > 0 && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {activos} filtro(s) activo(s)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Búsqueda general</label>
          <AutocompleteInput
            value={filters.search}
            onChange={(v) => setField('search', v)}
            options={searchSugerencias}
            loading={loadingSearchSugerencias}
            placeholder="Nombre, código, contrato, estado…"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Responsable / Contratista</label>
          <AutocompleteInput
            value={filters.responsable}
            onChange={(v) => setField('responsable', v)}
            options={responsableSugerencias}
            loading={loadingResponsableSugerencias}
            placeholder="Nombre del contratista"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2 space-y-2">
        {REPORTE_OBRAS_FILTRO_GRUPOS.map((grupo) => {
          const abierto = gruposAbiertos[grupo.label] ?? false;
          const camposActivos = grupo.campos.filter((c) => {
            if (c.tipo === 'dateRange' && c.hastaKey) {
              return Boolean(filters[c.key] || filters[c.hastaKey]);
            }
            return Boolean(filters[c.key]);
          }).length;

          return (
            <div key={grupo.label} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGrupo(grupo.label)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left"
              >
                <span className="text-sm font-semibold text-slate-700">
                  {grupo.label}
                  {camposActivos > 0 && (
                    <span className="ml-2 text-xs font-normal text-[#42A5F5]">
                      ({camposActivos} activo{camposActivos !== 1 ? 's' : ''})
                    </span>
                  )}
                </span>
                {abierto ? (
                  <ExpandLess className="text-slate-500" fontSize="small" />
                ) : (
                  <ExpandMore className="text-slate-500" fontSize="small" />
                )}
              </button>
              {abierto && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grupo.campos.map((campo) => renderCampo(campo))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReporteObrasFiltros;
