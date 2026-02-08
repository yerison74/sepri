# Configuración de Supabase

Este documento explica cómo configurar Supabase para la aplicación web-admin.

## 📋 Pasos para Configurar Supabase

### 1. Crear las Tablas en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Abre el archivo `supabase-schema.sql` en este directorio
4. Copia y pega todo el contenido del archivo en el editor SQL
5. Haz clic en **Run** para ejecutar el script

Esto creará todas las tablas necesarias:
- `obras` - Tabla principal de obras/mantenimientos
- `historial_estados` - Historial de cambios de estado
- `tramites` - Trámites del sistema
- `movimientos_tramites` - Movimientos de trámites
- `historial_uploads` - Historial de archivos subidos

### 2. Verificar las Variables de Entorno

Asegúrate de que el archivo `.env` en `web-admin/` contenga:

```env
REACT_APP_SUPABASE_URL=https://tdihavrizkkbfpttbkyp.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Configurar Row Level Security (RLS)

El script SQL ya incluye políticas básicas de RLS que permiten todas las operaciones. **Para producción**, deberías:

1. Ir a **Authentication > Policies** en Supabase
2. Revisar y ajustar las políticas según tus necesidades de seguridad
3. Considerar implementar autenticación de usuarios

### 4. Configurar Storage (Opcional)

Si necesitas subir archivos (PDFs, imágenes, etc.):

1. Ve a **Storage** en Supabase Dashboard
2. Crea un bucket llamado `uploads` (o el nombre que prefieras)
3. Configura las políticas de acceso según necesites

### 5. Reiniciar la Aplicación

Después de configurar todo:

```bash
cd web-admin
npm start
```

## 🔄 Migración de Datos

Si tienes datos en el backend SQLite y quieres migrarlos a Supabase:

1. Exporta los datos del backend SQLite
2. Usa el SQL Editor de Supabase para insertar los datos
3. O crea un script de migración usando el servicio de Supabase

## 📝 Notas Importantes

- **Desarrollo**: Las políticas RLS están configuradas para permitir todo (desarrollo)
- **Producción**: Debes configurar políticas más restrictivas
- **Backend Local**: Algunas funciones (como uploads de XML/Excel) aún usan el backend local
- **Storage**: Los archivos grandes pueden requerir configuración adicional en Supabase

## 🐛 Solución de Problemas

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error: "relation does not exist"
- Asegúrate de haber ejecutado el script SQL en Supabase
- Verifica que las tablas se crearon correctamente en el SQL Editor

### Error: "new row violates row-level security policy"
- Revisa las políticas RLS en Supabase
- Asegúrate de que las políticas permitan la operación que intentas realizar

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
