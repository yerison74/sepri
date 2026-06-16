-- =============================================================================
-- SEPRI — Storage bucket "documentos" + políticas RLS
-- =============================================================================
-- Error que corrige: "new row violates row-level security policy" al subir Excel/PDF
--
-- Ejecutar en Supabase → SQL Editor
-- NO uses ALTER TABLE storage.objects (da "must be owner of table objects")
-- =============================================================================

-- 1) Crear o actualizar bucket (público, sin restricción de MIME)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documentos', 'documentos', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = NULL;

-- 2) Quitar políticas anteriores de este proyecto (si existen)
DROP POLICY IF EXISTS "documentos_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "documentos_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "documentos_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "documentos_anon_delete" ON storage.objects;
DROP POLICY IF EXISTS "documentos_public_all" ON storage.objects;
DROP POLICY IF EXISTS "documentos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "documentos_public_insert" ON storage.objects;

-- 3) Política única permisiva para rol anon (la app usa anon key sin Supabase Auth)
CREATE POLICY "documentos_public_all"
  ON storage.objects
  FOR ALL
  TO public
  USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');

-- Si lo anterior falla al ejecutar, crea las políticas desde la UI:
-- Storage → documentos → Policies → New policy → "For full customization"
--   Policy name: documentos allow all
--   Allowed operation: ALL (o INSERT + SELECT por separado)
--   Target roles: anon (y authenticated si quieres)
--   USING expression: bucket_id = 'documentos'
--   WITH CHECK expression: bucket_id = 'documentos'
