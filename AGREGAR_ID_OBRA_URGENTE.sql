-- ============================================
-- ⚠️ IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- Este script agrega la columna id_obra a la tabla obras
-- Formato requerido: OB-0000 o MT-0000 (4 dígitos)
-- ============================================

-- Paso 1: Agregar la columna id_obra
ALTER TABLE obras 
ADD COLUMN IF NOT EXISTS id_obra VARCHAR(50);

-- Paso 2: Hacer la columna única (después de agregarla)
-- Nota: Si ya hay datos duplicados, esto fallará. Ajusta según necesites.
DO $$ 
BEGIN
  -- Intentar agregar la restricción UNIQUE
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'obras_id_obra_key'
  ) THEN
    ALTER TABLE obras 
    ADD CONSTRAINT obras_id_obra_key UNIQUE (id_obra);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    RAISE NOTICE 'La restricción UNIQUE ya existe';
  WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo agregar la restricción UNIQUE: %', SQLERRM;
END $$;

-- Paso 3: Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_obras_id_obra ON obras(id_obra);

-- Paso 4: Verificar que la columna fue agregada correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'obras' 
AND column_name = 'id_obra';

-- Si la consulta anterior devuelve una fila, la columna fue agregada exitosamente
-- Si no devuelve nada, hubo un error
