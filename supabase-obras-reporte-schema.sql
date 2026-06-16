-- =============================================================================
-- SEPRI — Esquema Reporte de Obras: tabla contratistas + campos nuevos en obras
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (después de supabase-obras-schema.sql)
--
-- Áreas del reporte:
--   PLANTEL, CONSTRUCCIÓN, UBICACIÓN, CONTRATISTA (tabla aparte), PRESUPUESTO,
--   CUBICACIÓN, TIEMPOS, SNIP, OBSERVACIONES
-- =============================================================================

-- ── 1) Tabla contratistas (responsable y datos de contacto) ─────────────────
-- responsable: hasta 400 (mismo cupo que tenía obras.responsable)
CREATE TABLE IF NOT EXISTS public.contratistas (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  responsable     varchar(400) NOT NULL,
  identificacion  varchar(100),
  telefono1       varchar(100),
  telefono2       varchar(100),
  correo          varchar(100),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contratistas_responsable_unique
  ON public.contratistas (lower(trim(responsable)));

-- ── 2) FK en obras hacia contratistas ─────────────────────────────────────────
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS contratista_id text REFERENCES public.contratistas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_obras_contratista_id ON public.obras (contratista_id);

-- ── 3) Campos nuevos en obras (celdas naranja del reporte) ────────────────────

-- PLANTEL
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS nombre_inaugurado varchar(100);

-- CONSTRUCCIÓN
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS sorteo varchar(100),
  ADD COLUMN IF NOT EXISTS area_construccion varchar(100),
  ADD COLUMN IF NOT EXISTS coordinador varchar(100),
  ADD COLUMN IF NOT EXISTS supervisor varchar(100),
  ADD COLUMN IF NOT EXISTS porcentaje_ejecutado numeric(7, 2);

-- PRESUPUESTO
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS presupuesto_total numeric(18, 2),
  ADD COLUMN IF NOT EXISTS avance_inicial numeric(18, 2);

-- CUBICACIÓN
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS numero_ultima_cubicacion varchar(100),
  ADD COLUMN IF NOT EXISTS tipo_ultima_cubicacion varchar(100),
  ADD COLUMN IF NOT EXISTS estatus_ultima_cubicacion varchar(100),
  ADD COLUMN IF NOT EXISTS grupo_ultimo_estatus_cubicacion varchar(100),
  ADD COLUMN IF NOT EXISTS total_ultima_cubicacion numeric(18, 2),
  ADD COLUMN IF NOT EXISTS ultima_total_cubicado numeric(18, 2),
  ADD COLUMN IF NOT EXISTS total_cubicado_base numeric(18, 2),
  ADD COLUMN IF NOT EXISTS total_pagado numeric(18, 2);

-- TIEMPOS
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS fecha_detenida date;

-- SNIP
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS envio_snip varchar(100),
  ADD COLUMN IF NOT EXISTS monto_snip numeric(18, 2),
  ADD COLUMN IF NOT EXISTS modificacion_snip varchar(100);

-- ── 4) Alinear varchar existentes (mínimo 100, sin reducir datos actuales) ───
-- Solo AMPLIAR columnas; no acortar (evita error 22001).
ALTER TABLE public.obras
  ALTER COLUMN codigo TYPE varchar(100);

ALTER TABLE public.obras
  ALTER COLUMN tipo_obra TYPE varchar(100);

ALTER TABLE public.obras
  ALTER COLUMN estado TYPE varchar(120);

ALTER TABLE public.obras
  ALTER COLUMN nombre TYPE varchar(200);

ALTER TABLE public.obras
  ALTER COLUMN provincia TYPE varchar(200);

ALTER TABLE public.obras
  ALTER COLUMN municipio TYPE varchar(200);

ALTER TABLE public.obras
  ALTER COLUMN nivel TYPE varchar(200);

ALTER TABLE public.obras
  ALTER COLUMN latitud TYPE varchar(100);

ALTER TABLE public.obras
  ALTER COLUMN longitud TYPE varchar(100);

ALTER TABLE public.obras
  ALTER COLUMN distrito_minerd_sigede TYPE varchar(200);

-- contrato mantiene formato xxxx-xxxx (9 caracteres)
-- descripción y observaciones: text (sin límite práctico)
ALTER TABLE public.obras
  ALTER COLUMN descripcion TYPE text,
  ALTER COLUMN observacion_legal TYPE text,
  ALTER COLUMN observacion_financiero TYPE text;

-- ── 5) Migrar obras.responsable → contratistas + contratista_id ─────────────
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

    ALTER TABLE public.obras DROP COLUMN IF EXISTS responsable;
  END IF;
END $$;

-- ── 6) RLS anon (misma política que otras tablas de la app) ─────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratistas TO anon, authenticated;
ALTER TABLE public.contratistas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contratistas_anon_all ON public.contratistas;
CREATE POLICY contratistas_anon_all
  ON public.contratistas FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Verificación
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'obras'
ORDER BY ordinal_position;
