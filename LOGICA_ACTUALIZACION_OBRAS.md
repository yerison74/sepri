# 🔍 Lógica de Actualización de Obras

## 📋 Criterio de Identificación

El sistema usa el campo **`codigo`** del Excel/XML como identificador único (equivalente al ID) para determinar si una obra ya existe o es nueva.

**IMPORTANTE**: El campo `codigo` en el archivo Excel/XML es el identificador principal. Este campo se usa para buscar, actualizar o crear obras.

### Cómo Funciona

1. **Al subir un archivo (XML o Excel)**, el sistema procesa cada obra:
   - Extrae el campo `codigo` de cada obra
   - Busca en la base de datos una obra con ese código exacto
   - Si encuentra una obra con el mismo código → **ACTUALIZA** la obra existente
   - Si NO encuentra ninguna obra con ese código → **CREA** una nueva obra

2. **Búsqueda Exacta**:
   - El sistema busca por código usando comparación exacta (`eq`)
   - Se eliminan espacios en blanco antes de comparar (`.trim()`)
   - La búsqueda es case-sensitive (mayúsculas/minúsculas importan)

## ⚠️ Puntos Importantes

### El código debe ser único y exacto

- Si el código en el archivo es `"OB-0001"` y en la BD es `"OB-0001 "` (con espacio), se considerará diferente
- Si el código en el archivo es `"ob-0001"` (minúsculas) y en la BD es `"OB-0001"` (mayúsculas), se considerará diferente
- El sistema ahora hace `.trim()` para eliminar espacios, pero las mayúsculas/minúsculas deben coincidir

### Logs de Depuración

El sistema ahora muestra en la consola del navegador:
- `"Actualizando obra existente: [código] (ID: [id])"` - cuando actualiza
- `"Creando nueva obra: [código]"` - cuando crea nueva

## 🔄 Flujo Completo

```
1. Usuario sube archivo XML/Excel
   ↓
2. Sistema procesa cada obra del archivo
   ↓
3. Para cada obra:
   a. Extrae el código
   b. Busca en BD: SELECT * FROM obras WHERE codigo = '[código]'
   c. Si encuentra:
      → Actualiza la obra existente con los nuevos datos
   d. Si NO encuentra:
      → Crea una nueva obra
   ↓
4. Muestra resultados:
   - Total procesadas
   - Creadas
   - Actualizadas
   - Fallidas (si hay errores)
```

## 🐛 Solución de Problemas

### "No veo que los datos cambien"

1. **Verifica el código en el archivo**:
   - Abre la consola del navegador (F12)
   - Busca los mensajes: "Actualizando obra existente" o "Creando nueva obra"
   - Verifica que el código en el archivo coincida exactamente con el de la BD

2. **Verifica que el código existe en la BD**:
   - Ve a Supabase Dashboard > Table Editor > obras
   - Busca el código que estás intentando actualizar
   - Verifica que no tenga espacios extra o diferencias en mayúsculas/minúsculas

3. **Verifica los logs en consola**:
   - Abre la consola del navegador
   - Busca errores o mensajes de depuración
   - Los mensajes te dirán si está creando o actualizando

4. **Refresca la tabla de obras**:
   - Después de subir, haz clic en otra pestaña y vuelve a "Obras"
   - O recarga la página (F5)

### "Siempre crea nuevas obras en lugar de actualizar"

- Verifica que el campo `codigo` en tu archivo coincida exactamente con el de la BD
- Verifica que no haya espacios extra al inicio o final
- Verifica que las mayúsculas/minúsculas coincidan

### "Los datos no se actualizan"

- Verifica que el código coincida exactamente
- Revisa la consola para ver si hay errores
- Verifica que la tabla `obras` tenga las columnas correctas en Supabase

## 📝 Ejemplo

**Archivo Excel/XML:**
```
codigo: "OB-0001"
nombre: "Escuela Nueva"
estado: "ACTIVA"
```

**Base de Datos:**
```
codigo: "OB-0001"  ← Coincide → ACTUALIZA
nombre: "Escuela Vieja"  → Se actualiza a "Escuela Nueva"
estado: "PENDIENTE"  → Se actualiza a "ACTIVA"
```

Si el código no coincide exactamente, se creará una nueva obra en lugar de actualizar.
