-- =============================================================================
-- SEPRI — Arreglar RLS en obras (carga Excel / insertar obras)
-- =============================================================================
-- Error: new row violates row-level security policy for table "obras"
-- Ejecutar en Supabase → SQL Editor (proyecto bfqojcyvhmntokcwbhwo)
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras TO anon, authenticated;

-- Quitar TODAS las políticas existentes en obras
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'obras'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.obras', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY obras_anon_select ON public.obras FOR SELECT TO anon USING (true);
CREATE POLICY obras_anon_insert ON public.obras FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY obras_anon_update ON public.obras FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY obras_anon_delete ON public.obras FOR DELETE TO anon USING (true);

CREATE POLICY obras_auth_all ON public.obras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Historial de cargas (opcional al subir Excel)
DO $$
DECLARE pol record;
BEGIN
  IF to_regclass('public.historial_uploads') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.historial_uploads TO anon, authenticated;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'historial_uploads'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.historial_uploads', pol.policyname);
    END LOOP;
    ALTER TABLE public.historial_uploads ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY historial_uploads_anon_all ON public.historial_uploads FOR ALL TO anon USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY historial_uploads_auth_all ON public.historial_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Si sigue fallando (solo desarrollo), descomenta:
-- ALTER TABLE public.obras DISABLE ROW LEVEL SECURITY;
