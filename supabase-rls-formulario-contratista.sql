-- =============================================================================
-- RLS: formulario_contratista + movimientos_solicitud_contratista
-- =============================================================================
--
-- CONTEXTO
-- --------
-- Hoy la app React inicia sesión contra la tabla `usuarios_app` con la clave
-- anónima (sin Supabase Auth). En ese caso auth.uid() es NULL y las políticas
-- "TO authenticated" NO aplican.
--
-- OPCIONES:
-- 1) RECOMENDADO: Migrar el login a Supabase Auth y usar el mismo `id` (uuid)
--    en `usuarios_app.id` que `auth.users.id` (text cast uuid::text si aplica).
--    Luego quite las políticas provisionales "anon" del final de este script.
--
-- 2) PROVISIONAL: Mantener políticas "anon" USING (true) — misma confianza que
--    antes de RLS; sirve para no romper el cliente hasta migrar Auth.
--
-- REQUISITO para políticas estrictas
-- ----------------------------------
-- usuarios_app debe tener: id (text o uuid), area (text), rol (text), activo (bool)
-- Roles con acceso total: 'admin', 'supervision' (igual que en el front).
--
-- =============================================================================

-- Quitar políticas anteriores si re-ejecutas el script
DROP POLICY IF EXISTS "fc_select_authenticated" ON public.formulario_contratista;
DROP POLICY IF EXISTS "fc_insert_authenticated" ON public.formulario_contratista;
DROP POLICY IF EXISTS "fc_update_authenticated" ON public.formulario_contratista;
DROP POLICY IF EXISTS "fc_anon_provisional_all" ON public.formulario_contratista;

DROP POLICY IF EXISTS "mov_select_authenticated" ON public.movimientos_solicitud_contratista;
DROP POLICY IF EXISTS "mov_insert_authenticated" ON public.movimientos_solicitud_contratista;
DROP POLICY IF EXISTS "mov_anon_provisional_all" ON public.movimientos_solicitud_contratista;

ALTER TABLE public.formulario_contratista ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_solicitud_contratista ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Sesión: usuario actual enlazado a auth.uid()::text = usuarios_app.id
-- -----------------------------------------------------------------------------

-- SELECT: admin/supervision ven todo; resto solo filas con area_actual = su area
--         (pendiente_asignacion suele tener area_actual NULL → solo admin/supervision)
CREATE POLICY "fc_select_authenticated"
  ON public.formulario_contratista
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios_app u
      WHERE (u.id)::text = (SELECT auth.uid()::text)
        AND COALESCE(u.activo, true) = true
        AND (
          lower(trim(u.rol)) IN ('admin', 'supervision')
          OR (
            formulario_contratista.area_actual IS NOT NULL
            AND formulario_contratista.area_actual = u.area
          )
        )
    )
  );

-- INSERT: cualquier usuario activo en usuarios_app (ajusta si quieres solo admin)
CREATE POLICY "fc_insert_authenticated"
  ON public.formulario_contratista
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios_app u
      WHERE (u.id)::text = (SELECT auth.uid()::text)
        AND COALESCE(u.activo, true) = true
    )
  );

-- UPDATE: admin/supervision; o usuario cuyo área coincide con area_actual;
--         o fila pendiente de asignación solo para admin/supervision
CREATE POLICY "fc_update_authenticated"
  ON public.formulario_contratista
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios_app u
      WHERE (u.id)::text = (SELECT auth.uid()::text)
        AND COALESCE(u.activo, true) = true
        AND (
          lower(trim(u.rol)) IN ('admin', 'supervision')
          OR (
            formulario_contratista.area_actual IS NOT NULL
            AND formulario_contratista.area_actual = u.area
          )
          OR (
            formulario_contratista.estado = 'pendiente_asignacion'
            AND lower(trim(u.rol)) IN ('admin', 'supervision')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios_app u
      WHERE (u.id)::text = (SELECT auth.uid()::text)
        AND COALESCE(u.activo, true) = true
    )
  );

-- Movimientos: lectura si puede leer la solicitud padre
CREATE POLICY "mov_select_authenticated"
  ON public.movimientos_solicitud_contratista
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.formulario_contratista f
      JOIN public.usuarios_app u ON (u.id)::text = (SELECT auth.uid()::text)
      WHERE f.id = movimientos_solicitud_contratista.solicitud_id
        AND COALESCE(u.activo, true) = true
        AND (
          lower(trim(u.rol)) IN ('admin', 'supervision')
          OR (
            f.area_actual IS NOT NULL
            AND f.area_actual = u.area
          )
        )
    )
  );

-- INSERT movimiento: misma idea que poder actuar sobre la solicitud
CREATE POLICY "mov_insert_authenticated"
  ON public.movimientos_solicitud_contratista
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.formulario_contratista f
      JOIN public.usuarios_app u ON (u.id)::text = (SELECT auth.uid()::text)
      WHERE f.id = movimientos_solicitud_contratista.solicitud_id
        AND COALESCE(u.activo, true) = true
        AND (
          lower(trim(u.rol)) IN ('admin', 'supervision')
          OR (
            f.area_actual IS NOT NULL
            AND f.area_actual = u.area
          )
          OR (
            f.estado = 'pendiente_asignacion'
            AND lower(trim(u.rol)) IN ('admin', 'supervision')
          )
        )
    )
  );

-- =============================================================================
-- PROVISIONAL: clave anónima sin Supabase Auth (auth.uid() NULL)
-- =============================================================================
-- Quita estas dos políticas cuando el cliente use sesión Supabase Auth y
-- usuarios_app.id = auth.users.id.
-- =============================================================================

CREATE POLICY "fc_anon_provisional_all"
  ON public.formulario_contratista
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "mov_anon_provisional_all"
  ON public.movimientos_solicitud_contratista
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Permisos en tablas (Supabase suele tenerlos ya; ejecuta solo si fallan inserts)
-- GRANT SELECT, INSERT, UPDATE ON public.formulario_contratista TO anon, authenticated;
-- GRANT SELECT, INSERT ON public.movimientos_solicitud_contratista TO anon, authenticated;
-- Secuencias del id autogenerado (nombres por defecto de PostgreSQL):
-- GRANT USAGE, SELECT ON SEQUENCE public.formulario_contratista_id_seq TO anon, authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE public.movimientos_solicitud_contratista_id_seq TO anon, authenticated;
