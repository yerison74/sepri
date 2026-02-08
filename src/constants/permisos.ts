/**
 * Códigos de permisos del sistema.
 * Cada usuario tiene un array de estos códigos en user.permisos.
 */

export const PERMISOS = {
  CREAR_USUARIOS: 'crear_usuarios',
  EDITAR_USUARIOS: 'editar_usuarios',
  VER_DASHBOARD: 'ver_dashboard',
  VER_OBRAS: 'ver_obras',
  VER_CARGA_OBRAS: 'ver_carga_obras',
  EDITAR_CARGA_OBRAS: 'editar_carga_obras',
  VER_TRAMITES: 'ver_tramites',
  EDITAR_TRAMITES: 'editar_tramites',
  VER_CONFIGURACION: 'ver_configuracion',
} as const;

export type PermisoCode = (typeof PERMISOS)[keyof typeof PERMISOS];

/** Lista para mostrar en UI (label, código) */
export const PERMISOS_LISTA: { codigo: PermisoCode; label: string }[] = [
  { codigo: PERMISOS.CREAR_USUARIOS, label: 'Creación de usuarios' },
  { codigo: PERMISOS.EDITAR_USUARIOS, label: 'Edición de usuarios' },
  { codigo: PERMISOS.VER_DASHBOARD, label: 'Visualización del Dashboard' },
  { codigo: PERMISOS.VER_OBRAS, label: 'Visualización de Obras' },
  { codigo: PERMISOS.VER_CARGA_OBRAS, label: 'Visualización de Carga de Obras' },
  { codigo: PERMISOS.EDITAR_CARGA_OBRAS, label: 'Carga y edición en Carga de Obras' },
  { codigo: PERMISOS.VER_TRAMITES, label: 'Visualización de Seguimiento de Trámite' },
  { codigo: PERMISOS.EDITAR_TRAMITES, label: 'Creación y seguimiento de Trámites' },
  { codigo: PERMISOS.VER_CONFIGURACION, label: 'Visualización de Configuración' },
];

/** Mapeo pestaña App -> permiso requerido para ver */
export const TAB_PERMISOS: Record<number, PermisoCode> = {
  0: PERMISOS.VER_DASHBOARD,
  1: PERMISOS.VER_OBRAS,
  2: PERMISOS.VER_CARGA_OBRAS,
  3: PERMISOS.VER_TRAMITES,
  4: PERMISOS.VER_CONFIGURACION,
};

export function tienePermiso(permisosUsuario: string[] | null | undefined, codigo: PermisoCode): boolean {
  if (!permisosUsuario || !Array.isArray(permisosUsuario)) return false;
  return permisosUsuario.includes(codigo);
}
