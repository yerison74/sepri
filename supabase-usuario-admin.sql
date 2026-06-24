-- =============================================================================
-- SEPRI — Usuario admin + RLS para login (clave anon)
-- =============================================================================
-- Ejecutar COMPLETO en Supabase → SQL Editor del proyecto de tu .env
-- Login por defecto: admin / admin
--
-- Incluye: tabla usuarios_app, usuario admin, permisos y políticas RLS para la app.
-- Reemplaza los scripts antiguos fix-usuario-admin y fix-rls-usuarios-login.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 1) Tabla usuarios_app
CREATE TABLE IF NOT EXISTS public.usuarios_app (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario     text NOT NULL,
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

-- 2) Columnas legacy (migración desde esquemas antiguos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'usuario'
  ) THEN
    ALTER TABLE public.usuarios_app ADD COLUMN usuario text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'nombre_usuario'
  ) THEN
    UPDATE public.usuarios_app SET usuario = nombre_usuario WHERE usuario IS NULL OR usuario = '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'activo'
  ) THEN
    ALTER TABLE public.usuarios_app ADD COLUMN activo boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'rol'
  ) THEN
    ALTER TABLE public.usuarios_app ADD COLUMN rol text NOT NULL DEFAULT 'usuario';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'permisos'
  ) THEN
    ALTER TABLE public.usuarios_app ADD COLUMN permisos jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_app_usuario_unique ON public.usuarios_app (usuario);

-- 3) Usuario administrador
DELETE FROM public.usuarios_app WHERE lower(trim(usuario)) = 'admin';

INSERT INTO public.usuarios_app (
  usuario, password, nombre, apellido, cargo, area, rol, permisos, activo
) VALUES (
  'admin',
  'admin',
  'Administrador',
  'Sistema',
  'Administrador',
  'Ninguna',
  'admin',
  '{
    "crear_usuarios": true,
    "editar_usuarios": true,
    "ver_dashboard": true,
    "editar_dashboard": true,
    "ver_obras": true,
    "editar_obras": true,
    "ver_carga_obras": true,
    "editar_carga_obras": true,
    "ver_tramites": true,
    "editar_tramites": true,
    "ver_atencion_contratista": true,
    "editar_atencion_contratista": true,
    "ver_configuracion": true,
    "editar_configuracion": true,
    "ver_reporte": true,
    "editar_reporte": true
  }'::jsonb,
  true
);

-- 4) RLS para que la app (clave anon) pueda leer y gestionar usuarios
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'usuarios_app'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usuarios_app', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.usuarios_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_app_anon_all
  ON public.usuarios_app
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_app TO anon, authenticated;

-- 5) Verificación — debe devolver 1 fila
SELECT id, usuario, password, rol, activo
FROM public.usuarios_app
WHERE lower(trim(usuario)) = 'admin';
