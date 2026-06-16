-- =============================================================================
-- SEPRI — Arreglar RLS para que la APP pueda leer usuarios_app (login admin)
-- =============================================================================
-- El SQL Editor ve los datos (rol postgres), pero la app usa clave anon.
-- Si RLS bloquea anon → la app recibe 0 filas aunque admin exista.
-- Ejecutar TODO en SQL Editor del proyecto bfqojcyvhmntokcwbhwo
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.usuarios_app TO anon, authenticated;

-- Quitar todas las políticas existentes en usuarios_app
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

-- Política explícita de LECTURA para anon (login)
CREATE POLICY usuarios_app_anon_select
  ON public.usuarios_app
  FOR SELECT
  TO anon
  USING (true);

-- Política para el resto de operaciones (gestión de usuarios)
CREATE POLICY usuarios_app_anon_write
  ON public.usuarios_app
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY usuarios_app_anon_update
  ON public.usuarios_app
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY usuarios_app_anon_delete
  ON public.usuarios_app
  FOR DELETE
  TO anon
  USING (true);

-- Mismo acceso para authenticated (por si migran a Supabase Auth)
CREATE POLICY usuarios_app_auth_all
  ON public.usuarios_app
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_app TO anon, authenticated;

-- Verificación (postgres ve la fila):
SELECT usuario, rol, activo FROM public.usuarios_app WHERE usuario = 'admin';

-- =============================================================================
-- Si AÚN no entra desde la app, descomenta la línea de abajo (solo desarrollo):
-- ALTER TABLE public.usuarios_app DISABLE ROW LEVEL SECURITY;
-- =============================================================================
