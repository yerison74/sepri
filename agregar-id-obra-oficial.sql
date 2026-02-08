-- ============================================
-- Script SQL para agregar columna id_obra a Supabase
-- Formato: OB-0000 o MT-0000 (4 dígitos)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Verificar si la columna existe antes de agregarla
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'obras' 
    AND column_name = 'id_obra'
  ) THEN
    -- Agregar columna id_obra (OB-0000, MT-0000)
    ALTER TABLE obras 
    ADD COLUMN id_obra VARCHAR(50) UNIQUE;
    
    RAISE NOTICE 'Columna id_obra agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna id_obra ya existe';
  END IF;
END $$;

-- Crear índice para búsquedas rápidas por id_obra
CREATE INDEX IF NOT EXISTS idx_obras_id_obra ON obras(id_obra);

-- Verificar que la columna fue agregada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'obras' 
AND column_name = 'id_obra';
