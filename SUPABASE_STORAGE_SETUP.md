# Configuración de Supabase Storage para Carga de Archivos

## 📋 Pasos para Configurar Storage

### 1. Crear el Bucket en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Storage** en el menú lateral
3. Haz clic en **New bucket**
4. Configura el bucket:
   - **Name**: `uploads`
   - **Public bucket**: ✅ Marca esta opción (para permitir acceso)
   - Haz clic en **Create bucket**

### 2. Configurar Políticas de Storage

1. Ve a **Storage** > **Policies** en Supabase
2. Selecciona el bucket `uploads`
3. Crea una política para permitir uploads:

**Policy Name**: `Allow public uploads`

**Policy Definition**:
```sql
-- Permitir subir archivos
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'uploads');

-- Permitir leer archivos
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');
```

O usa la interfaz gráfica:
- **Operation**: `INSERT` (para subir)
- **Target roles**: `public`
- **Policy definition**: `bucket_id = 'uploads'`

Repite para `SELECT` (para leer).

### 3. Verificar la Configuración

El código ya está configurado para usar:
- **Bucket**: `uploads`
- **Rutas**: 
  - XML: `uploads/xml/{timestamp}-{filename}`
  - Excel: `uploads/excel/{timestamp}-{filename}`

## 🔄 Flujo de Carga de Archivos

1. **Usuario selecciona archivo** (XML o Excel)
2. **Validación local** (tipo y tamaño)
3. **Validación de estructura** (opcional, antes de subir)
4. **Subida a Supabase Storage** (opcional - si el bucket no existe, se omite)
5. **Procesamiento en frontend**:
   - Parsear XML/Excel
   - Extraer obras
   - Guardar en Supabase Database
6. **Registro en historial_uploads**

> **Nota importante**: El procesamiento de archivos funcionará **incluso si el bucket de Storage no existe**. Los archivos se procesarán y las obras se guardarán en la base de datos. La subida a Storage es opcional y solo sirve para mantener un respaldo de los archivos originales.

## 📝 Notas Importantes

- **Tamaño máximo**: 10MB (configurado en el código)
- **Formatos soportados**: `.xml`, `.xlsx`, `.xls`
- **Procesamiento**: Se hace completamente en el frontend
- **Almacenamiento**: Archivos se guardan en Supabase Storage
- **Base de datos**: Obras se guardan directamente en Supabase

## 🐛 Solución de Problemas

### Error: "Bucket not found"
- ⚠️ **Este error NO impide el procesamiento de archivos**
- El sistema procesará los archivos y guardará las obras en la base de datos
- Solo se omite el almacenamiento del archivo original en Storage
- Para habilitar el almacenamiento de archivos:
  1. Ve a Supabase Dashboard > Storage
  2. Crea un bucket llamado `uploads` (público)
  3. Configura las políticas como se indica arriba

### Error: "new row violates row-level security policy"
- Revisa las políticas de Storage en Supabase
- Asegúrate de que las políticas permitan INSERT y SELECT

### Error: "File too large"
- El límite es 10MB por archivo
- Considera dividir archivos grandes en múltiples archivos

### Error al procesar archivo
- Verifica que el formato XML/Excel sea correcto
- Revisa la consola del navegador para más detalles
- Asegúrate de que las tablas en Supabase estén creadas

## ✅ Verificación

Después de configurar, prueba:

1. Sube un archivo XML de prueba
2. Verifica que aparezca en Storage > uploads
3. Verifica que las obras se guarden en la tabla `obras`
4. Verifica que aparezca en `historial_uploads`
