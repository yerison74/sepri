# Estructura de la Tabla `obras` en Supabase

## Resumen de Columnas

La tabla `obras` contiene **20 columnas** en total. A continuación se detalla cada una:

---

## Columnas de la Tabla

### 1. **id** (PRIMARY KEY)
- **Tipo**: `SERIAL` (INTEGER auto-incrementado)
- **Obligatorio**: ✅ Sí (PRIMARY KEY)
- **Descripción**: ID interno auto-incrementado de Supabase. Clave primaria de la tabla.
- **Ejemplo**: `1`, `2`, `123`

---

### 2. **id_obra**
- **Tipo**: `VARCHAR(50)`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Único**: ✅ Sí (UNIQUE)
- **Descripción**: ID de la obra en el sistema (formato: OB-0000 o MT-0000). 
- **Nota**: En la API externa este campo se llama `id`, pero en Supabase se llama `id_obra`.
- **Ejemplo**: `OB-2525`, `MT-0001`, `OB-1234`
- **Estado actual**: ⚠️ Esta columna puede no existir en tu base de datos actual. Si no existe, el ID del sistema se almacena en el campo `codigo`.

---

### 3. **codigo**
- **Tipo**: `VARCHAR(50)`
- **Obligatorio**: ✅ Sí (NOT NULL)
- **Único**: ✅ Sí (UNIQUE)
- **Descripción**: Código de contrato o identificador alternativo de la obra.
- **Formato**: Generalmente formato `0000-0000` o puede contener IDs del sistema (OB-0000, MT-0000).
- **Ejemplo**: `1234-5678`, `OB-2525`, `2525-0000`

---

### 4. **nombre**
- **Tipo**: `VARCHAR(255)`
- **Obligatorio**: ✅ Sí (NOT NULL)
- **Descripción**: Nombre o título de la obra.
- **Ejemplo**: `"Escuela Primaria Juan Pablo Duarte"`, `"Centro de Salud Comunitario"`

---

### 5. **estado**
- **Tipo**: `VARCHAR(50)`
- **Obligatorio**: ✅ Sí (NOT NULL)
- **Descripción**: Estado actual de la obra.
- **Valores comunes**: 
  - `INAUGURADA`
  - `TERMINADA`
  - `DETENIDA`
  - `NO INICIADA`
  - `ACTIVA`
  - `PRELIMINARES`
  - `INTERVENIDA MANTENIMIENTO`
  - `NO ESPECIFICADO`

---

### 6. **fecha_inicio**
- **Tipo**: `DATE`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Fecha de inicio de la obra.
- **Formato**: `YYYY-MM-DD`
- **Ejemplo**: `2024-01-15`

---

### 7. **fecha_fin_estimada**
- **Tipo**: `DATE`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Fecha estimada de finalización de la obra.
- **Formato**: `YYYY-MM-DD`
- **Ejemplo**: `2024-12-31`

---

### 8. **responsable**
- **Tipo**: `VARCHAR(100)`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Nombre del contratista o responsable de la obra.
- **Ejemplo**: `"Constructora ABC S.A."`, `"Ing. Juan Pérez"`

---

### 9. **descripcion**
- **Tipo**: `TEXT`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Descripción detallada de la obra.
- **Ejemplo**: `"Construcción de escuela primaria con 6 aulas, biblioteca y área administrativa"`

---

### 10. **provincia**
- **Tipo**: `VARCHAR(100)`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Provincia donde se ubica la obra.
- **Ejemplo**: `"Santo Domingo"`, `"Santiago"`, `"La Altagracia"`

---

### 11. **municipio**
- **Tipo**: `VARCHAR(100)`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Municipio donde se ubica la obra.
- **Ejemplo**: `"Santo Domingo Este"`, `"Santiago de los Caballeros"`

---

### 12. **nivel**
- **Tipo**: `VARCHAR(50)`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Nivel educativo o tipo de institución (si aplica).
- **Ejemplo**: `"Primaria"`, `"Secundaria"`, `"Inicial"`

---

### 13. **no_aula**
- **Tipo**: `INTEGER`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Número de aulas (si aplica a obras educativas).
- **Ejemplo**: `6`, `12`, `24`

---

### 14. **observacion_legal**
- **Tipo**: `TEXT`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Observaciones o notas legales sobre la obra.
- **Ejemplo**: `"Pendiente revisión de documentos legales"`

---

### 15. **observacion_financiero**
- **Tipo**: `TEXT`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Observaciones o notas financieras sobre la obra.
- **Ejemplo**: `"Presupuesto aprobado, pendiente desembolso"`

---

### 16. **latitud**
- **Tipo**: `VARCHAR(20)`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Coordenada de latitud para ubicación geográfica.
- **Ejemplo**: `"18.4861"`, `"-69.9312"`

---

### 17. **longitud**
- **Tipo**: `VARCHAR(20)`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Coordenada de longitud para ubicación geográfica.
- **Ejemplo**: `"-69.9312"`, `"-70.6990"`

---

### 18. **distrito_minerd_sigede**
- **Tipo**: `VARCHAR(20)`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Distrito del Ministerio de Educación según SIGEDE (Sistema de Gestión de la Educación).
- **Ejemplo**: `"01-01"`, `"02-05"`

---

### 19. **fecha_inauguracion**
- **Tipo**: `DATE`
- **Obligatorio**: ❌ No (puede ser NULL)
- **Descripción**: Fecha de inauguración de la obra.
- **Formato**: `YYYY-MM-DD`
- **Ejemplo**: `2024-06-15`

---

### 20. **created_at**
- **Tipo**: `TIMESTAMP WITH TIME ZONE`
- **Obligatorio**: ❌ No (pero tiene valor por defecto)
- **Valor por defecto**: `NOW()` (fecha y hora actual)
- **Descripción**: Fecha y hora de creación del registro en la base de datos.
- **Formato**: `YYYY-MM-DD HH:MM:SS+TZ`
- **Ejemplo**: `2024-01-15 10:30:00+00`

---

### 21. **updated_at**
- **Tipo**: `TIMESTAMP WITH TIME ZONE`
- **Obligatorio**: ❌ No (pero tiene valor por defecto)
- **Valor por defecto**: `NOW()` (fecha y hora actual)
- **Descripción**: Fecha y hora de la última actualización del registro. Se actualiza automáticamente mediante trigger.
- **Formato**: `YYYY-MM-DD HH:MM:SS+TZ`
- **Ejemplo**: `2024-01-20 14:45:00+00`

---

## Índices Creados

La tabla tiene los siguientes índices para mejorar el rendimiento de las búsquedas:

1. **idx_obras_codigo** - Índice en `codigo`
2. **idx_obras_id_obra** - Índice en `id_obra` (si existe la columna)
3. **idx_obras_estado** - Índice en `estado`
4. **idx_obras_nombre** - Índice en `nombre`
5. **idx_obras_responsable** - Índice en `responsable`
6. **idx_obras_provincia** - Índice en `provincia`
7. **idx_obras_municipio** - Índice en `municipio`
8. **idx_obras_fecha_inauguracion** - Índice en `fecha_inauguracion`

---

## Resumen por Categorías

### Campos Obligatorios (NOT NULL)
- `id` (PRIMARY KEY)
- `codigo` (UNIQUE)
- `nombre`
- `estado`

### Campos Opcionales (NULL permitido)
- Todos los demás campos

### Campos Únicos (UNIQUE)
- `id` (PRIMARY KEY)
- `id_obra` (si existe)
- `codigo`

### Campos de Fecha
- `fecha_inicio`
- `fecha_fin_estimada`
- `fecha_inauguracion`
- `created_at`
- `updated_at`

### Campos de Ubicación
- `provincia`
- `municipio`
- `latitud`
- `longitud`
- `distrito_minerd_sigede`

### Campos de Texto Largo
- `descripcion` (TEXT)
- `observacion_legal` (TEXT)
- `observacion_financiero` (TEXT)

---

## Notas Importantes

1. **Columna `id_obra`**: Esta columna puede no existir en tu base de datos actual. Si no existe, el ID del sistema (OB-0000, MT-0000) probablemente se almacena en el campo `codigo`.

2. **Mapeo con la API**: 
   - En la API externa, el campo `id` corresponde a `id_obra` en Supabase
   - El campo `codigo` en la API corresponde a `codigo` en Supabase

3. **Campos de Auditoría**: `created_at` y `updated_at` se gestionan automáticamente mediante triggers en la base de datos.

4. **Búsqueda**: El buscador actual busca en todos los campos de texto, incluyendo `codigo`, `nombre`, `estado`, `responsable`, `descripcion`, `provincia`, `municipio`, `nivel`, y `distrito_minerd_sigede`.
