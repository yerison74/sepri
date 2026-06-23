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
  Upload,
  Download,
  ExpandLess,
  ExpandMore,
  FolderOpen,
  Article,
  SwapHoriz,
  NoteAdd,
  InfoOutlined,
  CheckCircleOutline,
  ErrorOutline,
} from '@mui/icons-material';
import { descargarBlob } from '../utils/gestionTecnicaDocumentoExcel';
import { gestionTecnicaDocumentoAPI } from '../services/api';
import type {
  Contratista,
  DocumentoTecnicoObra,
  MovimientoDocumentoTecnicoObra,
  ObraSigedeResumen,
} from '../types/database';
import { useAreas } from '../hooks/useAreas';
import { useAuth } from '../context/AuthContext';
import { TIPOS_ADENDA, ESTATUS_MOVIMIENTO_DOCUMENTO, formatMontoDOP, parseMontoDOP, montoFormDesdeNumero, esMontoValido, esCodigoAdendaValido, normalizarCodigoAdenda, esEstatusMovimientoValido } from '../constants/gestionTecnicaDocumento';
import { validarMovimientoDocumento } from '../utils/validarMovimientoDocumento';
import SeccionColapsable from './ui/SeccionColapsable';
import ModuloPageHeader from './ui/ModuloPageHeader';
import SepriListCard from './ui/SepriListCard';
import {
  GT_PAGE,
  GT_STACK,
  GT_SECTION,
  GT_LIST_SCROLL,
  GT_ALERTA_INFO,
  GT_ALERTA_OK,
  GT_ALERTA_ERROR,
  GT_BLOQUE_FORM,
  GT_BLOQUE_FORM_ACTIVO,
  GT_BLOQUE_TITULO,
  GT_TABLA,
  GT_TABLA_HEAD,
  GT_TABLA_TH,
  GT_TABLA_TD,
  GT_TARJETA_DETALLE,
  GT_TARJETA_DETALLE_ACCENT,
  GT_VACIO,
  GT_BADGE,
  GT_SUB_BLOQUE,
  SEPRI_FIELD_SHADOW,
} from '../constants/gestionTecnicaDocumentoUi';
import { SEPRI_INSET } from '../constants/sepriSurfaces';
import {
  BTN_PRIMARY,
  BTN_PRIMARY_SM,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  BTN_LINK,
  BTN_ICON,
} from '../constants/buttonStyles';

interface GestionTecnicaDocumentoProps {
  soloLectura?: boolean;
}

const inputClass =
  `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 transition-all duration-150 outline-none ${SEPRI_FIELD_SHADOW}`;

const selectTriggerClass =
  `w-full px-3 py-2.5 rounded-xl text-sm bg-white border-0 transition-all duration-150 outline-none flex items-center justify-between gap-2 text-left appearance-none ${SEPRI_FIELD_SHADOW}`;

const labelClass = 'text-xs font-medium text-stone-400';

const dropdownPanelClass =
  'absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl bg-white p-1 shadow-soft-lg backdrop-blur-sm';

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
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50/80' : 'cursor-pointer hover:shadow-[0_2px_6px_-2px_rgba(15,23,42,0.08)]'
          } ${abierto ? SEPRI_FIELD_SHADOW : ''}`}
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
    <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl ${SEPRI_INSET}`}>
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
  monto_contrato_base: '',
  tipo_adenda_anterior: '',
  numero_adenda_anterior: '',
  monto_adenda_anterior: '',
  tipo_adenda: '',
  numero_adenda_actual: '',
  no_adenda_solicituda: '',
  monto_adenda_solicitada: '',
  monto_total: '',
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

function BloqueFormulario({
  titulo,
  descripcion,
  activo,
  children,
}: {
  titulo: string;
  descripcion?: string;
  activo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={activo ? GT_BLOQUE_FORM_ACTIVO : GT_BLOQUE_FORM}>
      <div>
        <p className={GT_BLOQUE_TITULO}>{titulo}</p>
        {descripcion && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{descripcion}</p>}
      </div>
      {children}
    </div>
  );
}

function BloqueDetalle({
  titulo,
  accent,
  children,
  className = '',
}: {
  titulo?: string;
  accent?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${accent ? GT_TARJETA_DETALLE_ACCENT : GT_TARJETA_DETALLE} ${className}`.trim()}>
      {titulo && <p className={`${GT_BLOQUE_TITULO} mb-3`}>{titulo}</p>}
      {children}
    </div>
  );
}

function EstadoVacio({ children }: { children: React.ReactNode }) {
  return (
    <div className={GT_VACIO}>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}

function CampoDetalle({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value != null && value !== '' ? value : '—'}</p>
    </div>
  );
}

function CampoDetalleMonto({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: number | null;
  className?: string;
}) {
  return <CampoDetalle label={label} value={formatMontoDOP(value)} className={className} />;
}

function InputMontoDOP({
  id,
  label,
  value,
  onChange,
  className = '',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
          RD$
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pl-11 tabular-nums`}
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

function InputCodigoAdenda({
  id,
  label,
  value,
  onChange,
  className = '',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="text"
        maxLength={9}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} font-mono tabular-nums`}
        placeholder="1234-5678"
        title="Formato: 1 a 4 dígitos, guion, 1 a 4 dígitos"
      />
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
    <div className={`overflow-x-auto rounded-xl ${SEPRI_INSET}`}>
      <table className={`${GT_TABLA} text-xs`}>
        <thead className={GT_TABLA_HEAD}>
          <tr>
            <th className={GT_TABLA_TH}>ID SIGEDE</th>
            <th className={GT_TABLA_TH}>Contrato</th>
            <th className={GT_TABLA_TH}>Plantel</th>
            <th className={GT_TABLA_TH}>Tipo</th>
            <th className={GT_TABLA_TH}>Provincia</th>
            <th className={GT_TABLA_TH}>Municipio</th>
            {!soloLectura && onQuitar && <th className={`${GT_TABLA_TH} text-center`} />}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id_sigede}>
              <td className={`${GT_TABLA_TD} font-mono text-slate-700`}>{fila.id_sigede}</td>
              <td className={GT_TABLA_TD}>{fila.encontrada ? fila.contrato || '—' : '—'}</td>
              <td className={GT_TABLA_TD}>{fila.encontrada ? fila.plantel || '—' : '—'}</td>
              <td className={GT_TABLA_TD}>{fila.encontrada ? fila.tipo || '—' : '—'}</td>
              <td className={GT_TABLA_TD}>{fila.encontrada ? fila.provincia || '—' : '—'}</td>
              <td className={GT_TABLA_TD}>{fila.encontrada ? fila.municipio || '—' : '—'}</td>
              {!soloLectura && onQuitar && (
                <td className={`${GT_TABLA_TD} text-center`}>
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
        <p className="text-xs text-amber-700/80 px-3 py-2 bg-amber-50/60 shadow-[0_-1px_0_rgba(180,83,9,0.06)]">
          Algunos ID SIGEDE no coinciden con una obra en el sistema.
        </p>
      )}
    </div>
  );
}

const EMPTY_MOV_FORM = {
  fecha_solicitud: '',
  fecha_entrada: '',
  no_tramite: '',
  oficio: '',
  estatus: '',
  departamento: '',
  fecha_salida: '',
  observaciones: '',
};

function BadgeEstatusMovimiento({ estatus }: { estatus?: string | null }) {
  if (!estatus) return <span className="text-slate-400">—</span>;
  const clases =
    estatus === 'Certificada'
      ? 'bg-emerald-50/90 text-emerald-700'
      : estatus === 'Detenida'
        ? 'bg-amber-50/90 text-amber-800'
        : 'bg-blue-50/90 text-blue-600';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg text-[11px] font-medium shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${clases}`}>
      {estatus}
    </span>
  );
}

const GestionTecnicaDocumento: React.FC<GestionTecnicaDocumentoProps> = ({ soloLectura = false }) => {
  const { user } = useAuth();
  const { areas, loadingAreas } = useAreas();
  const [documentos, setDocumentos] = useState<DocumentoTecnicoObra[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoDocumentoTecnicoObra[]>([]);
  const [seleccionado, setSeleccionado] = useState<DocumentoTecnicoObra | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const inputImportRef = useRef<HTMLInputElement>(null);
  const formularioRef = useRef<HTMLFormElement>(null);
  const movFormularioRef = useRef<HTMLFormElement>(null);

  const [docForm, setDocForm] = useState(EMPTY_DOC_FORM);
  const [obraBusqueda, setObraBusqueda] = useState('');
  const [obraOpciones, setObraOpciones] = useState<ObraSigedeOpcion[]>([]);
  const [obrasResumen, setObrasResumen] = useState<ObraSigedeResumen[]>([]);
  const [movForm, setMovForm] = useState(EMPTY_MOV_FORM);
  const [editandoMovId, setEditandoMovId] = useState<string | null>(null);

  const [contratistaBusqueda, setContratistaBusqueda] = useState('');
  const [contratistaOpciones, setContratistaOpciones] = useState<Contratista[]>([]);
  const [contratistaSel, setContratistaSel] = useState<Contratista | null>(null);

  const [secFormDoc, setSecFormDoc] = useState(false);
  const [secDocumentos, setSecDocumentos] = useState(true);
  const [secDetalle, setSecDetalle] = useState(true);
  const [secMovimientos, setSecMovimientos] = useState(true);
  const [secFormMov, setSecFormMov] = useState(false);
  const [secDetalleSigede, setSecDetalleSigede] = useState(false);

  useEffect(() => {
    if (editandoId) setSecFormDoc(true);
  }, [editandoId]);

  useEffect(() => {
    if (editandoMovId) setSecFormMov(true);
  }, [editandoMovId]);

  useEffect(() => {
    if (!seleccionado) return;
    const filas =
      editandoId === seleccionado.id
        ? obrasResumen
        : seleccionado.obras_sigede || [];
    setSecDetalleSigede(filas.length > 0);
  }, [seleccionado?.id, editandoId, obrasResumen, seleccionado?.obras_sigede]);

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
    setSecFormDoc(false);
  };

  const resetMovForm = () => {
    setMovForm(EMPTY_MOV_FORM);
    setEditandoMovId(null);
    setSecFormMov(false);
  };

  const cargarMovEnFormulario = (mov: MovimientoDocumentoTecnicoObra) => {
    setMovForm({
      fecha_solicitud: mov.fecha_solicitud?.slice(0, 10) || '',
      fecha_entrada: mov.fecha_entrada?.slice(0, 10) || '',
      no_tramite: mov.no_tramite || '',
      oficio: mov.oficio || '',
      estatus: mov.estatus || '',
      departamento: mov.departamento || '',
      fecha_salida: mov.fecha_salida?.slice(0, 10) || '',
      observaciones: mov.observaciones || '',
    });
    setEditandoMovId(mov.id);
    setSecFormMov(true);
    movFormularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const seleccionarMovimiento = (mov: MovimientoDocumentoTecnicoObra) => {
    if (soloLectura) return;
    cargarMovEnFormulario(mov);
  };

  const cargarDocEnFormulario = (doc: DocumentoTecnicoObra) => {
    setDocForm({
      solicitud: doc.solicitud,
      cuadrantes: doc.cuadrantes || '',
      monto_contrato_base: montoFormDesdeNumero(doc.monto_contrato_base),
      tipo_adenda_anterior: doc.tipo_adenda_anterior || '',
      numero_adenda_anterior: doc.numero_adenda_anterior || '',
      monto_adenda_anterior: montoFormDesdeNumero(doc.monto_adenda_anterior),
      tipo_adenda: doc.tipo_adenda || '',
      numero_adenda_actual: doc.numero_adenda_actual || '',
      no_adenda_solicituda:
        doc.no_adenda_solicituda != null ? String(doc.no_adenda_solicituda) : '',
      monto_adenda_solicitada: montoFormDesdeNumero(doc.monto_adenda_solicitada),
      monto_total: montoFormDesdeNumero(doc.monto_total),
      observacion: doc.observacion || '',
      contratista_id: doc.contratista_id || null,
      id_sigede: [...(doc.id_sigede || [])],
    });
    setContratistaSel(doc.contratista || null);
    setObrasResumen(doc.obras_sigede || []);
    setEditandoId(doc.id);
  };

  const seleccionarDocumento = async (doc: DocumentoTecnicoObra, opciones?: { editar?: boolean }) => {
    setSeleccionado(doc);
    resetMovForm();
    setSecDetalle(true);
    setSecMovimientos(true);
    if (opciones?.editar && !soloLectura) {
      cargarDocEnFormulario(doc);
      setSecFormDoc(true);
    }
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
    if (docForm.no_adenda_solicituda !== '' && !/^\d+$/.test(docForm.no_adenda_solicituda)) {
      setError('No. adendas (solicituda) debe ser un número entero');
      return;
    }
    if (!esCodigoAdendaValido(docForm.numero_adenda_anterior)) {
      setError('Código adenda anterior: use formato 1234-5678 (1 a 4 dígitos, guion, 1 a 4 dígitos)');
      return;
    }
    if (!esCodigoAdendaValido(docForm.numero_adenda_actual)) {
      setError('Código adenda actual: use formato 1234-5678 (1 a 4 dígitos, guion, 1 a 4 dígitos)');
      return;
    }
    const camposMonto = [
      ['Monto contrato base', docForm.monto_contrato_base],
      ['Monto adenda anterior', docForm.monto_adenda_anterior],
      ['Monto adenda solicitada', docForm.monto_adenda_solicitada],
      ['Monto total', docForm.monto_total],
    ] as const;
    for (const [nombre, valor] of camposMonto) {
      if (!esMontoValido(valor)) {
        setError(`${nombre} debe ser un monto válido en pesos dominicanos`);
        return;
      }
    }
    try {
      setGuardando(true);
      setError(null);
      const resp = await gestionTecnicaDocumentoAPI.guardarDocumento(
        {
          solicitud: docForm.solicitud,
          cuadrantes: docForm.cuadrantes,
          monto_contrato_base: parseMontoDOP(docForm.monto_contrato_base),
          tipo_adenda_anterior: docForm.tipo_adenda_anterior || undefined,
          numero_adenda_anterior: normalizarCodigoAdenda(docForm.numero_adenda_anterior),
          monto_adenda_anterior: parseMontoDOP(docForm.monto_adenda_anterior),
          tipo_adenda: docForm.tipo_adenda || undefined,
          numero_adenda_actual: normalizarCodigoAdenda(docForm.numero_adenda_actual),
          no_adenda_solicituda:
            docForm.no_adenda_solicituda === ''
              ? null
              : parseInt(docForm.no_adenda_solicituda, 10),
          monto_adenda_solicitada: parseMontoDOP(docForm.monto_adenda_solicitada),
          monto_total: parseMontoDOP(docForm.monto_total),
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
        if (!soloLectura) {
          cargarDocEnFormulario(guardado);
        }
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

    const payload = {
      fecha_solicitud: movForm.fecha_solicitud || null,
      fecha_entrada: movForm.fecha_entrada || null,
      no_tramite: movForm.no_tramite || null,
      oficio: movForm.oficio || null,
      estatus: movForm.estatus || null,
      departamento: movForm.departamento || null,
      fecha_salida: movForm.fecha_salida || null,
      observaciones: movForm.observaciones || null,
    };
    if (!esEstatusMovimientoValido(movForm.estatus)) {
      setError('Estatus debe ser: En Proceso, Detenida o Certificada');
      return;
    }
    const errorValidacion = validarMovimientoDocumento(movimientos, payload, editandoMovId || undefined);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      if (editandoMovId) {
        await gestionTecnicaDocumentoAPI.actualizarMovimiento(editandoMovId, {
          solicitud: seleccionado.solicitud,
          ...payload,
        });
      } else {
        const nombreUsuario = user
          ? [user.nombre, user.apellido].filter(Boolean).join(' ').trim()
          : '';
        await gestionTecnicaDocumentoAPI.guardarMovimiento({
          solicitud: seleccionado.solicitud,
          ...payload,
          usuario: nombreUsuario || undefined,
        });
      }
      resetMovForm();
      await cargarMovimientos(seleccionado.solicitud);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          (editandoMovId ? 'No se pudo actualizar el movimiento' : 'No se pudo registrar el movimiento'),
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarMovimiento = async (mov: MovimientoDocumentoTecnicoObra) => {
    if (soloLectura) return;
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    try {
      await gestionTecnicaDocumentoAPI.eliminarMovimiento(mov.id);
      if (editandoMovId === mov.id) resetMovForm();
      if (seleccionado) await cargarMovimientos(seleccionado.solicitud);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo eliminar el movimiento');
    }
  };

  const handleExportarExcel = async () => {
    try {
      setExportando(true);
      setError(null);
      setMensajeExito(null);
      const resp = await gestionTecnicaDocumentoAPI.exportarExcel({
        busqueda: busqueda.trim() || undefined,
      });
      const fecha = new Date().toISOString().split('T')[0];
      descargarBlob(resp.data, `documentos-tecnicos-${fecha}.xlsx`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo exportar el Excel');
    } finally {
      setExportando(false);
    }
  };

  const handleDescargarPlantilla = async () => {
    try {
      setError(null);
      const resp = await gestionTecnicaDocumentoAPI.descargarPlantillaExcel();
      descargarBlob(resp.data, 'plantilla-documentos-tecnicos.xlsx');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo descargar la plantilla');
    }
  };

  const handleImportarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || soloLectura) return;

    try {
      setImportando(true);
      setError(null);
      setMensajeExito(null);
      const resp = await gestionTecnicaDocumentoAPI.importarExcel(file);
      const r = resp.data.data;
      const partes = [
        `${r.documentosCreados} documento(s) creado(s)`,
        r.documentosActualizados > 0 ? `${r.documentosActualizados} actualizado(s)` : '',
        `${r.movimientosCreados} movimiento(s) registrado(s)`,
      ].filter(Boolean);
      let msg = `Importación completada: ${partes.join(', ')}.`;
      if (r.errores.length > 0) {
        msg += ` ${r.errores.length} advertencia(s): ${r.errores.slice(0, 3).join(' · ')}`;
        if (r.errores.length > 3) msg += ` … (+${r.errores.length - 3} más)`;
      }
      setMensajeExito(msg);
      await cargarDocumentos();
      if (seleccionado) await cargarMovimientos(seleccionado.solicitud);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo importar el Excel');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className={GT_PAGE}>
      <ModuloPageHeader
        icon={<Description sx={{ fontSize: 22 }} />}
        title="Gestión técnica de documento"
        description="Registre solicitudes, asocie obras SIGEDE y consulte movimientos u oficios por documento."
      >
        <button
          type="button"
          onClick={handleExportarExcel}
          disabled={exportando || importando}
          className={BTN_SECONDARY_SM}
        >
          <Download sx={{ fontSize: 18 }} />
          {exportando ? 'Exportando…' : 'Exportar'}
        </button>
        {!soloLectura && (
          <>
            <button
              type="button"
              onClick={handleDescargarPlantilla}
              disabled={importando}
              className={BTN_SECONDARY_SM}
            >
              <Download sx={{ fontSize: 18 }} />
              Plantilla
            </button>
            <button
              type="button"
              onClick={() => inputImportRef.current?.click()}
              disabled={importando}
              className={BTN_SECONDARY_SM}
            >
              <Upload sx={{ fontSize: 18 }} />
              {importando ? 'Importando…' : 'Importar'}
            </button>
            <input
              ref={inputImportRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportarExcel}
            />
            <button
              type="button"
              onClick={() => {
                resetDocForm();
                setSecFormDoc(true);
                window.requestAnimationFrame(() => {
                  formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className={BTN_PRIMARY_SM}
            >
              <Add sx={{ fontSize: 18 }} />
              Nuevo documento
            </button>
          </>
        )}
      </ModuloPageHeader>

      {soloLectura && (
        <div className={GT_ALERTA_INFO}>
          <InfoOutlined sx={{ fontSize: 18 }} className="shrink-0 mt-0.5 text-amber-600" />
          <span>Solo visualización: no tienes permiso para crear, editar o eliminar registros.</span>
        </div>
      )}

      {mensajeExito && (
        <div className={GT_ALERTA_OK}>
          <CheckCircleOutline sx={{ fontSize: 18 }} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {error && (
        <div className={GT_ALERTA_ERROR}>
          <ErrorOutline sx={{ fontSize: 18 }} className="shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <div className={GT_STACK}>
        {/* Fila 2: Formulario documento */}
        {!soloLectura && (
        <SeccionColapsable
          titulo={editandoId ? `Editar documento${seleccionado ? ` — ${seleccionado.solicitud}` : ''}` : 'Nuevo documento'}
          descripcion="Datos de solicitud, SIGEDE, montos, adendas y contratista."
          abierto={secFormDoc}
          onToggle={() => setSecFormDoc((v) => !v)}
          icon={<NoteAdd sx={{ fontSize: 16 }} />}
          className={GT_SECTION}
          contenidoClassName="!p-0"
        >
        <form
          ref={formularioRef}
          onSubmit={handleGuardarDocumento}
          className="p-4 sm:p-6 space-y-5 max-h-[min(52vh,520px)] overflow-y-auto sepri-dropdown-scroll"
        >
            <BloqueFormulario titulo="Datos de la solicitud">
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
            </BloqueFormulario>

            <BloqueFormulario
              titulo="ID SIGEDE (obras)"
              descripcion={
                editandoId
                  ? 'Agregue o quite obras SIGEDE del documento seleccionado y pulse «Actualizar documento».'
                  : 'Asigne una o más obras por código o distrito SIGEDE.'
              }
              activo={!!editandoId}
            >
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
              <TablaObrasSigede filas={obrasResumen} onQuitar={quitarSigede} />
            </BloqueFormulario>

            <BloqueFormulario titulo="Montos y adendas (DOP)">
              <div className="space-y-4">
                <InputMontoDOP
                  id="monto-contrato-base"
                  label="Monto contrato base"
                  value={docForm.monto_contrato_base}
                  onChange={(v) => setDocForm((p) => ({ ...p, monto_contrato_base: v }))}
                  className="max-w-xs"
                />

                <div className={GT_SUB_BLOQUE}>
                  <p className={GT_BLOQUE_TITULO}>Adenda anterior</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <SelectTipoAdenda
                      id="tipo-adenda-anterior"
                      label="Tipo adenda anterior"
                      value={docForm.tipo_adenda_anterior}
                      onChange={(value) => setDocForm((p) => ({ ...p, tipo_adenda_anterior: value }))}
                    />
                    <InputCodigoAdenda
                      id="numero-adenda-anterior"
                      label="Código adenda anterior"
                      value={docForm.numero_adenda_anterior}
                      onChange={(v) => setDocForm((p) => ({ ...p, numero_adenda_anterior: v }))}
                    />
                    <InputMontoDOP
                      id="monto-adenda-anterior"
                      label="Monto adenda anterior"
                      value={docForm.monto_adenda_anterior}
                      onChange={(v) => setDocForm((p) => ({ ...p, monto_adenda_anterior: v }))}
                    />
                  </div>
                </div>

                <div className={editandoId ? GT_BLOQUE_FORM_ACTIVO : GT_SUB_BLOQUE}>
                  <p className={GT_BLOQUE_TITULO}>Adenda actual (solicitud)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SelectTipoAdenda
                      id="tipo-adenda"
                      label="Tipo adenda"
                      value={docForm.tipo_adenda}
                      onChange={(value) => setDocForm((p) => ({ ...p, tipo_adenda: value }))}
                    />
                    <InputCodigoAdenda
                      id="numero-adenda-actual"
                      label="Código adenda actual"
                      value={docForm.numero_adenda_actual}
                      onChange={(v) => setDocForm((p) => ({ ...p, numero_adenda_actual: v }))}
                    />
                    <div className="space-y-1">
                      <label htmlFor="no-adenda-solicituda" className={labelClass}>
                        No. adendas (solicituda)
                      </label>
                      <input
                        id="no-adenda-solicituda"
                        type="number"
                        min={0}
                        step={1}
                        value={docForm.no_adenda_solicituda}
                        onChange={(e) =>
                          setDocForm((p) => ({ ...p, no_adenda_solicituda: e.target.value }))
                        }
                        className={inputClass}
                        placeholder="Cantidad acumulada"
                        title="Cantidad de adendas que lleva el documento hasta el momento"
                      />
                    </div>
                    <InputMontoDOP
                      id="monto-adenda-solicitada"
                      label="Monto adenda solicitada"
                      value={docForm.monto_adenda_solicitada}
                      onChange={(v) => setDocForm((p) => ({ ...p, monto_adenda_solicitada: v }))}
                    />
                  </div>
                </div>

                <div className={`${GT_TARJETA_DETALLE} max-w-xs`}>
                  <InputMontoDOP
                    id="monto-total"
                    label="Monto total"
                    value={docForm.monto_total}
                    onChange={(v) => setDocForm((p) => ({ ...p, monto_total: v }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Observación</label>
                  <textarea
                    value={docForm.observacion}
                    onChange={(e) => setDocForm((p) => ({ ...p, observacion: e.target.value }))}
                    className={`${inputClass} min-h-[72px] resize-y`}
                    rows={2}
                  />
                </div>
              </div>
            </BloqueFormulario>

            <BloqueFormulario titulo="Contratista">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </BloqueFormulario>
          <div className="flex gap-2 justify-end pt-3 mt-1">
            {editandoId && (
              <button
                type="button"
                onClick={resetDocForm}
                className={BTN_SECONDARY}
              >
                Cancelar edición
              </button>
            )}
            <button
              type="submit"
              disabled={guardando}
              className={BTN_PRIMARY}
            >
              <Save sx={{ fontSize: 18 }} />
              {guardando ? 'Guardando…' : editandoId ? 'Actualizar documento' : 'Registrar documento'}
            </button>
          </div>
        </form>
        </SeccionColapsable>
        )}

        {/* Fila 3: Documentos registrados */}
        <SeccionColapsable
          className={GT_SECTION}
          titulo="Documentos registrados"
          descripcion="Seleccione un documento para ver el detalle y los movimientos."
          abierto={secDocumentos}
          onToggle={() => setSecDocumentos((v) => !v)}
          icon={<FolderOpen sx={{ fontSize: 16 }} />}
          badge={<span className={GT_BADGE}>{documentos.length}</span>}
          contenidoClassName="!gap-2"
        >
            <div className="relative shrink-0">
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
              <div className="flex-1 flex items-center justify-center min-h-[6rem]">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-slate-200 border-t-[#42A5F5]" />
              </div>
            ) : documentos.length === 0 ? (
              <EstadoVacio>No hay documentos registrados.</EstadoVacio>
            ) : (
              <div className={GT_LIST_SCROLL}>
                {documentos.map((doc) => {
                  const activo = seleccionado?.id === doc.id;
                  return (
                    <SepriListCard
                      key={doc.id}
                      activo={activo}
                      onClick={() => seleccionarDocumento(doc)}
                      acciones={
                        !soloLectura ? (
                          <>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => seleccionarDocumento(doc, { editar: true })}
                              className={BTN_LINK}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              title="Eliminar"
                              onClick={() => handleEliminarDocumento(doc)}
                              className={BTN_ICON}
                            >
                              <Delete sx={{ fontSize: 16 }} />
                            </button>
                          </>
                        ) : undefined
                      }
                    >
                      <h3 className="text-sm font-semibold text-stone-800 truncate" title={doc.solicitud}>
                        {doc.solicitud}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-stone-500">
                        {doc.cuadrantes && <span>{doc.cuadrantes}</span>}
                        {doc.tipo_adenda && (
                          <span className="text-stone-400">{doc.tipo_adenda}</span>
                        )}
                        {doc.numero_adenda_actual && (
                          <span className="font-mono text-primary tabular-nums">{doc.numero_adenda_actual}</span>
                        )}
                        {doc.no_adenda_solicituda != null && (
                          <span className="tabular-nums">{doc.no_adenda_solicituda} adenda(s)</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-stone-400">
                        {doc.contratista?.responsable && (
                          <span className="truncate max-w-[10rem]" title={doc.contratista.responsable}>
                            {doc.contratista.responsable}
                          </span>
                        )}
                        {(doc.id_sigede || []).length > 0 && (
                          <span className="font-mono bg-warm-100/80 px-1.5 py-0.5 rounded-md shadow-soft">
                            {(doc.id_sigede || []).slice(0, 2).join(' · ')}
                            {(doc.id_sigede || []).length > 2 ? ` +${(doc.id_sigede || []).length - 2}` : ''}
                          </span>
                        )}
                      </div>
                    </SepriListCard>
                  );
                })}
              </div>
            )}
        </SeccionColapsable>

        {/* Fila 4: Detalle del documento */}
        <SeccionColapsable
          className={GT_SECTION}
          titulo="Detalle del documento"
          descripcion={seleccionado ? seleccionado.solicitud : 'Seleccione un documento de la lista.'}
          abierto={secDetalle}
          onToggle={() => setSecDetalle((v) => !v)}
          icon={<Article sx={{ fontSize: 16 }} />}
          contenidoClassName="overflow-y-auto !gap-3 sepri-dropdown-scroll"
          acciones={
            seleccionado && !soloLectura ? (
              <button
                type="button"
                onClick={() => seleccionarDocumento(seleccionado, { editar: true })}
                className={BTN_LINK}
              >
                Editar
              </button>
            ) : undefined
          }
        >
            {!seleccionado ? (
              <EstadoVacio>Seleccione un documento de la lista para ver su detalle.</EstadoVacio>
            ) : (
              <div className="space-y-3">
                <BloqueDetalle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <CampoDetalle label="Cuadrantes" value={seleccionado.cuadrantes} />
                  <CampoDetalleMonto label="Monto contrato base" value={seleccionado.monto_contrato_base} />
                  <CampoDetalle label="Contratista" value={seleccionado.contratista?.responsable} className="col-span-2 sm:col-span-1" />
                  </div>
                </BloqueDetalle>

                <BloqueDetalle titulo="Adenda anterior">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <CampoDetalle label="Tipo" value={seleccionado.tipo_adenda_anterior} />
                  <CampoDetalle label="Código" value={seleccionado.numero_adenda_anterior} />
                  <CampoDetalleMonto label="Monto" value={seleccionado.monto_adenda_anterior} />
                  </div>
                </BloqueDetalle>

                <BloqueDetalle titulo="Adenda actual (solicitud)" accent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  <CampoDetalle label="Tipo adenda" value={seleccionado.tipo_adenda} />
                  <CampoDetalle label="Código" value={seleccionado.numero_adenda_actual} />
                  <CampoDetalle label="No. adendas" value={seleccionado.no_adenda_solicituda} />
                  <CampoDetalleMonto label="Monto solicitado" value={seleccionado.monto_adenda_solicitada} />
                  <CampoDetalleMonto label="Monto total" value={seleccionado.monto_total} className="col-span-2 sm:col-span-1" />
                  </div>
                </BloqueDetalle>

                <div className={`${GT_TARJETA_DETALLE} overflow-hidden !p-0`}>
                  <button
                    type="button"
                    onClick={() => setSecDetalleSigede((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-warm-50/60 text-left border-0 shadow-none outline-none cursor-pointer"
                  >
                    <span className={GT_BLOQUE_TITULO}>Obras (SIGEDE)</span>
                    {secDetalleSigede ? <ExpandLess fontSize="small" className="text-slate-400" /> : <ExpandMore fontSize="small" className="text-slate-400" />}
                  </button>
                  {secDetalleSigede && (
                    <div className="p-3">
                      <TablaObrasSigede
                        filas={
                          editandoId === seleccionado.id
                            ? obrasResumen
                            : seleccionado.obras_sigede || []
                        }
                        soloLectura
                      />
                    </div>
                  )}
                </div>

                {seleccionado.observacion && (
                  <p className="text-xs text-slate-500 bg-slate-50/60 rounded-xl px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] leading-relaxed">
                    <span className={`${GT_BLOQUE_TITULO} not-italic normal-case tracking-normal text-slate-400`}>Observación · </span>
                    {seleccionado.observacion}
                  </p>
                )}
              </div>
            )}
        </SeccionColapsable>

        {/* Fila 5: Movimientos u oficios */}
        <SeccionColapsable
          className={GT_SECTION}
          titulo="Movimientos u oficios"
          descripcion={seleccionado ? seleccionado.solicitud : 'Seleccione un documento para ver movimientos.'}
          abierto={secMovimientos}
          onToggle={() => setSecMovimientos((v) => !v)}
          icon={<SwapHoriz sx={{ fontSize: 16 }} />}
          badge={seleccionado ? <span className={GT_BADGE}>{movimientos.length}</span> : undefined}
          acciones={
            seleccionado && !soloLectura && !secFormMov ? (
              <button
                type="button"
                onClick={() => setSecFormMov(true)}
                className={BTN_PRIMARY_SM}
              >
                <Add sx={{ fontSize: 16 }} />
                <span className="hidden sm:inline">Agregar</span>
              </button>
            ) : undefined
          }
        >
            {!seleccionado ? (
              <EstadoVacio>Seleccione un documento para registrar movimientos u oficios.</EstadoVacio>
            ) : (
              <>
                {!soloLectura && movimientos.length > 0 && (
                  <p className="text-[11px] text-slate-400 shrink-0 px-0.5">
                    Haga clic en una fila para editar el movimiento.
                  </p>
                )}

              {!soloLectura && secFormMov && (
                <form
                  ref={movFormularioRef}
                  onSubmit={handleGuardarMovimiento}
                  className={`space-y-3 p-4 rounded-xl transition-colors shrink-0 max-h-[min(42vh,380px)] overflow-y-auto sepri-dropdown-scroll ${
                    editandoMovId ? GT_BLOQUE_FORM_ACTIVO : GT_BLOQUE_FORM
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {editandoMovId ? 'Editar movimiento' : 'Nuevo movimiento'}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Todos los campos son opcionales. El mismo número de trámite puede repetirse para
                    agrupar movimientos relacionados en el documento.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Fecha entrada</label>
                      <input
                        type="date"
                        value={movForm.fecha_entrada}
                        onChange={(e) => setMovForm((p) => ({ ...p, fecha_entrada: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Fecha salida</label>
                      <input
                        type="date"
                        value={movForm.fecha_salida}
                        min={movForm.fecha_entrada || undefined}
                        onChange={(e) => setMovForm((p) => ({ ...p, fecha_salida: e.target.value }))}
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
                        placeholder="Referencia para agrupar movimientos"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Oficio</label>
                      <input
                        type="text"
                        value={movForm.oficio}
                        onChange={(e) => setMovForm((p) => ({ ...p, oficio: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <SelectPersonalizado
                      id="mov-estatus"
                      label="Estatus"
                      value={movForm.estatus}
                      onChange={(v) => setMovForm((p) => ({ ...p, estatus: v }))}
                      placeholder="Seleccione…"
                      options={ESTATUS_MOVIMIENTO_DOCUMENTO.map((e) => ({ value: e, label: e }))}
                    />
                    <SelectPersonalizado
                      id="mov-departamento"
                      label="Departamento"
                      value={movForm.departamento}
                      onChange={(v) => setMovForm((p) => ({ ...p, departamento: v }))}
                      disabled={loadingAreas}
                      placeholder="Seleccione área…"
                      options={areas.map((a) => ({ value: a.id, label: a.area }))}
                    />
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs text-slate-500">Fecha solicitud</label>
                      <input
                        type="date"
                        value={movForm.fecha_solicitud}
                        onChange={(e) => setMovForm((p) => ({ ...p, fecha_solicitud: e.target.value }))}
                        className={`${inputClass} max-w-xs`}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className={labelClass}>Observaciones</label>
                      <textarea
                        value={movForm.observaciones}
                        onChange={(e) => setMovForm((p) => ({ ...p, observaciones: e.target.value }))}
                        className={`${inputClass} min-h-[72px] resize-y`}
                        rows={2}
                        placeholder="Notas sobre este movimiento u oficio"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {editandoMovId && (
                      <button
                        type="button"
                        onClick={resetMovForm}
                        className={BTN_SECONDARY_SM}
                      >
                        Cancelar
                      </button>
                    )}
                    {!editandoMovId && (
                      <button
                        type="button"
                        onClick={() => setSecFormMov(false)}
                        className={BTN_SECONDARY_SM}
                      >
                        Cerrar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={guardando}
                      className={BTN_PRIMARY_SM}
                    >
                      {editandoMovId ? (
                        <>
                          <Save sx={{ fontSize: 16 }} />
                          Actualizar movimiento
                        </>
                      ) : (
                        <>
                          <Add sx={{ fontSize: 16 }} />
                          Agregar movimiento
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {loadingMov ? (
                <div className="flex items-center justify-center min-h-[5rem]">
                  <div className="animate-spin rounded-full h-7 w-7 border-2 border-slate-200 border-t-[#42A5F5]" />
                </div>
              ) : movimientos.length === 0 ? (
                <EstadoVacio>Sin movimientos registrados.</EstadoVacio>
              ) : (
                <div className={GT_LIST_SCROLL}>
                  {movimientos.map((mov) => {
                    const activo = editandoMovId === mov.id;
                    return (
                      <SepriListCard
                        key={mov.id}
                        activo={activo}
                        onClick={soloLectura ? undefined : () => seleccionarMovimiento(mov)}
                        acciones={
                          !soloLectura ? (
                            <button
                              type="button"
                              onClick={() => handleEliminarMovimiento(mov)}
                              className={BTN_ICON}
                            >
                              <Delete sx={{ fontSize: 16 }} />
                            </button>
                          ) : undefined
                        }
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <BadgeEstatusMovimiento estatus={mov.estatus} />
                          {mov.no_tramite && (
                            <span className="text-xs font-medium text-stone-700 truncate max-w-[8rem]" title={mov.no_tramite}>
                              Trámite {mov.no_tramite}
                            </span>
                          )}
                          {mov.oficio && (
                            <span className="text-xs text-stone-500">Oficio {mov.oficio}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-400">
                          {mov.fecha_entrada && (
                            <span>Entrada {mov.fecha_entrada.slice(0, 10)}</span>
                          )}
                          {mov.fecha_salida && (
                            <span>Salida {mov.fecha_salida.slice(0, 10)}</span>
                          )}
                          {(mov.area?.area || mov.departamento) && (
                            <span className="truncate max-w-[10rem]" title={mov.area?.area || mov.departamento || ''}>
                              {mov.area?.area || mov.departamento}
                            </span>
                          )}
                        </div>
                        {mov.observaciones && (
                          <p className="text-[11px] text-stone-400 mt-1.5 line-clamp-2" title={mov.observaciones}>
                            {mov.observaciones}
                          </p>
                        )}
                      </SepriListCard>
                    );
                  })}
                </div>
              )}
              </>
            )}
        </SeccionColapsable>
      </div>
    </div>
  );
};

export default GestionTecnicaDocumento;
