# Migración: Agregar columna id_obra a Supabase

## Problema
La columna `id_obra` no existe en la tabla `obras` de Supabase, lo que causa errores al buscar obras por ID.

## Solución

### Opción 1: Ejecutar script SQL en Supabase (Recomendado)

1. Abre el **SQL Editor** en tu proyecto de Supabase
2. Copia y pega el siguiente script:

```sql
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
```

3. Ejecuta el script haciendo clic en "Run"

### Opción 2: Usar el archivo supabase-schema-actualizado.sql

El archivo `supabase-schema-actualizado.sql` contiene el script completo. Puedes ejecutarlo directamente en Supabase SQL Editor.

## Verificación

Después de ejecutar el script, verifica que la columna existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'obras' 
AND column_name = 'id_obra';
```

Deberías ver una fila con `id_obra` y tipo `character varying`.

## Notas

- La columna `id_obra` es opcional (puede ser NULL)
- Es UNIQUE, por lo que no puede haber dos obras con el mismo `id_obra`
- El formato esperado es: `OB-0001` o `MT-0001`
- Si ya tienes datos en `codigo` con formato OB-XXXX o MT-XXXX, puedes migrarlos:
  ```sql
  UPDATE obras SET id_obra = codigo WHERE codigo ~ '^(OB|MT)-\d{4}$';
  ```
