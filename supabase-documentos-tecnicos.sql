-- =============================================================================
-- SEPRI — Gestión técnica de documento
-- Tablas: documentos_tecnicos_obra + movimiento_documentos_tecnicos_obra
-- Ejecutar en Supabase → SQL Editor
-- Después: supabase-rls-app-anon.sql (incluye RLS de ambas tablas)
-- =============================================================================

-- Migración desde esquema anterior (archivos por obra)
DROP TABLE IF EXISTS public.movimiento_documentos_tecnicos_obra CASCADE;
DROP TABLE IF EXISTS public.documentos_tecnicos_obra CASCADE;

CREATE TABLE public.documentos_tecnicos_obra (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud           varchar(75) NOT NULL,
  cuadrantes          varchar(120),
  tipo_adenda         varchar(120),
  no_adenda_solicituda integer,
  contratista_id      text REFERENCES public.contratistas(id) ON DELETE SET NULL,
  /** Varios ID SIGEDE en la misma solicitud (código de obra o distrito MINERD/SIGEDE) */
  id_sigede           text[] NOT NULL DEFAULT '{}',
  tipo_adenda_anterior varchar(120),
  numero_adenda_anterior   varchar(12),
  numero_adenda_actual     varchar(12),
  observacion         text,
  monto_contrato_base      numeric(18, 2),
  monto_adenda_anterior    numeric(18, 2),
  monto_adenda_solicitada  numeric(18, 2),
  monto_total              numeric(18, 2),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documentos_tecnicos_obra_solicitud_unique UNIQUE (solicitud)
);

CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_solicitud
  ON public.documentos_tecnicos_obra(solicitud);
CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_contratista
  ON public.documentos_tecnicos_obra(contratista_id);

CREATE TABLE public.movimiento_documentos_tecnicos_obra (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud       varchar(75) NOT NULL
                    REFERENCES public.documentos_tecnicos_obra(solicitud) ON DELETE CASCADE,
  fecha_solicitud date,
  fecha_entrada   date,
  no_tramite      varchar(120),
  oficio          varchar(120),
  estatus         varchar(40),
  departamento    text REFERENCES public.area(id) ON DELETE SET NULL,
  fecha_salida    date,
  observaciones   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_doc_tecnicos_solicitud
  ON public.movimiento_documentos_tecnicos_obra(solicitud);
CREATE INDEX IF NOT EXISTS idx_mov_doc_tecnicos_departamento
  ON public.movimiento_documentos_tecnicos_obra(departamento);
CREATE INDEX IF NOT EXISTS idx_mov_doc_tecnicos_solicitud_tramite
  ON public.movimiento_documentos_tecnicos_obra(solicitud, lower(trim(no_tramite)))
  WHERE no_tramite IS NOT NULL AND trim(no_tramite) <> '';

COMMENT ON TABLE public.documentos_tecnicos_obra IS
  'Registro base de solicitudes/documentos técnicos (gestión técnica de documento).';
COMMENT ON COLUMN public.documentos_tecnicos_obra.solicitud IS
  'Nombre de quien hace la solicitud (máx. 75 caracteres).';
COMMENT ON TABLE public.movimiento_documentos_tecnicos_obra IS
  'Movimientos u oficios asociados a cada solicitud de documento técnico.';
