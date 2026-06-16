-- =============================================================================
-- SEPRI — Diagnóstico y corrección error 406 en login
-- =============================================================================
-- El 406 aparece cuando la app busca un usuario y no encuentra filas (RLS o no existe).
-- Ejecutar en Supabase → SQL Editor
-- =============================================================================

-- 1) ¿Existe el usuario admin?
SELECT id, usuario, rol, activo, password
FROM public.usuarios_app
WHERE usuario = 'admin';

-- 2) Si no devuelve filas, créalo o actualízalo:
INSERT INTO public.usuarios_app (
  usuario, password, nombre, apellido, cargo, area, rol, permisos, activo
) VALUES (
  'admin', 'admin', 'Administrador', 'Sistema', 'Administrador', 'Ninguna', 'admin',
  '{
    "crear_usuarios": true, "editar_usuarios": true,
    "ver_dashboard": true, "editar_dashboard": true,
    "ver_obras": true, "editar_obras": true,
    "ver_carga_obras": true, "editar_carga_obras": true,
    "ver_tramites": true, "editar_tramites": true,
    "ver_atencion_contratista": true, "editar_atencion_contratista": true,
    "ver_configuracion": true, "editar_configuracion": true,
    "ver_reporte": true, "editar_reporte": true
  }'::jsonb,
  true
)
ON CONFLICT (usuario) DO UPDATE SET
  password = 'admin',
  rol = 'admin',
  activo = true;

-- 3) RLS: la clave anon debe poder LEER usuarios_app (login)
ALTER TABLE public.usuarios_app ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_app_anon_all ON public.usuarios_app;

CREATE POLICY usuarios_app_anon_all
  ON public.usuarios_app
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_app TO anon, authenticated;

-- 4) Verificar de nuevo (debe mostrar 1 fila)
SELECT id, usuario, rol, activo FROM public.usuarios_app WHERE usuario = 'admin';
