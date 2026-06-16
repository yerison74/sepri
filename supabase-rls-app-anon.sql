-- =============================================================================
-- SEPRI — Políticas RLS en tablas public (clave anon / sin Supabase Auth)
-- =============================================================================
-- Ejecutar COMPLETO en Supabase → SQL Editor
-- Incluye obras, tramites, historial_uploads, usuarios_app, etc.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sepri_rls_anon_all(p_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE pol record;
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RAISE NOTICE 'Tabla public.% no existe — omitida', p_table;
    RETURN;
  END IF;

  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', p_table);

  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);
  END LOOP;

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)',
    p_table || '_anon_select', p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR INSERT TO anon WITH CHECK (true)',
    p_table || '_anon_insert', p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)',
    p_table || '_anon_update', p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR DELETE TO anon USING (true)',
    p_table || '_anon_delete', p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
    p_table || '_auth_all', p_table
  );

  RAISE NOTICE 'RLS anon configurado en public.%', p_table;
END;
$$;

SELECT public.sepri_rls_anon_all('obras');
SELECT public.sepri_rls_anon_all('tramites');
SELECT public.sepri_rls_anon_all('movimientos_tramites');
SELECT public.sepri_rls_anon_all('historial_uploads');
SELECT public.sepri_rls_anon_all('usuarios_app');
SELECT public.sepri_rls_anon_all('area');
SELECT public.sepri_rls_anon_all('formulario_contratista');
SELECT public.sepri_rls_anon_all('movimientos_solicitud_contratista');
SELECT public.sepri_rls_anon_all('contratista_access_tokens');
SELECT public.sepri_rls_anon_all('tiempo_en_area');
SELECT public.sepri_rls_anon_all('notificaciones_tiempo');
SELECT public.sepri_rls_anon_all('notificacion_leida');
SELECT public.sepri_rls_anon_all('historial_estados');
SELECT public.sepri_rls_anon_all('contratistas');

DROP FUNCTION public.sepri_rls_anon_all(text);

-- Realtime (opcional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tramites;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.movimientos_tramites;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
