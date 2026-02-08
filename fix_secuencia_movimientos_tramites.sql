-- ============================================================
-- Corregir secuencia de movimientos_tramites (error 23505)
-- ============================================================
-- Ejecuta este script en Supabase: SQL Editor > New query > Pegar y Run
--
-- Causa: La secuencia de "id" quedó por debajo del máximo id existente
--        (p. ej. después de restauración o inserciones manuales).
-- Solución: Ajustar la secuencia al máximo id actual + 1.
-- ============================================================

SELECT setval(
  pg_get_serial_sequence('movimientos_tramites', 'id'),
  COALESCE((SELECT MAX(id) FROM movimientos_tramites), 0) + 1
);
