-- Cambios de esquema para la tabla "obras" e "historial_estados".
-- Ejecutar este script en el editor SQL de Supabase.

-- 1) Campo contrato en obras (máx. 9 caracteres, guía: xxxx-xxxx)
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS contrato varchar(9);

-- 2) Campo tipo_obra en obras (Construccion, Mantenimiento, etc.)
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS tipo_obra text;

-- 3) Campo codigo en historial_estados para trazar por código de obra
ALTER TABLE historial_estados
ADD COLUMN IF NOT EXISTS codigo varchar(50);

