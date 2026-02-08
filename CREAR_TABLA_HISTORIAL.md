# Crear Tabla historial_uploads en Supabase

## ⚠️ Error: Tabla no encontrada

Si ves el error: `Could not find the table 'public.historial_uploads'`, significa que la tabla no ha sido creada en Supabase.

## ✅ Solución Rápida

### Opción 1: Ejecutar el Script SQL Completo

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Abre el archivo `supabase-schema.sql` en este proyecto
5. Copia y pega **todo el contenido** del archivo
6. Haz clic en **Run**

Esto creará todas las tablas incluyendo `historial_uploads`.

### Opción 2: Crear Solo la Tabla historial_uploads

Si solo quieres crear esta tabla, ejecuta este SQL en Supabase:

```sql
-- Tabla de historial de uploads (para tracking de archivos subidos)
CREATE TABLE IF NOT EXISTS historial_uploads (
  id SERIAL PRIMARY KEY,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_archivo VARCHAR(50) NOT NULL,
  fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registros_procesados INTEGER DEFAULT 0,
  registros_exitosos INTEGER DEFAULT 0,
  registros_fallidos INTEGER DEFAULT 0,
  usuario VARCHAR(100),
  observaciones TEXT
);

-- Índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_historial_uploads_fecha ON historial_uploads(fecha_subida);

-- Habilitar RLS
ALTER TABLE historial_uploads ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (desarrollo)
CREATE POLICY "Allow all operations on historial_uploads" ON historial_uploads
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 📝 Nota Importante

**El procesamiento de archivos funcionará incluso sin esta tabla.** La tabla `historial_uploads` es opcional y solo se usa para:
- Registrar qué archivos se han subido
- Guardar estadísticas de procesamiento
- Mantener un historial de uploads

Si no creas la tabla, verás un warning en la consola pero el procesamiento continuará normalmente.

## ✅ Verificación

Después de crear la tabla:

1. Intenta subir un archivo nuevamente
2. Verifica que no aparezca el error en la consola
3. Ve a Supabase > Table Editor > `historial_uploads`
4. Deberías ver el registro del upload
