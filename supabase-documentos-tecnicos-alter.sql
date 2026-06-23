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



ALTER TABLE public.documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS numero_adenda_anterior integer;



COMMENT ON COLUMN public.documentos_tecnicos_obra.numero_adenda_anterior IS

  'Número de la adenda anterior.';



ALTER TABLE public.documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS monto_contrato_base numeric(18, 2);



ALTER TABLE public.documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS monto_adenda_anterior numeric(18, 2);



ALTER TABLE public.documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS monto_adenda_solicitada numeric(18, 2);



ALTER TABLE public.documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS monto_total numeric(18, 2);



COMMENT ON COLUMN public.documentos_tecnicos_obra.monto_contrato_base IS

  'Monto del contrato base en pesos dominicanos (DOP).';

COMMENT ON COLUMN public.documentos_tecnicos_obra.monto_adenda_anterior IS

  'Monto de la adenda anterior en DOP.';

COMMENT ON COLUMN public.documentos_tecnicos_obra.monto_adenda_solicitada IS

  'Monto de la adenda solicitada en DOP.';

COMMENT ON COLUMN public.documentos_tecnicos_obra.monto_total IS

  'Monto total en DOP.';



ALTER TABLE public.movimiento_documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS fecha_entrada date;



-- Recargar caché de PostgREST para que reconozca la nueva columna de inmediato

NOTIFY pgrst, 'reload schema';



-- no_adenda_solicitud → no_adenda_solicituda (cantidad de adendas acumuladas)

DO $$

BEGIN

  IF EXISTS (

    SELECT 1 FROM information_schema.columns

    WHERE table_schema = 'public'

      AND table_name = 'documentos_tecnicos_obra'

      AND column_name = 'no_adenda_solicitud'

  ) AND NOT EXISTS (

    SELECT 1 FROM information_schema.columns

    WHERE table_schema = 'public'

      AND table_name = 'documentos_tecnicos_obra'

      AND column_name = 'no_adenda_solicituda'

  ) THEN

    ALTER TABLE public.documentos_tecnicos_obra

      RENAME COLUMN no_adenda_solicitud TO no_adenda_solicituda;

  END IF;

END $$;



ALTER TABLE public.documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS no_adenda_solicituda integer;



COMMENT ON COLUMN public.documentos_tecnicos_obra.no_adenda_solicituda IS

  'Cantidad de adendas que lleva el documento hasta el momento.';



-- numero_adenda_anterior: código formato NNNN-NNNN (1 a 4 dígitos, guion, 1 a 4 dígitos)

DO $$

BEGIN

  IF EXISTS (

    SELECT 1 FROM information_schema.columns

    WHERE table_schema = 'public'

      AND table_name = 'documentos_tecnicos_obra'

      AND column_name = 'numero_adenda_anterior'

      AND data_type = 'integer'

  ) THEN

    ALTER TABLE public.documentos_tecnicos_obra

      ALTER COLUMN numero_adenda_anterior TYPE varchar(12)

      USING CASE

        WHEN numero_adenda_anterior IS NULL THEN NULL

        ELSE numero_adenda_anterior::text

      END;

  END IF;

END $$;



ALTER TABLE public.documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS numero_adenda_anterior varchar(12);



ALTER TABLE public.documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS numero_adenda_actual varchar(12);



COMMENT ON COLUMN public.documentos_tecnicos_obra.numero_adenda_anterior IS

  'Código de la adenda anterior (ej. 1234-5678).';

COMMENT ON COLUMN public.documentos_tecnicos_obra.numero_adenda_actual IS

  'Código de la adenda actual (ej. 1234-5678).';



DROP INDEX IF EXISTS public.idx_mov_doc_tecnicos_solicitud_tramite;



ALTER TABLE public.movimiento_documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS oficio varchar(120);



ALTER TABLE public.movimiento_documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS estatus varchar(40);



COMMENT ON COLUMN public.movimiento_documentos_tecnicos_obra.oficio IS

  'Número o referencia de oficio del movimiento.';

COMMENT ON COLUMN public.movimiento_documentos_tecnicos_obra.estatus IS

  'En Proceso, Detenida o Certificada.';



CREATE INDEX IF NOT EXISTS idx_mov_doc_tecnicos_solicitud_tramite

  ON public.movimiento_documentos_tecnicos_obra(solicitud, lower(trim(no_tramite)))

  WHERE no_tramite IS NOT NULL AND trim(no_tramite) <> '';



ALTER TABLE public.movimiento_documentos_tecnicos_obra

  ADD COLUMN IF NOT EXISTS observaciones text;



COMMENT ON COLUMN public.movimiento_documentos_tecnicos_obra.observaciones IS

  'Notas u observaciones del movimiento (gestión técnica de documento).';



NOTIFY pgrst, 'reload schema';

