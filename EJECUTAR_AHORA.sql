-- ============================================
-- ⚠️ EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Este script agrega la columna id_obra que falta
-- ============================================

-- Agregar columna id_obra
ALTER TABLE obras 
ADD COLUMN IF NOT EXISTS id_obra VARCHAR(50);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_obras_id_obra ON obras(id_obra);

-- Verificar que se agregó correctamente
SELECT 
    '✓ Columna agregada' AS estado,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'obras' 
AND column_name = 'id_obra';
