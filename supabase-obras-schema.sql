-- Cambios de esquema para la tabla "obras" e "historial_estados".
-- Ejecutar este script en el editor SQL de Supabase.
-- Para Reporte de Obras + contratistas, ejecutar también: supabase-obras-reporte-schema.sql

-- 1) Campo contrato en obras (máx. 9 caracteres, guía: xxxx-xxxx)
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS contrato varchar(9);

-- 2) Campo tipo_obra en obras (Construccion, Mantenimiento, etc.)
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS tipo_obra text;

-- 3) Campo codigo en historial_estados para trazar por código de obra
ALTER TABLE historial_estados
ADD COLUMN IF NOT EXISTS codigo varchar(50);

-- 4) Estado de obra: valores como "INTERVENIDA MANTENIMIENTO" (26 caracteres) no caben en varchar(20).
--    Ejecutar si en la BD obras.estado sigue siendo varchar corto y falla o truncaba al guardar.
ALTER TABLE obras
ALTER COLUMN estado TYPE varchar(120);

-- 5) Nombre, responsable y ubicación (alinear con OBRA_CAMPO_STRING_MAX en supabaseService.ts).
--    Ejecutar solo si tus columnas siguen siendo varchar cortos.
ALTER TABLE obras
ALTER COLUMN nombre TYPE varchar(200);

ALTER TABLE obras
ALTER COLUMN responsable TYPE varchar(400);

ALTER TABLE obras
ALTER COLUMN provincia TYPE varchar(200);

ALTER TABLE obras
ALTER COLUMN municipio TYPE varchar(200);

ALTER TABLE obras
ALTER COLUMN nivel TYPE varchar(200);

ALTER TABLE obras
ALTER COLUMN distrito_minerd_sigede TYPE varchar(200);

-- 6) Textos largos: mejor `text` en Postgres para descripción y observaciones.
ALTER TABLE obras
ALTER COLUMN descripcion TYPE text;

ALTER TABLE obras
ALTER COLUMN observacion_legal TYPE text;

ALTER TABLE obras
ALTER COLUMN observacion_financiero TYPE text;

