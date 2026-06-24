-- =============================================================================
-- SEPRI — Vaciar solo DATOS (no elimina tablas ni esquema)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor ANTES de importar un backup completo
-- si quieres reemplazar todos los registros existentes.
--
-- NO borra archivos del bucket storage "documentos".
-- =============================================================================

TRUNCATE TABLE
  public.notificacion_leida,
  public.notificaciones_tiempo,
  public.tiempo_en_area,
  public.movimiento_documentos_tecnicos_obra,
  public.documentos_tecnicos_obra,
  public.matriz_general,
  public.contrato_adenda,
  public.contrato,
  public.contratista_access_tokens,
  public.movimientos_solicitud_contratista,
  public.formulario_contratista,
  public.movimientos_tramites,
  public.historial_uploads,
  public.tramites,
  public.historial_estados,
  public.obras,
  public.contratistas,
  public.area,
  public.usuarios_app
RESTART IDENTITY CASCADE;

-- Tras vaciar, vuelve a crear el admin si lo necesitas:
-- (también incluido al final de supabase-schema-completo.sql)
DELETE FROM public.usuarios_app WHERE lower(trim(usuario)) = 'admin';
INSERT INTO public.usuarios_app (usuario, password, nombre, apellido, cargo, area, rol, permisos, activo)
VALUES (
  'admin', 'admin', 'Administrador', 'Sistema', 'Administrador', 'Ninguna', 'admin',
  '{"crear_usuarios":true,"editar_usuarios":true,"ver_dashboard":true,"editar_dashboard":true,"ver_obras":true,"editar_obras":true,"ver_techado":true,"editar_techado":true,"ver_carga_obras":true,"editar_carga_obras":true,"ver_tramites":true,"editar_tramites":true,"ver_atencion_contratista":true,"editar_atencion_contratista":true,"ver_configuracion":true,"editar_configuracion":true,"ver_reporte":true,"editar_reporte":true}'::jsonb,
  true
);

INSERT INTO public.area (id, area, encargado_id) VALUES
  ('DIGE', 'Dirección General', NULL),
  ('OAIP', 'Oficina de Libre Acceso a la Información Pública', NULL),
  ('JURI', 'Departamento Jurídico', NULL),
  ('RRHH', 'Departamento de Recursos Humanos', NULL),
  ('PYDE', 'Departamento de Planificación y Desarrollo', NULL),
  ('COGI', 'División Control de Gestión Interna', NULL),
  ('SEFI', 'División de Seguridad', NULL),
  ('TECO', 'División de Tecnologías de la Información y Comunicación', NULL),
  ('ADFI', 'Departamento Administrativo y Financiero', NULL),
  ('DIAR', 'Departamento de Diseño y Arquitectura', NULL),
  ('GEIE', 'Departamento de Gestión de Infraestructura Escolar', NULL),
  ('GERI', 'Departamento Gestión de Riesgo', NULL),
  ('MANO', 'Departamento de Mantenimiento de Obras', NULL),
  ('SUPO', 'Departamento Supervisión de Obras', NULL),
  ('FISO', 'Departamento Fiscalización de Obras', NULL),
  ('CUBI', 'Departamento de Cubicaciones', NULL),
  ('COOR', 'Departamento de Coordinación Regional', NULL)
ON CONFLICT (id) DO NOTHING;
