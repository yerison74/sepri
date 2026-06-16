-- =============================================================================
-- Migración incremental — documentos_tecnicos_obra
-- Ejecutar si ya creaste las tablas con supabase-documentos-tecnicos.sql
-- =============================================================================

ALTER TABLE public.documentos_tecnicos_obra
  ADD COLUMN IF NOT EXISTS observacion text;

ALTER TABLE public.documentos_tecnicos_obra
  ADD COLUMN IF NOT EXISTS tipo_adenda_anterior varchar(120);

-- Migrar adenda_anterior → tipo_adenda_anterior si existía la columna anterior
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documentos_tecnicos_obra'
      AND column_name = 'adenda_anterior'
  ) THEN
    UPDATE public.documentos_tecnicos_obra
    SET tipo_adenda_anterior = adenda_anterior
    WHERE tipo_adenda_anterior IS NULL AND adenda_anterior IS NOT NULL;

    ALTER TABLE public.documentos_tecnicos_obra DROP COLUMN adenda_anterior;
  END IF;
END $$;

-- no_adenda_solicitud: varchar → integer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documentos_tecnicos_obra'
      AND column_name = 'no_adenda_solicitud'
      AND data_type IN ('character varying', 'text')
  ) THEN
    ALTER TABLE public.documentos_tecnicos_obra
      ALTER COLUMN no_adenda_solicitud TYPE integer
      USING CASE
        WHEN no_adenda_solicitud IS NULL OR trim(no_adenda_solicitud::text) = '' THEN NULL
        ELSE trim(no_adenda_solicitud::text)::integer
      END;
  END IF;
END $$;

COMMENT ON COLUMN public.documentos_tecnicos_obra.solicitud IS
  'Nombre de quien hace la solicitud (máx. 75 caracteres).';
COMMENT ON COLUMN public.documentos_tecnicos_obra.tipo_adenda_anterior IS
  'Tipo de adenda anterior (Equilibrio economico, Reformulacion de presupuesto, Extencion de vigencia).';
