-- ============================================
-- Script SQL para actualizar el esquema de Supabase
-- Ejecutar en Supabase SQL Editor
-- ============================================
-- Este script agrega la columna id_obra si no existe
-- IMPORTANTE: Ejecuta este script en Supabase SQL Editor

-- Verificar si la columna existe antes de agregarla
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'obras' 
    AND column_name = 'id_obra'
  ) THEN
    -- Agregar columna id_obra (OB-0001, MT-0001)
    ALTER TABLE obras 
    ADD COLUMN id_obra VARCHAR(50) UNIQUE;
    
    RAISE NOTICE 'Columna id_obra agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna id_obra ya existe';
  END IF;
END $$;

-- Crear índice para búsquedas rápidas por id_obra
CREATE INDEX IF NOT EXISTS idx_obras_id_obra ON obras(id_obra);

-- Actualizar comentarios para claridad (si tu versión de PostgreSQL lo soporta)
DO $$ 
BEGIN
  COMMENT ON COLUMN obras.id IS 'ID auto-incrementado de Supabase (clave primaria)';
  COMMENT ON COLUMN obras.id_obra IS 'ID de la obra (formato: OB-0001 o MT-0001)';
  COMMENT ON COLUMN obras.codigo IS 'Código de contrato (formato: número con guion, ej: 123-456)';
EXCEPTION
  WHEN OTHERS THEN
    -- Si los comentarios no están soportados, continuar sin error
    NULL;
END $$;

-- Si ya hay datos, puedes migrar codigo a id_obra si codigo tiene formato OB-XXXX o MT-XXXX
-- Descomenta la siguiente línea si necesitas migrar datos existentes:
-- UPDATE obras SET id_obra = codigo WHERE codigo ~ '^(OB|MT)-\d{4}$';
