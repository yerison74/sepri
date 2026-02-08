-- ============================================
-- Script SQL para buscar la obra OB-2525 en Supabase
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Buscar por código exacto
SELECT * 
FROM obras 
WHERE codigo = 'OB-2525'
LIMIT 5;

-- Si no encuentra nada, buscar con LIKE (búsqueda parcial)
SELECT * 
FROM obras 
WHERE codigo ILIKE '%OB-2525%'
   OR codigo ILIKE '%2525%'
LIMIT 10;

-- Buscar en todos los campos de texto
SELECT * 
FROM obras 
WHERE codigo ILIKE '%OB-2525%'
   OR codigo ILIKE '%2525%'
   OR nombre ILIKE '%OB-2525%'
   OR nombre ILIKE '%2525%'
   OR descripcion ILIKE '%OB-2525%'
   OR descripcion ILIKE '%2525%'
LIMIT 10;

-- Listar algunas obras para referencia (ver qué códigos existen)
SELECT 
  id,
  codigo,
  nombre,
  estado,
  responsable,
  provincia,
  municipio,
  created_at
FROM obras 
ORDER BY id DESC
LIMIT 20;
