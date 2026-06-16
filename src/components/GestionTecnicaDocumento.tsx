import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Description,
  Search,
  Save,
  Delete,
  Close,
  Add,
  KeyboardArrowDown,
  Check,
} from '@mui/icons-material';
import { gestionTecnicaDocumentoAPI } from '../services/api';
import type {
  Contratista,
  DocumentoTecnicoObra,
  MovimientoDocumentoTecnicoObra,
  ObraSigedeResumen,
} from '../types/database';
import { useAreas } from '../hooks/useAreas';
import { TIPOS_ADENDA } from '../constants/gestionTecnicaDocumento';

interface GestionTecnicaDocumentoProps {
  soloLectura?: boolean;
}

const inputClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 bg-white transition-all duration-150 focus:outline-none focus:border-[#42A5F5]/50 focus:ring-2 focus:ring-[#42A5F5]/10';

const selectTriggerClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white transition-all duration-150 outline-none focus:outline-none focus:border-[#42A5F5]/50 focus:ring-2 focus:ring-[#42A5F5]/10 flex items-center justify-between gap-2 text-left appearance-none';

const labelClass = 'text-xs font-medium text-slate-500';

const dropdownPanelClass =
  'absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl bg-white p-1 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12),0_4px_8px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60';

const dropdownListClass = 'sepri-dropdown-scroll max-h-48 overflow-y-auto overscroll-contain';

const dropdownItemClass =
  'w-full text-left px-3 py-2.5 mx-0.5 rounded-lg text-sm text-slate-700 bg-white cursor-pointer select-none transition-colors duration-100 hover:bg-slate-50 active:bg-slate-100 outline-none border-0 shadow-none appearance-none';

const dropdownItemActiveClass = 'bg-[#42A5F5]/10 text-[#1E88E5] font-medium hover:bg-[#42A5F5]/15';

function SelectPersonalizado({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccione…',
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const etiquetaSeleccionada = options.find((o) => o.value === value)?.label;

  return (
    <div className="space-y-1.5" ref={contenedorRef}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={abierto}
          onClick={() => !disabled && setAbierto((prev) => !prev)}
          className={`${selectTriggerClass} ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-slate-300'
          } ${abierto ? 'border-[#42A5F5]/50 ring-2 ring-[#42A5F5]/10' : ''}`}
        >
          <span className={`truncate ${etiquetaSeleccionada ? 'text-slate-800' : 'text-slate-400'}`}>
            {etiquetaSeleccionada || placeholder}
          </span>
          <KeyboardArrowDown
            sx={{ fontSize: 18 }}
            className={`shrink-0 text-slate-400 transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
          />
        </button>

        {abierto && (
          <div className={dropdownPanelClass} role="listbox">
            <ul className={dropdownListClass}>
              <li>
                <div
                  role="option"
                  aria-selected={!value}
                  tabIndex={0}
                  className={`${dropdownItemClass} ${!value ? dropdownItemActiveClass : 'text-slate-400'}`}
                  onClick={() => {
                    onChange('');
                    setAbierto(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange('');
                      setAbierto(false);
                    }
                  }}
                >
                  {placeholder}
                </div>
              </li>
              {options.map((opcion) => {
                const activa = value === opcion.value;
                return (
                  <li key={opcion.value}>
                    <div
                      role="option"
                      aria-selected={activa}
                      tabIndex={0}
                      className={`${dropdownItemClass} flex items-center justify-between gap-2 ${
                        activa ? dropdownItemActiveClass : ''
                      }`}
                      onClick={() => {
                        onChange(opcion.value);
                        setAbierto(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onChange(opcion.value);
                          setAbierto(false);
                        }
                      }}
                    >
                      <span className="truncate">{opcion.label}</span>
                      {activa && <Check sx={{ fontSize: 16 }} className="shrink-0 text-[#42A5F5]" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function AutocompleteBusqueda({
  value,
  onChange,
  placeholder,
  abierto,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  abierto: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          sx={{ fontSize: 18 }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} pl-9`}
          autoComplete="off"
        />
      </div>
      {abierto && (
        <div className={dropdownPanelClass}>
          <ul className={dropdownListClass}>{children}</ul>
        </div>
      )}
    </div>
  );
}

function ItemSeleccionado({
  titulo,
  subtitulo,
  onQuitar,
}: {
  titulo: string;
  subtitulo?: string | null;
  onQuitar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
      <div className="min-w-0">
        <p className="text-sm text-slate-800 truncate">{titulo}</p>
        {subtitulo && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitulo}</p>}
      </div>
      <button
        type="button"
        onClick={onQuitar}
        className="shrink-0 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-white/80"
      >
        Quitar
      </button>
    </div>
  );
}

const EMPTY_DOC_FORM = {
  solicitud: '',
  cuadrantes: '',
  tipo_adenda: '',
  no_adenda_solicitud: '',
  tipo_adenda_anterior: '',
  observacion: '',
  contratista_id: '' as string | null,
  id_sigede: [] as string[],
};

type ObraSigedeOpcion = {
  codigo?: string | null;
  nombre: string;
  contrato?: string | null;
  tipo_obra?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  distrito_minerd_sigede?: string | null;
};

function idSigedeDesdeObra(obra: ObraSigedeOpcion): string {
  return (obra.codigo || obra.distrito_minerd_sigede || '').trim();
}

function SelectTipoAdenda({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <SelectPersonalizado
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="Seleccione…"
      options={TIPOS_ADENDA.map((opcion) => ({ value: opcion, label: opcion }))}
    />
  );
}

function CampoDetalle({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800">{value != null && value !== '' ? value : '—'}</p>
    </div>
  );
}

function TablaObrasSigede({
  filas,
  soloLectura,
  onQuitar,
}: {
  filas: ObraSigedeResumen[];
  soloLectura?: boolean;
  onQuitar?: (id: string) => void;
}) {
  if (filas.length === 0) {
    return <p className="text-xs text-slate-400">Sin ID SIGEDE asignados.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-100">
            <th className="px-2 py-2 text-left font-medium text-slate-500">ID SIGEDE</th>
            <th className="px-2 py-2 text-left font-medium text-slate-500">Contrato</th>
            <th className="px-2 py-2 text-left font-medium text-slate-500">Plantel</th>
            <th className="px-2 py-2 text-left font-medium text-slate-500">Tipo</th>
            <th className="px-2 py-2 text-left font-medium text-slate-500">Provincia</th>
            <th className="px-2 py-2 text-left font-medium text-slate-500">Municipio</th>
            {!soloLectura && onQuitar && <th className="px-2 py-2 text-center font-medium text-slate-500" />}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id_sigede} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
              <td className="px-2 py-2 font-mono text-slate-700">{fila.id_sigede}</td>
              <td className="px-2 py-2 text-slate-600">{fila.encontrada ? fila.contrato || '—' : '—'}</td>
              <td className="px-2 py-2 text-slate-600">{fila.encontrada ? fila.plantel || '—' : '—'}</td>
              <td className="px-2 py-2 text-slate-600">{fila.encontrada ? fila.tipo || '—' : '—'}</td>
              <td className="px-2 py-2 text-slate-600">{fila.encontrada ? fila.provincia || '—' : '—'}</td>
              <td className="px-2 py-2 text-slate-600">{fila.encontrada ? fila.municipio || '—' : '—'}</td>
              {!soloLectura && onQuitar && (
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onQuitar(fila.id_sigede)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {filas.some((f) => !f.encontrada) && (
        <p className="text-xs text-amber-700/90 px-3 py-2 bg-amber-50/80 border-t border-amber-100/80">
          Algunos ID SIGEDE no coinciden con una obra en el sistema.
        </p>
      )}
    </div>
  );
}

const EMPTY_MOV_FORM = {
  fecha_solicitud: '',
  no_tramite: '',
  departamento: '',
  fecha_salida: '',
};

const GestionTecnicaDocumento: React.FC<GestionTecnicaDocumentoProps> = ({ soloLectura = false }) => {
  const { areas, loadingAreas } = useAreas();
  const [documentos, setDocumentos] = useState<DocumentoTecnicoObra[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoDocumentoTecnicoObra[]>([]);
  const [seleccionado, setSeleccionado] = useState<DocumentoTecnicoObra | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [docForm, setDocForm] = useState(EMPTY_DOC_FORM);
  const [obraBusqueda, setObraBusqueda] = useState('');
  const [obraOpciones, setObraOpciones] = useState<ObraSigedeOpcion[]>([]);
  const [obrasResumen, setObrasResumen] = useState<ObraSigedeResumen[]>([]);
  const [movForm, setMovForm] = useState(EMPTY_MOV_FORM);

  const [contratistaBusqueda, setContratistaBusqueda] = useState('');
  const [contratistaOpciones, setContratistaOpciones] = useState<Contratista[]>([]);
  const [contratistaSel, setContratistaSel] = useState<Contratista | null>(null);

  const cargarDocumentos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await gestionTecnicaDocumentoAPI.listarDocumentos({
        busqueda: busqueda.trim() || undefined,
      });
      setDocumentos(resp.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al cargar documentos');
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  }, [busqueda]);

  const cargarMovimientos = useCallback(async (solicitud: string) => {
    try {
      setLoadingMov(true);
      const resp = await gestionTecnicaDocumentoAPI.listarMovimientos(solicitud);
      setMovimientos(resp.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al cargar movimientos');
      setMovimientos([]);
    } finally {
      setLoadingMov(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => cargarDocumentos(), busqueda ? 350 : 0);
    return () => window.clearTimeout(t);
  }, [cargarDocumentos, busqueda]);

  useEffect(() => {
    const term = contratistaBusqueda.trim();
    if (term.length < 2) {
      setContratistaOpciones([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const resp = await gestionTecnicaDocumentoAPI.buscarContratistas(term, 8);
        setContratistaOpciones(resp.data.data || []);
      } catch {
        setContratistaOpciones([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [contratistaBusqueda]);

  const cargarResumenesSigede = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setObrasResumen([]);
      return;
    }
    try {
      const resp = await gestionTecnicaDocumentoAPI.resumenesSigede(ids);
      setObrasResumen(resp.data.data || []);
    } catch {
      setObrasResumen(ids.map((id) => ({ id_sigede: id, encontrada: false })));
    }
  }, []);

  useEffect(() => {
    const term = obraBusqueda.trim();
    if (term.length < 1) {
      setObraOpciones([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const resp = await gestionTecnicaDocumentoAPI.buscarObrasSigede(term, 10);
        setObraOpciones(resp.data.data || []);
      } catch {
        setObraOpciones([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [obraBusqueda]);

  useEffect(() => {
    cargarResumenesSigede(docForm.id_sigede);
  }, [docForm.id_sigede, cargarResumenesSigede]);

  const resetDocForm = () => {
    setDocForm(EMPTY_DOC_FORM);
    setObraBusqueda('');
    setObraOpciones([]);
    setObrasResumen([]);
    setContratistaSel(null);
    setContratistaBusqueda('');
    setEditandoId(null);
  };

  const cargarDocEnFormulario = (doc: DocumentoTecnicoObra) => {
    setDocForm({
      solicitud: doc.solicitud,
      cuadrantes: doc.cuadrantes || '',
      tipo_adenda: doc.tipo_adenda || '',
      no_adenda_solicitud:
        doc.no_adenda_solicitud != null ? String(doc.no_adenda_solicitud) : '',
      tipo_adenda_anterior: doc.tipo_adenda_anterior || '',
      observacion: doc.observacion || '',
      contratista_id: doc.contratista_id || null,
      id_sigede: [...(doc.id_sigede || [])],
    });
    setContratistaSel(doc.contratista || null);
    setObrasResumen(doc.obras_sigede || []);
    setEditandoId(doc.id);
  };

  const seleccionarDocumento = async (doc: DocumentoTecnicoObra) => {
    setSeleccionado(doc);
    setMovForm(EMPTY_MOV_FORM);
    await cargarMovimientos(doc.solicitud);
  };

  const agregarObraSigede = (obra: ObraSigedeOpcion) => {
    const id = idSigedeDesdeObra(obra);
    if (!id || docForm.id_sigede.includes(id)) return;
    setDocForm((prev) => ({ ...prev, id_sigede: [...prev.id_sigede, id] }));
    setObraBusqueda('');
    setObraOpciones([]);
  };

  const quitarSigede = (id: string) => {
    setDocForm((prev) => ({ ...prev, id_sigede: prev.id_sigede.filter((x) => x !== id) }));
  };

  const handleGuardarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (soloLectura) return;
    if (!docForm.solicitud.trim()) {
      setError('El nombre del solicitante es obligatorio');
      return;
    }
    if (docForm.no_adenda_solicitud !== '' && !/^\d+$/.test(docForm.no_adenda_solicitud)) {
      setError('No. adenda solicitud debe ser un número entero');
      return;
    }
    try {
      setGuardando(true);
      setError(null);
      const resp = await gestionTecnicaDocumentoAPI.guardarDocumento(
        {
          solicitud: docForm.solicitud,
          cuadrantes: docForm.cuadrantes,
          tipo_adenda: docForm.tipo_adenda || undefined,
          no_adenda_solicitud:
            docForm.no_adenda_solicitud === '' ? null : parseInt(docForm.no_adenda_solicitud, 10),
          tipo_adenda_anterior: docForm.tipo_adenda_anterior || undefined,
          observacion: docForm.observacion,
          contratista_id: contratistaSel?.id || docForm.contratista_id || null,
          id_sigede: docForm.id_sigede,
        },
        editandoId || undefined,
      );
      const guardado = resp.data.data;
      resetDocForm();
      await cargarDocumentos();
      if (guardado) {
        setSeleccionado(guardado);
        await cargarMovimientos(guardado.solicitud);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo guardar el documento');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarDocumento = async (doc: DocumentoTecnicoObra) => {
    if (soloLectura) return;
    if (!window.confirm(`¿Eliminar la solicitud "${doc.solicitud}" y todos sus movimientos?`)) return;
    try {
      await gestionTecnicaDocumentoAPI.eliminarDocumento(doc.id);
      if (seleccionado?.id === doc.id) {
        setSeleccionado(null);
        setMovimientos([]);
      }
      resetDocForm();
      await cargarDocumentos();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const handleGuardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (soloLectura || !seleccionado) return;
    try {
      setGuardando(true);
      setError(null);
      await gestionTecnicaDocumentoAPI.guardarMovimiento({
        solicitud: seleccionado.solicitud,
        fecha_solicitud: movForm.fecha_solicitud || null,
        no_tramite: movForm.no_tramite || null,
        departamento: movForm.departamento || null,
        fecha_salida: movForm.fecha_salida || null,
      });
      setMovForm(EMPTY_MOV_FORM);
      await cargarMovimientos(seleccionado.solicitud);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo registrar el movimiento');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarMovimiento = async (mov: MovimientoDocumentoTecnicoObra) => {
    if (soloLectura) return;
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    try {
      await gestionTecnicaDocumentoAPI.eliminarMovimiento(mov.id);
      if (seleccionado) await cargarMovimientos(seleccionado.solicitud);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo eliminar el movimiento');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-4 sm:px-6 shadow-sm shadow-slate-100">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 flex items-center gap-2.5">
          <Description className="text-[#42A5F5]" sx={{ fontSize: 28 }} />
          Gestión técnica de documento
        </h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Registre la información básica de cada solicitud y consulte los movimientos u oficios al seleccionar un documento.
        </p>
      </div>

      {soloLectura && (
        <div className="bg-amber-50/80 border border-amber-200/60 text-amber-800 px-4 py-3 rounded-xl text-sm">
          Solo visualización: no tienes permiso para crear, editar o eliminar registros.
        </div>
      )}

      {error && (
        <div className="bg-red-50/80 border border-red-200/60 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {!soloLectura && (
        <form
          onSubmit={handleGuardarDocumento}
          className="bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100 p-4 sm:p-6 space-y-5"
        >
          <h3 className="text-sm font-semibold text-slate-700 tracking-wide">
            {editandoId ? 'Editar documento' : 'Nuevo documento'}
          </h3>

          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Datos de la solicitud
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Solicitud (nombre del solicitante) *</label>
                  <input
                    type="text"
                    maxLength={75}
                    value={docForm.solicitud}
                    onChange={(e) => setDocForm((p) => ({ ...p, solicitud: e.target.value }))}
                    className={inputClass}
                    placeholder="Nombre de quien hace la solicitud"
                    disabled={!!editandoId}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Cuadrantes</label>
                  <input
                    type="text"
                    value={docForm.cuadrantes}
                    onChange={(e) => setDocForm((p) => ({ ...p, cuadrantes: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Adenda</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SelectTipoAdenda
                  id="tipo-adenda"
                  label="Tipo adenda"
                  value={docForm.tipo_adenda}
                  onChange={(value) => setDocForm((p) => ({ ...p, tipo_adenda: value }))}
                />
                <div className="space-y-1">
                  <label htmlFor="no-adenda-solicitud" className={labelClass}>
                    No. adenda solicitud
                  </label>
                  <input
                    id="no-adenda-solicitud"
                    type="number"
                    min={0}
                    step={1}
                    value={docForm.no_adenda_solicitud}
                    onChange={(e) => setDocForm((p) => ({ ...p, no_adenda_solicitud: e.target.value }))}
                    className={inputClass}
                    placeholder="Número entero"
                  />
                </div>
                <SelectTipoAdenda
                  id="tipo-adenda-anterior"
                  label="Tipo adenda anterior"
                  value={docForm.tipo_adenda_anterior}
                  onChange={(value) => setDocForm((p) => ({ ...p, tipo_adenda_anterior: value }))}
                />
                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <label className={labelClass}>Observación</label>
                  <textarea
                    value={docForm.observacion}
                    onChange={(e) => setDocForm((p) => ({ ...p, observacion: e.target.value }))}
                    className={`${inputClass} min-h-[72px] resize-y`}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Contratista y obras
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass}>Contratista</label>
                  {contratistaSel ? (
                    <ItemSeleccionado
                      titulo={contratistaSel.responsable}
                      subtitulo={contratistaSel.identificacion}
                      onQuitar={() => {
                        setContratistaSel(null);
                        setDocForm((p) => ({ ...p, contratista_id: null }));
                      }}
                    />
                  ) : (
                    <AutocompleteBusqueda
                      value={contratistaBusqueda}
                      onChange={setContratistaBusqueda}
                      placeholder="Escriba al menos 2 caracteres…"
                      abierto={contratistaOpciones.length > 0}
                    >
                      {contratistaOpciones.map((c) => (
                        <li key={c.id}>
                          <div
                            role="option"
                            aria-selected={false}
                            tabIndex={0}
                            className={dropdownItemClass}
                            onClick={() => {
                              setContratistaSel(c);
                              setDocForm((p) => ({ ...p, contratista_id: c.id }));
                              setContratistaBusqueda('');
                              setContratistaOpciones([]);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setContratistaSel(c);
                                setDocForm((p) => ({ ...p, contratista_id: c.id }));
                                setContratistaBusqueda('');
                                setContratistaOpciones([]);
                              }
                            }}
                          >
                            <span className="block truncate">{c.responsable}</span>
                            {c.identificacion && (
                              <span className="block text-xs text-slate-400 truncate mt-0.5">
                                {c.identificacion}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </AutocompleteBusqueda>
                  )}
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className={labelClass}>ID SIGEDE (obra)</label>
                  <AutocompleteBusqueda
                    value={obraBusqueda}
                    onChange={setObraBusqueda}
                    placeholder="Buscar por código, nombre o distrito SIGEDE…"
                    abierto={obraOpciones.length > 0}
                  >
                    {obraOpciones.map((obra, idx) => {
                      const id = idSigedeDesdeObra(obra);
                      const yaAsignada = docForm.id_sigede.includes(id);
                      return (
                        <li key={`${id}-${idx}`}>
                          <div
                            role="option"
                            aria-selected={false}
                            tabIndex={!id || yaAsignada ? -1 : 0}
                            className={`${dropdownItemClass} ${
                              !id || yaAsignada ? 'opacity-40 cursor-not-allowed hover:bg-white active:bg-white' : ''
                            }`}
                            onClick={() => {
                              if (!id || yaAsignada) return;
                              agregarObraSigede(obra);
                            }}
                            onKeyDown={(e) => {
                              if ((!id || yaAsignada) && (e.key === 'Enter' || e.key === ' ')) return;
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                agregarObraSigede(obra);
                              }
                            }}
                          >
                            <span className="flex items-baseline gap-1.5 min-w-0">
                              <span className="font-mono text-xs text-[#42A5F5] shrink-0">{id || '—'}</span>
                              <span className="text-slate-600 truncate">{obra.nombre}</span>
                            </span>
                            {(obra.contrato || obra.municipio) && (
                              <span className="block text-xs text-slate-400 truncate mt-0.5">
                                {[obra.contrato && `Contrato ${obra.contrato}`, obra.municipio]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            )}
                            {yaAsignada && (
                              <span className="block text-[11px] text-slate-400 mt-0.5">Ya asignada</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </AutocompleteBusqueda>
                  <div className="mt-3">
                    <TablaObrasSigede filas={obrasResumen} onQuitar={quitarSigede} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {editandoId && (
              <button
                type="button"
                onClick={resetDocForm}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar edición
              </button>
            )}
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#42A5F5] text-white rounded-xl hover:bg-[#1E88E5] disabled:opacity-50 text-sm font-medium shadow-sm shadow-blue-200/40 transition-colors"
            >
              <Save sx={{ fontSize: 18 }} />
              {guardando ? 'Guardando…' : editandoId ? 'Actualizar documento' : 'Registrar documento'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100 p-4 sm:p-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 18 }} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar solicitante, contratista, SIGEDE…"
              className={`${inputClass} pl-9`}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-slate-200 border-t-[#42A5F5]" />
            </div>
          ) : documentos.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">No hay documentos registrados.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 max-h-[420px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-100">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">Solicitante</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">Cuadrantes</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">Tipo adenda</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">No. adenda</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">Tipo adenda ant.</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">Contratista</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">SIGEDE</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">Observación</th>
                    {!soloLectura && (
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-slate-500">Acc.</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {documentos.map((doc) => {
                    const activo = seleccionado?.id === doc.id;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => seleccionarDocumento(doc)}
                        className={`cursor-pointer transition-colors ${
                          activo ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-slate-800">{doc.solicitud}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{doc.cuadrantes || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{doc.tipo_adenda || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs tabular-nums">
                          {doc.no_adenda_solicitud != null ? doc.no_adenda_solicitud : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{doc.tipo_adenda_anterior || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600 text-xs max-w-[120px] truncate" title={doc.contratista?.responsable || ''}>
                          {doc.contratista?.responsable || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs font-mono">
                          {(doc.id_sigede || []).join(', ') || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[140px] truncate" title={doc.observacion || ''}>
                          {doc.observacion || '—'}
                        </td>
                        {!soloLectura && (
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-0.5">
                              <button
                                type="button"
                                title="Editar"
                                onClick={() => cargarDocEnFormulario(doc)}
                                className="text-xs text-[#42A5F5] hover:text-[#1E88E5] px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                title="Eliminar"
                                onClick={() => handleEliminarDocumento(doc)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Delete sx={{ fontSize: 16 }} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100 p-4 sm:p-5 space-y-4 min-h-[280px]">
          {!seleccionado ? (
            <p className="text-slate-400 text-sm text-center py-16">
              Seleccione un documento de la lista para ver y registrar movimientos u oficios.
            </p>
          ) : (
            <>
              <div className="border-b border-slate-100 pb-4 space-y-3">
                <h3 className="text-base font-semibold text-slate-800">
                  {seleccionado.solicitud}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
                  <CampoDetalle label="Cuadrantes" value={seleccionado.cuadrantes} />
                  <CampoDetalle label="Tipo adenda" value={seleccionado.tipo_adenda} />
                  <CampoDetalle label="No. adenda" value={seleccionado.no_adenda_solicitud} />
                  <CampoDetalle label="Tipo adenda anterior" value={seleccionado.tipo_adenda_anterior} />
                  <CampoDetalle label="Contratista" value={seleccionado.contratista?.responsable} />
                  <CampoDetalle
                    label="SIGEDE"
                    value={(seleccionado.id_sigede || []).join(', ') || undefined}
                  />
                </div>

                {seleccionado.observacion && (
                  <p className="text-xs text-slate-600 bg-slate-50/60 rounded-xl px-3 py-2.5 border border-slate-100">
                    <span className="font-medium text-slate-400">Observación · </span>
                    {seleccionado.observacion}
                  </p>
                )}

                <div>
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Obras (SIGEDE)
                  </h4>
                  <TablaObrasSigede filas={seleccionado.obras_sigede || []} soloLectura />
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Movimientos u oficios
                </h4>

              {!soloLectura && (
                <form onSubmit={handleGuardarMovimiento} className="space-y-3 p-3.5 mb-4 bg-slate-50/60 rounded-xl border border-slate-100">
                  <p className="text-xs font-medium text-slate-500">Nuevo movimiento</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Fecha solicitud</label>
                      <input
                        type="date"
                        value={movForm.fecha_solicitud}
                        onChange={(e) => setMovForm((p) => ({ ...p, fecha_solicitud: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">No. trámite</label>
                      <input
                        type="text"
                        value={movForm.no_tramite}
                        onChange={(e) => setMovForm((p) => ({ ...p, no_tramite: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <SelectPersonalizado
                      id="mov-departamento"
                      label="Departamento"
                      value={movForm.departamento}
                      onChange={(v) => setMovForm((p) => ({ ...p, departamento: v }))}
                      disabled={loadingAreas}
                      placeholder="Seleccione área…"
                      options={areas.map((a) => ({ value: a.id, label: a.area }))}
                    />
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Fecha salida</label>
                      <input
                        type="date"
                        value={movForm.fecha_salida}
                        onChange={(e) => setMovForm((p) => ({ ...p, fecha_salida: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-[#42A5F5] text-white rounded-xl text-sm hover:bg-[#1E88E5] disabled:opacity-50 shadow-sm shadow-blue-200/30 transition-colors"
                  >
                    <Add sx={{ fontSize: 16 }} />
                    Agregar movimiento
                  </button>
                </form>
              )}

              {loadingMov ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-7 w-7 border-2 border-slate-200 border-t-[#42A5F5]" />
                </div>
              ) : movimientos.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin movimientos registrados.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">F. solicitud</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">No. trámite</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">Departamento</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">F. salida</th>
                        {!soloLectura && (
                          <th className="px-3 py-2.5 text-center text-xs font-medium text-slate-500" />
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {movimientos.map((mov) => (
                        <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2.5 text-slate-600 text-xs">{mov.fecha_solicitud?.slice(0, 10) || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600 text-xs">{mov.no_tramite || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600 text-xs">{mov.area?.area || mov.departamento || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600 text-xs">{mov.fecha_salida?.slice(0, 10) || '—'}</td>
                          {!soloLectura && (
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleEliminarMovimiento(mov)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Delete sx={{ fontSize: 16 }} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestionTecnicaDocumento;
