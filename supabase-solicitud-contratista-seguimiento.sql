-- Migración: flujo de solicitud contratista (área asignada + seguimiento entre áreas)
-- Ejecutar en Supabase si ya tenías la tabla formulario_contratista sin estas columnas.

ALTER TABLE formulario_contratista
  ADD COLUMN IF NOT EXISTS area_actual text,
  ADD COLUMN IF NOT EXISTS estado text;

UPDATE formulario_contratista
SET estado = 'pendiente_asignacion'
WHERE estado IS NULL;

ALTER TABLE formulario_contratista
  ALTER COLUMN estado SET DEFAULT 'pendiente_asignacion';

ALTER TABLE formulario_contratista
  ALTER COLUMN estado SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'formulario_contratista_estado_check'
  ) THEN
    ALTER TABLE formulario_contratista
      ADD CONSTRAINT formulario_contratista_estado_check CHECK (
        estado IN ('pendiente_asignacion', 'en_seguimiento', 'detenido', 'completado')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS movimientos_solicitud_contratista (
  id bigserial PRIMARY KEY,
  solicitud_id text NOT NULL REFERENCES formulario_contratista(id) ON DELETE CASCADE,
  area_origen text NOT NULL,
  area_destino text NOT NULL,
  nota text,
  estado_resultante text CHECK (
    estado_resultante IS NULL OR estado_resultante IN ('detenido', 'completado')
  ),
  usuario text,
  fecha_movimiento timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_solicitud_contratista_solicitud
  ON movimientos_solicitud_contratista (solicitud_id);
