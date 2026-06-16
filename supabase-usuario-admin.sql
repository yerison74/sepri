-- =============================================================================
-- SEPRI — Usuario admin + RLS (proyecto: bfqojcyvhmntokcwbhwo o el tuyo)
-- =============================================================================
-- Ejecutar COMPLETO en Supabase → SQL Editor del proyecto que usa tu .env
-- Login: admin / admin
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.usuarios_app (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario     text NOT NULL UNIQUE,
  password    text NOT NULL,
  nombre      text,
  apellido    text,
  cargo       text,
  area        text DEFAULT 'Ninguna',
  rol         text NOT NULL DEFAULT 'usuario',
  permisos    jsonb NOT NULL DEFAULT '{}'::jsonb,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

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
  activo = true,
  permisos = EXCLUDED.permisos;

ALTER TABLE public.usuarios_app ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usuarios_app_anon_all ON public.usuarios_app;
CREATE POLICY usuarios_app_anon_all
  ON public.usuarios_app FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_app TO anon, authenticated;

-- Debe devolver 1 fila:
SELECT usuario, rol, activo, password FROM public.usuarios_app WHERE usuario = 'admin';
