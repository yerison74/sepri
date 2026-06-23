-- Obras (SIGEDE) relacionadas a un trámite de seguimiento
ALTER TABLE public.tramites
  ADD COLUMN IF NOT EXISTS id_sigede text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.tramites.id_sigede IS
  'Códigos SIGEDE (codigo o distrito_minerd_sigede) de obras vinculadas al trámite.';
