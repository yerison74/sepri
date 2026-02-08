-- ============================================
-- Script SQL para eliminar la columna id_obra de Supabase
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Eliminar el índice primero
DROP INDEX IF EXISTS idx_obras_id_obra;

-- Eliminar la columna id_obra
ALTER TABLE obras 
DROP COLUMN IF EXISTS id_obra;

-- Verificar que la columna fue eliminada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'obras' 
ORDER BY ordinal_position;
