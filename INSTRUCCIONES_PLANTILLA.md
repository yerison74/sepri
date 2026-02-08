# 📋 Instrucciones para Plantillas de Obras

## ⚠️ IMPORTANTE: Diferencias entre `id_obra` y `codigo`

### `id_obra` (OBLIGATORIO)
- **Formato**: Dos letras, un guion y cuatro dígitos
- **Ejemplos**: `OB-0001`, `MT-0001`, `OB-1234`, `MT-9999`
- **Uso**: Identificador único de la obra. Se usa para buscar, actualizar o crear obras.
- **Validación**: Debe seguir el patrón `^(OB|MT)-\d{4}$`

### `codigo` (OPCIONAL)
- **Formato**: Número con guion
- **Ejemplos**: `123-456`, `789-012`, `45-67`
- **Uso**: Código de contrato o número de referencia adicional
- **Nota**: Este campo es diferente de `id_obra` y es opcional

## 📄 Plantilla Excel

### Columnas Requeridas (en orden):

1. **id_obra** (OBLIGATORIO)
   - Formato: `OB-0001` o `MT-0001`
   - Ejemplo: `OB-0001`

2. **codigo** (OPCIONAL)
   - Formato: número con guion
   - Ejemplo: `123-456`

3. **nombre** (OBLIGATORIO)
   - Nombre de la obra
   - Ejemplo: `Escuela Primaria Juan Pablo Duarte`

4. **estado** (OBLIGATORIO)
   - Estados válidos: `ACTIVA`, `PENDIENTE`, `EN PROCESO`, `COMPLETADA`, `CANCELADA`, `PAUSADO`
   - Ejemplo: `ACTIVA`

### Columnas Opcionales:

- `responsable` - Nombre del responsable o contratista
- `descripcion` - Descripción detallada de la obra
- `provincia` - Nombre de la provincia
- `municipio` - Nombre del municipio
- `nivel` - Nivel educativo (Inicial, Primario, Secundario, etc.)
- `no_aula` - Número de aulas (número entero)
- `distrito_minerd_sigede` - Código del distrito MINERD SIGEDE
- `latitud` - Coordenada de latitud
- `longitud` - Coordenada de longitud
- `fecha_inicio` - Fecha de inicio (formato: YYYY-MM-DD)
- `fecha_fin_estimada` - Fecha fin estimada (formato: YYYY-MM-DD)
- `fecha_inauguracion` - Fecha de inauguración (formato: YYYY-MM-DD)
- `observacion_legal` - Observaciones del área legal
- `observacion_financiero` - Observaciones del área financiero

## 📄 Plantilla XML

### Estructura:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mantenimientos>
  <obra>
    <!-- Campos obligatorios -->
    <id_obra>OB-0001</id_obra>
    <codigo>123-456</codigo>
    <nombre>Nombre de la obra</nombre>
    <estado>ACTIVA</estado>
    
    <!-- Campos opcionales -->
    <responsable>Nombre del responsable</responsable>
    <descripcion>Descripción detallada</descripcion>
    <!-- ... más campos ... -->
  </obra>
</mantenimientos>
```

## 🔍 Cómo Funciona la Búsqueda

El sistema busca obras por el campo **`id_obra`** (no por `codigo`):

1. Si encuentra una obra con el mismo `id_obra` → **ACTUALIZA** la obra existente
2. Si NO encuentra ninguna obra con ese `id_obra` → **CREA** una nueva obra

**Ejemplo:**
- Si subes un archivo con `id_obra: "OB-0001"` y ya existe una obra con ese ID, se actualizará
- Si subes un archivo con `id_obra: "OB-9999"` y no existe, se creará una nueva obra

## ✅ Validaciones

### `id_obra`:
- ✅ Debe estar presente (no puede estar vacío)
- ✅ Debe seguir el formato: `OB-XXXX` o `MT-XXXX` (donde XXXX son 4 dígitos)
- ✅ Ejemplos válidos: `OB-0001`, `MT-1234`, `OB-9999`
- ❌ Ejemplos inválidos: `OB-1`, `MT-12345`, `ABC-0001`, `123-456`

### `codigo`:
- ✅ Es opcional (puede estar vacío)
- ✅ Formato: número con guion
- ✅ Ejemplos válidos: `123-456`, `789-012`, `45-67`

## 📝 Ejemplo Completo de Fila Excel

| id_obra | codigo | nombre | estado | responsable | provincia | municipio |
|---------|--------|--------|--------|-------------|-----------|-----------|
| OB-0001 | 123-456 | Escuela Primaria Juan Pablo Duarte | ACTIVA | Constructora ABC | Santo Domingo | Distrito Nacional |

## ⚠️ Errores Comunes

1. **Usar `codigo` como identificador**: ❌ El sistema busca por `id_obra`, no por `codigo`
2. **Formato incorrecto de `id_obra`**: ❌ Debe ser exactamente `OB-0001` o `MT-0001` (4 dígitos)
3. **Confundir `id_obra` con `codigo`**: ❌ Son campos diferentes:
   - `id_obra` = `OB-0001` (identificador principal)
   - `codigo` = `123-456` (código de contrato)
