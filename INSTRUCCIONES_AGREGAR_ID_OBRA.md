# ⚠️ URGENTE: Agregar columna id_obra a Supabase

## Error Actual
```
column obras.id_obra does not exist
```

Este error ocurre porque la columna `id_obra` no existe en tu base de datos de Supabase.

## Solución Rápida

### Paso 1: Abre Supabase Dashboard
1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral

### Paso 2: Ejecuta el Script SQL

Copia y pega el siguiente script en el SQL Editor:

```sql
-- Agregar columna id_obra
ALTER TABLE obras 
ADD COLUMN IF NOT EXISTS id_obra VARCHAR(50);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_obras_id_obra ON obras(id_obra);

-- Hacer la columna única (opcional, descomenta si quieres)
-- ALTER TABLE obras ADD CONSTRAINT obras_id_obra_key UNIQUE (id_obra);
```

### Paso 3: Verificar

Ejecuta esta consulta para verificar que la columna existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'obras' 
AND column_name = 'id_obra';
```

Deberías ver una fila con `id_obra` y tipo `character varying`.

## Formato del ID

- **Formato requerido**: `OB-0000` o `MT-0000` (4 dígitos)
- **Ejemplos válidos**: 
  - `OB-0001`
  - `OB-2525`
  - `MT-0001`
  - `MT-1234`

## Archivos de Script

Si prefieres usar un archivo completo, ejecuta el contenido de:
- `AGREGAR_ID_OBRA_URGENTE.sql` (versión simple)
- `agregar-id-obra-oficial.sql` (versión con validaciones)

## Después de Ejecutar

Una vez que ejecutes el script:
1. Recarga la aplicación web
2. Prueba buscar una obra por ID (OB-0000 o MT-0000)
3. Verifica que el formulario de edición funcione correctamente
