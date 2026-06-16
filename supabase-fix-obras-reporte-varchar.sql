-- =============================================================================
-- SEPRI — Corregir error 22001 al ejecutar supabase-obras-reporte-schema.sql
-- =============================================================================
-- Causa: el script original reducía columnas a varchar(100) con datos más largos
-- (nombre 200, provincia 200, responsable 400, etc.).
-- Ejecutar COMPLETO en Supabase → SQL Editor.
-- =============================================================================

-- Si contratistas ya se creó con responsable varchar(100), ampliar
DO $$
BEGIN
  IF to_regclass('public.contratistas') IS NOT NULL THEN
    ALTER TABLE public.contratistas
      ALTER COLUMN responsable TYPE varchar(400);
  END IF;
END $$;

-- Restaurar tamaños seguros en obras (solo ampliar, nunca acortar)
ALTER TABLE public.obras ALTER COLUMN codigo TYPE varchar(100);
ALTER TABLE public.obras ALTER COLUMN tipo_obra TYPE varchar(100);
ALTER TABLE public.obras ALTER COLUMN estado TYPE varchar(120);
ALTER TABLE public.obras ALTER COLUMN nombre TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN provincia TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN municipio TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN nivel TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN latitud TYPE varchar(100);
ALTER TABLE public.obras ALTER COLUMN longitud TYPE varchar(100);
ALTER TABLE public.obras ALTER COLUMN distrito_minerd_sigede TYPE varchar(200);

ALTER TABLE public.obras
  ALTER COLUMN descripcion TYPE text,
  ALTER COLUMN observacion_legal TYPE text,
  ALTER COLUMN observacion_financiero TYPE text;

-- Completar migración responsable → contratistas (si aún existe la columna)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'obras' AND column_name = 'responsable'
  ) THEN
    INSERT INTO public.contratistas (responsable)
    SELECT DISTINCT left(trim(o.responsable), 400)
    FROM public.obras o
    WHERE o.responsable IS NOT NULL
      AND trim(o.responsable) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.contratistas c
        WHERE lower(trim(c.responsable)) = lower(left(trim(o.responsable), 400))
      );

    UPDATE public.obras o
    SET contratista_id = c.id
    FROM public.contratistas c
    WHERE o.contratista_id IS NULL
      AND o.responsable IS NOT NULL
      AND trim(o.responsable) <> ''
      AND lower(trim(c.responsable)) = lower(left(trim(o.responsable), 400));

    ALTER TABLE public.obras DROP COLUMN responsable;
  END IF;
END $$;

-- RLS contratistas (por si no se aplicó)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratistas TO anon, authenticated;
ALTER TABLE public.contratistas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contratistas_anon_all ON public.contratistas;
CREATE POLICY contratistas_anon_all
  ON public.contratistas FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

SELECT 'OK — varchar corregidos' AS resultado;
