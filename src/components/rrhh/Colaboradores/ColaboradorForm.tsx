import React, { useEffect, useRef, useState } from 'react';
import { PersonAdd as PersonAddIcon, Edit as EditIcon } from '@mui/icons-material';
import { ArrowLeft, Link2, Loader2, Save } from 'lucide-react';
import { CARGOS } from '../../../constants/cargos';
import {
  aplicarPermisosAdmin,
  cambiarPermisoModuloEnMapa,
  MODULOS_PERMISOS_VISIBLES,
} from '../../../constants/modulosPermisos';
import { PERMISOS } from '../../../constants/permisos';
import {
  GT_ALERTA_ERROR,
  GT_ALERTA_INFO,
  GT_BLOQUE_FORM,
  GT_BLOQUE_TITULO,
  GT_PAGE,
  GT_STACK,
  SEPRI_CARD,
  SEPRI_FIELD_SHADOW,
} from '../../../constants/gestionTecnicaDocumentoUi';
import {
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
} from '../../../constants/buttonStyles';
import { useAuth } from '../../../context/AuthContext';
import { useAreas } from '../../../hooks/useAreas';
import {
  rrhhColaboradoresService,
  type RrhhColaborador,
  type RrhhColaboradorEstado,
  type RrhhVinculoIdentificacion,
} from '../../../services/rrhhColaboradores.service';
import {
  actualizarUsuario,
  crearUsuario,
  obtenerUsuarioPorId,
} from '../../../services/usuarios.service';
import ModuloPageHeader from '../../ui/ModuloPageHeader';

const INPUT = `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${SEPRI_FIELD_SHADOW}`;
const LABEL = 'text-xs font-medium text-stone-400';
const FIELD = 'flex flex-col gap-1.5 min-w-0';

export type ColaboradorFormMode = 'create' | 'edit' | 'view';

interface ColaboradorFormProps {
  mode?: ColaboradorFormMode;
  colaboradorId?: string | null;
  /** Usuario de app sin ficha RH (completar colaborador). */
  usuarioAppId?: string | null;
  onCancel: () => void;
  onSaved: (colaborador: RrhhColaborador) => void;
}

type FormState = {
  nombre: string;
  identificacion: string;
  cargo: string;
  departamento: string;
  telefono: string;
  correo: string;
  direccion: string;
  estado: RrhhColaboradorEstado;
  usuario_app_id: string | null;
  // Acceso app
  crearAcceso: boolean;
  usuario: string;
  password: string;
  apellido: string;
  rol: string;
  activoUsuario: boolean;
  permisos: Record<string, boolean>;
};

const EMPTY: FormState = {
  nombre: '',
  identificacion: '',
  cargo: '',
  departamento: '',
  telefono: '',
  correo: '',
  direccion: '',
  estado: 'Activo',
  usuario_app_id: null,
  crearAcceso: false,
  usuario: '',
  password: '',
  apellido: '',
  rol: 'usuario',
  activoUsuario: true,
  permisos: {},
};

function splitNombre(nombreCompleto: string): { nombre: string; apellido: string } {
  const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nombre: '', apellido: '' };
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}

const ColaboradorForm: React.FC<ColaboradorFormProps> = ({
  mode = 'create',
  colaboradorId = null,
  usuarioAppId = null,
  onCancel,
  onSaved,
}) => {
  const { hasPermission } = useAuth();
  const { areas, loadingAreas } = useAreas();

  const puedeEditarColab =
    hasPermission(PERMISOS.EDITAR_RH_PERSONAL) || hasPermission(PERMISOS.EDITAR_RECURSO_HUMANO);
  const puedeCrearUsuario = hasPermission(PERMISOS.CREAR_USUARIOS);
  const puedeEditarUsuario =
    hasPermission(PERMISOS.EDITAR_USUARIOS) || hasPermission(PERMISOS.EDITAR_CONFIGURACION);

  const readOnlyColab = mode === 'view' || (mode === 'edit' && !puedeEditarColab) || (mode === 'create' && !puedeEditarColab);
  const isCreate = mode === 'create';

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loadingInit, setLoadingInit] = useState(Boolean(colaboradorId || usuarioAppId));
  const [buscandoVinculo, setBuscandoVinculo] = useState(false);
  const [vinculo, setVinculo] = useState<RrhhVinculoIdentificacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipLookupRef = useRef(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const mostrarSeccionUsuario =
    (isCreate && puedeCrearUsuario) ||
    (!isCreate && (puedeEditarUsuario || puedeCrearUsuario)) ||
    Boolean(form.usuario_app_id);

  const puedeEditarSeccionUsuario = form.usuario_app_id
    ? puedeEditarUsuario
    : puedeCrearUsuario;
  const readOnlyUsuario = !puedeEditarSeccionUsuario || mode === 'view';

  // Carga inicial: ficha RH y/o usuario de app
  useEffect(() => {
    if (!colaboradorId && !usuarioAppId) return;
    let cancelled = false;

    (async () => {
      setLoadingInit(true);
      setError(null);
      try {
        skipLookupRef.current = true;
        const next: FormState = { ...EMPTY };

        if (colaboradorId) {
          const colab = await rrhhColaboradoresService.obtenerPorId(colaboradorId);
          if (!colab) throw new Error('Colaborador no encontrado.');
          if (cancelled) return;

          next.nombre = colab.nombre || '';
          next.identificacion = colab.identificacion || '';
          next.cargo = colab.cargo || '';
          next.departamento = colab.departamento || '';
          next.telefono = colab.telefono || '';
          next.correo = colab.correo || '';
          next.direccion = colab.direccion || '';
          next.estado = colab.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
          next.usuario_app_id = colab.usuario_app_id || null;
          next.crearAcceso = Boolean(colab.usuario_app_id);
        }

        const userId = next.usuario_app_id || usuarioAppId;
        if (userId) {
          const u = await obtenerUsuarioPorId(userId);
          if (u && !cancelled) {
            next.usuario_app_id = u.id;
            next.crearAcceso = true;
            next.usuario = u.usuario || '';
            next.apellido = u.apellido || '';
            next.rol = u.rol || 'usuario';
            next.activoUsuario = u.activo !== false;
            next.permisos =
              u.rol === 'admin' ? aplicarPermisosAdmin(u.permisos) : u.permisos || {};
            next.password = '';
            if (!next.nombre.trim()) {
              next.nombre = [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.usuario || '';
            }
            if (!next.correo.trim()) next.correo = u.usuario || '';
            if (!next.cargo.trim()) next.cargo = u.cargo || '';
            if (!next.departamento.trim()) next.departamento = u.area || '';
            if (!next.identificacion.trim()) next.identificacion = u.identificacion || '';
            if (!colaboradorId) {
              next.estado = u.activo === false ? 'Inactivo' : 'Activo';
            }
          }
        }

        if (!cancelled) setForm(next);
      } catch (err: unknown) {
        if (!cancelled) {
          setError((err as { message?: string })?.message || 'No se pudo cargar el registro.');
        }
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [colaboradorId, usuarioAppId]);

  // Lookup por identificación (solo alta sin usuario preseleccionado)
  useEffect(() => {
    if (!isCreate || readOnlyColab || usuarioAppId) return;
    if (skipLookupRef.current) {
      skipLookupRef.current = false;
      return;
    }

    const doc = form.identificacion.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (doc.length < 5) {
      setVinculo(null);
      setForm((prev) =>
        prev.usuario_app_id && !prev.crearAcceso
          ? { ...prev, usuario_app_id: null }
          : prev.usuario_app_id && !prev.usuario
            ? { ...prev, usuario_app_id: null }
            : prev,
      );
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setBuscandoVinculo(true);
      try {
        const res = await rrhhColaboradoresService.buscarRelacionPorIdentificacion(doc);
        setVinculo(res);

        if (res.colaborador) {
          setError('Ya existe un colaborador con esta identificación.');
          setForm((prev) => ({ ...prev, usuario_app_id: null }));
          return;
        }

        setError(null);
        if (res.usuarioApp?.id) {
          const u = await obtenerUsuarioPorId(res.usuarioApp.id);
          setForm((prev) => {
            const nombreUsuario = [res.usuarioApp?.nombre, res.usuarioApp?.apellido]
              .filter(Boolean)
              .join(' ')
              .trim();
            return {
              ...prev,
              usuario_app_id: res.usuarioApp!.id,
              crearAcceso: true,
              nombre: prev.nombre.trim() ? prev.nombre : nombreUsuario,
              cargo: prev.cargo.trim() ? prev.cargo : res.usuarioApp?.cargo || '',
              departamento: prev.departamento.trim()
                ? prev.departamento
                : res.usuarioApp?.area || '',
              usuario: u?.usuario || prev.usuario,
              apellido: u?.apellido || res.usuarioApp?.apellido || prev.apellido,
              rol: u?.rol || prev.rol,
              activoUsuario: u?.activo !== false,
              permisos:
                u?.rol === 'admin' ? aplicarPermisosAdmin(u?.permisos) : u?.permisos || prev.permisos,
            };
          });
        } else {
          setForm((prev) =>
            prev.usuario_app_id && !prev.crearAcceso
              ? prev
              : { ...prev, usuario_app_id: null },
          );
        }
      } catch {
        setVinculo(null);
      } finally {
        setBuscandoVinculo(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.identificacion, isCreate, readOnlyColab, usuarioAppId]);

  const validar = (): string | null => {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.identificacion.trim()) return 'La identificación es obligatoria.';
    if (isCreate && vinculo?.colaborador) {
      return 'Ya existe un colaborador con esta identificación.';
    }

    const quiereUsuario =
      (isCreate && form.crearAcceso && puedeCrearUsuario) ||
      (!isCreate && form.crearAcceso && !form.usuario_app_id && puedeCrearUsuario) ||
      (form.usuario_app_id && puedeEditarUsuario && !readOnlyUsuario);

    if (quiereUsuario && form.crearAcceso) {
      if (!form.correo.trim()) {
        return 'El correo es obligatorio: se usa como usuario de acceso a la aplicación.';
      }
      if (!form.usuario_app_id && !form.password.trim()) {
        return 'La contraseña es obligatoria al crear el acceso.';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyColab && readOnlyUsuario) return;

    const msg = validar();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let usuarioAppId = form.usuario_app_id;

      const debeCrearUsuario =
        form.crearAcceso && !usuarioAppId && puedeCrearUsuario && !readOnlyUsuario;
      const debeActualizarUsuario =
        form.crearAcceso && Boolean(usuarioAppId) && puedeEditarUsuario && !readOnlyUsuario;

      if (debeCrearUsuario) {
        const { nombre, apellido } = splitNombre(form.nombre);
        const login = form.correo.trim();
        const payload: Record<string, unknown> = {
          usuario: login,
          password: form.password,
          nombre: nombre || form.nombre.trim(),
          apellido: form.apellido.trim() || apellido,
          cargo: form.cargo || null,
          area: form.departamento || 'Ninguna',
          rol: form.rol,
          activo: form.activoUsuario,
          identificacion: form.identificacion.trim(),
          permisos:
            form.rol === 'admin' ? aplicarPermisosAdmin(form.permisos) : form.permisos || {},
        };
        const createdUser = await crearUsuario(payload);
        usuarioAppId = createdUser.id;
      } else if (debeActualizarUsuario && usuarioAppId) {
        const { nombre, apellido } = splitNombre(form.nombre);
        const login = form.correo.trim();
        const payload: Record<string, unknown> = {
          usuario: login,
          nombre: nombre || form.nombre.trim(),
          apellido: form.apellido.trim() || apellido,
          cargo: form.cargo || null,
          area: form.departamento || 'Ninguna',
          rol: form.rol,
          activo: form.activoUsuario,
          identificacion: form.identificacion.trim(),
          permisos:
            form.rol === 'admin' ? aplicarPermisosAdmin(form.permisos) : form.permisos || {},
        };
        if (form.password.trim()) payload.password = form.password;
        await actualizarUsuario(usuarioAppId, payload);
      }

      const colabPayload = {
        nombre: form.nombre,
        identificacion: form.identificacion,
        cargo: form.cargo || null,
        departamento: form.departamento || null,
        telefono: form.telefono || null,
        correo: form.correo || null,
        direccion: form.direccion || null,
        estado: form.estado,
        usuario_app_id: form.crearAcceso ? usuarioAppId : usuarioAppId,
      };

      // Si se desactiva acceso nuevo sin usuario existente, no forzar null en edit linked unless intended
      if (!form.crearAcceso && !form.usuario_app_id) {
        colabPayload.usuario_app_id = null;
      } else {
        colabPayload.usuario_app_id = usuarioAppId;
      }

      let saved: RrhhColaborador;
      if (isCreate) {
        if (!puedeEditarColab) throw new Error('No tienes permiso para crear colaboradores.');
        saved = await rrhhColaboradoresService.crear(colabPayload);
      } else {
        if (!colaboradorId) throw new Error('Colaborador inválido.');
        if (puedeEditarColab) {
          saved = await rrhhColaboradoresService.actualizar(colaboradorId, colabPayload);
        } else if (debeActualizarUsuario || debeCrearUsuario) {
          // Solo actualizó usuario; recargar colaborador
          const existing = await rrhhColaboradoresService.obtenerPorId(colaboradorId);
          if (!existing) throw new Error('Colaborador no encontrado.');
          if (usuarioAppId && existing.usuario_app_id !== usuarioAppId && puedeEditarColab) {
            saved = await rrhhColaboradoresService.actualizar(colaboradorId, {
              usuario_app_id: usuarioAppId,
            });
          } else {
            saved = existing;
          }
        } else {
          throw new Error('No tienes permisos para guardar cambios.');
        }
      }

      onSaved(saved);
    } catch (err: unknown) {
      const anyErr = err as { message?: string; code?: string };
      if (anyErr?.code === '23505' || /duplicate|unique/i.test(anyErr?.message || '')) {
        setError('Conflicto de datos únicos (identificación, usuario o vínculo).');
      } else {
        setError(anyErr?.message || 'No se pudo guardar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const titulo =
    colaboradorId
      ? mode === 'view'
        ? 'Ver colaborador'
        : 'Editar colaborador'
      : usuarioAppId
        ? 'Completar ficha de colaborador'
        : 'Nuevo colaborador';

  const permisosSeleccionados = MODULOS_PERMISOS_VISIBLES.flatMap((m) => [
    m.verKey,
    m.editarKey,
  ]).filter((k) => form.permisos?.[k]).length;
  const totalPermisos = MODULOS_PERMISOS_VISIBLES.length * 2;

  if (loadingInit) {
    return (
      <div className={`${GT_PAGE} items-center justify-center py-16`}>
        <Loader2 className="animate-spin text-stone-400" size={28} />
      </div>
    );
  }

  return (
    <div className={`${GT_PAGE} p-2 sm:p-0`}>
      <ModuloPageHeader
        icon={mode === 'create' ? <PersonAddIcon fontSize="small" /> : <EditIcon fontSize="small" />}
        title={titulo}
        description="Datos del colaborador y, según tu permiso, acceso a la aplicación y permisos del sistema."
      >
        <button type="button" onClick={onCancel} className={BTN_SECONDARY_SM} disabled={saving}>
          <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
          Volver
        </button>
        {(!readOnlyColab || !readOnlyUsuario) && (
          <button
            type="submit"
            form="form-colaborador-unificado"
            className={BTN_PRIMARY}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              <>
                <Save size={15} strokeWidth={1.75} aria-hidden />
                Guardar
              </>
            )}
          </button>
        )}
      </ModuloPageHeader>

      <form id="form-colaborador-unificado" onSubmit={handleSubmit} className={GT_STACK} noValidate>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
          <section className={GT_BLOQUE_FORM}>
            <p className={GT_BLOQUE_TITULO}>Identificación y datos personales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className={`${FIELD} sm:col-span-2`}>
                <label className={LABEL} htmlFor="colab-identificacion">
                  Identificación *
                </label>
                <div className="relative">
                  <input
                    id="colab-identificacion"
                    value={form.identificacion}
                    onChange={(e) => setField('identificacion', e.target.value)}
                    className={INPUT}
                    placeholder="Cédula o documento"
                    disabled={readOnlyColab || mode !== 'create'}
                    required
                  />
                  {buscandoVinculo && (
                    <Loader2
                      size={15}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 animate-spin"
                    />
                  )}
                </div>
                {form.usuario_app_id && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-[#1E88E5] bg-primary-light/50 rounded-xl px-2.5 py-1.5" role="status">
                    <Link2 size={13} strokeWidth={1.75} />
                    Usuario de app vinculado
                  </p>
                )}
              </div>

              <div className={`${FIELD} sm:col-span-2`}>
                <label className={LABEL} htmlFor="colab-nombre">
                  Nombre completo *
                </label>
                <input
                  id="colab-nombre"
                  value={form.nombre}
                  onChange={(e) => setField('nombre', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                  required
                />
              </div>

              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-estado">
                  Estado colaborador
                </label>
                <select
                  id="colab-estado"
                  value={form.estado}
                  onChange={(e) => setField('estado', e.target.value as RrhhColaboradorEstado)}
                  className={INPUT}
                  disabled={readOnlyColab}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </section>

          <section className={GT_BLOQUE_FORM}>
            <p className={GT_BLOQUE_TITULO}>Datos laborales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-cargo">
                  Cargo
                </label>
                <select
                  id="colab-cargo"
                  value={form.cargo}
                  onChange={(e) => setField('cargo', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                >
                  <option value="">Seleccionar cargo</option>
                  {CARGOS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-area">
                  Área
                </label>
                <select
                  id="colab-area"
                  value={form.departamento}
                  onChange={(e) => setField('departamento', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab || loadingAreas}
                >
                  <option value="">{loadingAreas ? 'Cargando…' : 'Seleccionar área'}</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.area}>
                      {a.area}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className={`${GT_BLOQUE_FORM} xl:col-span-2`}>
            <p className={GT_BLOQUE_TITULO}>Contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-telefono">
                  Teléfono
                </label>
                <input
                  id="colab-telefono"
                  value={form.telefono}
                  onChange={(e) => setField('telefono', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                />
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-correo">
                  Correo {(form.crearAcceso || form.usuario_app_id) ? '*' : ''}
                </label>
                <input
                  id="colab-correo"
                  type="email"
                  value={form.correo}
                  onChange={(e) => setField('correo', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                  placeholder="correo@empresa.com"
                />
                {(form.crearAcceso || form.usuario_app_id) && (
                  <p className="text-[11px] text-stone-400">
                    Este correo es el usuario de acceso a la aplicación.
                  </p>
                )}
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-direccion">
                  Dirección
                </label>
                <input
                  id="colab-direccion"
                  value={form.direccion}
                  onChange={(e) => setField('direccion', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                />
              </div>
            </div>
          </section>
        </div>

        {mostrarSeccionUsuario && (
          <section className={`${GT_BLOQUE_FORM} w-full`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
              <div>
                <p className={GT_BLOQUE_TITULO}>Acceso a la aplicación</p>
                <p className="text-xs text-stone-400 mt-1">
                  Requiere permiso de {form.usuario_app_id ? 'editar' : 'crear'} usuarios (independiente
                  de editar colaboradores).
                </p>
              </div>
              {!form.usuario_app_id && puedeCrearUsuario && mode !== 'view' && (
                <label className="inline-flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.crearAcceso}
                    onChange={(e) => setField('crearAcceso', e.target.checked)}
                    className="rounded border-stone-300 text-[#42A5F5] focus:ring-[#42A5F5]/30"
                  />
                  Crear acceso de usuario
                </label>
              )}
            </div>

            {!puedeCrearUsuario && !puedeEditarUsuario && !form.usuario_app_id && (
              <div className={GT_ALERTA_INFO}>
                No tienes permiso para crear o editar usuarios. Solo verás datos de colaborador.
              </div>
            )}

            {(form.crearAcceso || form.usuario_app_id) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="colab-usuario-login">
                    Usuario (correo)
                  </label>
                  <input
                    id="colab-usuario-login"
                    value={form.correo}
                    className={INPUT}
                    disabled
                    readOnly
                    aria-readonly="true"
                  />
                </div>
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="colab-password">
                    {form.usuario_app_id ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <input
                    id="colab-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    className={INPUT}
                    disabled={readOnlyUsuario}
                    autoComplete="new-password"
                  />
                </div>
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="colab-rol">
                    Rol
                  </label>
                  <select
                    id="colab-rol"
                    value={form.rol}
                    onChange={(e) => {
                      const rol = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        rol,
                        permisos:
                          rol === 'admin' ? aplicarPermisosAdmin(prev.permisos) : prev.permisos,
                      }));
                    }}
                    className={INPUT}
                    disabled={readOnlyUsuario}
                  >
                    <option value="admin">Administrador</option>
                    <option value="supervision">Supervisión</option>
                    <option value="usuario">Usuario</option>
                  </select>
                </div>
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="colab-activo-user">
                    Usuario activo
                  </label>
                  <select
                    id="colab-activo-user"
                    value={form.activoUsuario ? '1' : '0'}
                    onChange={(e) => setField('activoUsuario', e.target.value === '1')}
                    className={INPUT}
                    disabled={readOnlyUsuario}
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              </div>
            )}

            {(form.crearAcceso || form.usuario_app_id) && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className={GT_BLOQUE_TITULO}>
                    Permisos del sistema ({permisosSeleccionados}/{totalPermisos})
                  </p>
                  {!readOnlyUsuario && (
                    <button
                      type="button"
                      className={BTN_GHOST}
                      onClick={() => {
                        const allOn = permisosSeleccionados === totalPermisos;
                        const next: Record<string, boolean> = {};
                        MODULOS_PERMISOS_VISIBLES.forEach((m) => {
                          next[m.verKey] = !allOn;
                          next[m.editarKey] = !allOn;
                        });
                        setField('permisos', next);
                      }}
                    >
                      {permisosSeleccionados === totalPermisos
                        ? 'Deseleccionar todo'
                        : 'Seleccionar todo'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {MODULOS_PERMISOS_VISIBLES.map((m) => {
                    const canView = !!form.permisos?.[m.verKey];
                    const canEdit = !!form.permisos?.[m.editarKey];
                    return (
                      <div
                        key={m.id}
                        className={`${SEPRI_CARD} px-3 py-2.5 flex items-center justify-between gap-3`}
                      >
                        <span className="text-sm font-medium text-stone-700 truncate">
                          {m.icon} {m.label}
                        </span>
                        <div className="flex items-center gap-3 shrink-0 text-xs text-stone-500">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={canView}
                              disabled={readOnlyUsuario}
                              onChange={(e) =>
                                setField(
                                  'permisos',
                                  cambiarPermisoModuloEnMapa(
                                    form.permisos,
                                    m.verKey,
                                    m.editarKey,
                                    'ver',
                                    e.target.checked,
                                  ),
                                )
                              }
                            />
                            Ver
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={canEdit}
                              disabled={readOnlyUsuario}
                              onChange={(e) =>
                                setField(
                                  'permisos',
                                  cambiarPermisoModuloEnMapa(
                                    form.permisos,
                                    m.verKey,
                                    m.editarKey,
                                    'editar',
                                    e.target.checked,
                                  ),
                                )
                              }
                            />
                            Editar
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {error && (
          <div className={GT_ALERTA_ERROR} role="alert">
            {error}
          </div>
        )}

        {(!readOnlyColab || !readOnlyUsuario) && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
            <button type="button" onClick={onCancel} className={BTN_SECONDARY} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={BTN_PRIMARY} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Save size={15} strokeWidth={1.75} />
                  Guardar
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ColaboradorForm;
