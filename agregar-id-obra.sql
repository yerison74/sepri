-- ============================================
-- Script para agregar columna id_obra a Supabase
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Agregar columna id_obra si no existe
ALTER TABLE obras 
ADD COLUMN IF NOT EXISTS id_obra VARCHAR(50);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_obras_id_obra ON obras(id_obra);

-- Hacer la columna única (opcional, descomenta si quieres que sea única)
-- ALTER TABLE obras ADD CONSTRAINT unique_id_obra UNIQUE (id_obra);
