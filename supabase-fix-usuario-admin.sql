-- =============================================================================
-- SEPRI — REPARAR LOGIN admin/admin (ejecutar TODO en SQL Editor)
-- Proyecto actual en .env: bfqojcyvhmntokcwbhwo
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 1) Crear tabla si no existe
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

-- 2) Columna usuario (por si la tabla vieja usaba otro nombre)
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

-- 3) Índice único en usuario (sin fallar si ya existe)
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_app_usuario_unique ON public.usuarios_app (usuario);

-- 4) Quitar TODAS las políticas RLS anteriores (evita conflictos)
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

-- 5) Borrar admin anterior e insertar uno limpio
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

-- 6) RLS permisivo para clave anon (login de la app)
ALTER TABLE public.usuarios_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_app_anon_all
  ON public.usuarios_app
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_app TO anon, authenticated;

-- 7) VERIFICACIÓN — debe mostrar exactamente 1 fila
SELECT id, usuario, password, rol, activo
FROM public.usuarios_app
WHERE lower(trim(usuario)) = 'admin';

-- Si la consulta de arriba devuelve 1 fila, el login admin/admin debe funcionar.
