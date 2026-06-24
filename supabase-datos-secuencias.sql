-- =============================================================================
-- SEPRI — Ajustar secuencias tras importar datos
-- =============================================================================
-- Ejecutar DESPUÉS de node scripts/import-supabase-datos.mjs
-- Evita errores de "duplicate key" al insertar filas nuevas con ID autogenerado.
-- =============================================================================

SELECT setval(
  pg_get_serial_sequence('public.historial_estados', 'id'),
  COALESCE((SELECT MAX(id) FROM public.historial_estados), 1)
);

SELECT setval(
  pg_get_serial_sequence('public.movimientos_tramites', 'id'),
  COALESCE((SELECT MAX(id) FROM public.movimientos_tramites), 1)
);

SELECT setval(
  pg_get_serial_sequence('public.historial_uploads', 'id'),
  COALESCE((SELECT MAX(id) FROM public.historial_uploads), 1)
);

SELECT setval(
  pg_get_serial_sequence('public.tiempo_en_area', 'id'),
  COALESCE((SELECT MAX(id) FROM public.tiempo_en_area), 1)
);

SELECT setval(
  pg_get_serial_sequence('public.notificaciones_tiempo', 'id'),
  COALESCE((SELECT MAX(id) FROM public.notificaciones_tiempo), 1)
);

SELECT setval(
  pg_get_serial_sequence('public.notificacion_leida', 'id'),
  COALESCE((SELECT MAX(id) FROM public.notificacion_leida), 1)
);

SELECT setval(
  pg_get_serial_sequence('public.movimientos_solicitud_contratista', 'id'),
  COALESCE((SELECT MAX(id) FROM public.movimientos_solicitud_contratista), 1)
);

SELECT setval(
  pg_get_serial_sequence('public.contratista_access_tokens', 'id'),
  COALESCE((SELECT MAX(id) FROM public.contratista_access_tokens), 1)
);

SELECT setval(
  'public.formulario_contratista_id_seq',
  GREATEST(
    COALESCE((
      SELECT MAX(
        NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint
      )
      FROM public.formulario_contratista
      WHERE id ~ '^FC-\d+$'
    ), 0),
    1
  )
);
