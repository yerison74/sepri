import React, { useEffect, useRef, useState } from 'react';
import { Search } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { uploadAPI } from '../services/api';
import type { ObraEdicionOpcion } from '../types/database';
import { CA_FIELD, CA_LABEL } from '../constants/cargaArchivosUi';
import { BTN_PRIMARY } from '../constants/buttonStyles';

interface ObraEdicionBuscadorProps {
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  onSeleccionar: (opcion: ObraEdicionOpcion) => void;
  onBuscar: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const ObraEdicionBuscador: React.FC<ObraEdicionBuscadorProps> = ({
  busqueda,
  onBusquedaChange,
  onSeleccionar,
  onBuscar,
  loading = false,
  disabled,
}) => {
  const [sugerencias, setSugerencias] = useState<ObraEdicionOpcion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = busqueda.trim();
    if (term.length < 1) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const resp = await uploadAPI.buscarObrasParaEdicion(term, 12);
        setSugerencias(resp.data.data || []);
        setAbierto(true);
      } catch {
        setSugerencias([]);
        setAbierto(true);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor="obra-edicion-busqueda" className={CA_LABEL}>
        Buscar obra
      </label>
      <div ref={contenedorRef} className="relative">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              sx={{ fontSize: 20 }}
            />
            <input
              id="obra-edicion-busqueda"
              type="text"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              onFocus={() => busqueda.trim() && setAbierto(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onBuscar();
                }
              }}
              placeholder="SIGEDE, contrato, plantel, provincia o municipio…"
              disabled={disabled}
              className={`${CA_FIELD} pl-10 pr-10`}
              autoComplete="off"
            />
            {buscando && (
              <CircularProgress
                size={18}
                className="!absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
            )}
          </div>
          <button
            type="button"
            onClick={onBuscar}
            disabled={disabled || loading || !busqueda.trim()}
            className={`${BTN_PRIMARY} shrink-0`}
          >
            <Search className="mr-2" fontSize="small" />
            {loading ? 'Cargando…' : 'Buscar'}
          </button>
        </div>

        {abierto && busqueda.trim() && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-xl bg-white py-1 shadow-soft-lg border border-stone-100/80"
          >
            {sugerencias.length === 0 && !buscando && (
              <li className="px-3 py-2.5 text-sm text-stone-500">Sin resultados</li>
            )}
            {sugerencias.map((obra) => (
              <li key={obra.id} role="option">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-primary-light/30 transition-colors"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSeleccionar(obra);
                    setAbierto(false);
                  }}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {obra.sigede}
                    </span>
                    <span className="text-sm text-stone-700 line-clamp-1">{obra.nombre}</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {[
                      obra.contrato && `Contrato ${obra.contrato}`,
                      obra.provincia,
                      obra.municipio,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-stone-400">
        Escriba al menos un carácter para ver sugerencias. Busque por SIGEDE, contrato, nombre del
        plantel, provincia o municipio.
      </p>
    </div>
  );
};

export default ObraEdicionBuscador;
