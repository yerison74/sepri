# Configuración para Producción - Modo Solo Trámites

## Descripción

Para desplegar la aplicación en producción mostrando **únicamente** el módulo de Seguimiento de Trámites, puedes usar la variable de entorno `REACT_APP_TRAMITES_ONLY`.

## Configuración

### Opción 1: Archivo `.env` (Recomendado)

1. Crea un archivo `.env` en la raíz del proyecto `web-admin/`
2. Agrega la siguiente línea:

```env
REACT_APP_TRAMITES_ONLY=true
REACT_APP_BACKEND_URL=https://tu-backend-produccion.com
```

3. Reconstruye la aplicación:

```bash
npm run build
```

### Opción 2: Variable de Entorno del Sistema

En tu servidor de producción, configura la variable de entorno antes de construir:

**Linux/Mac:**
```bash
export REACT_APP_TRAMITES_ONLY=true
export REACT_APP_BACKEND_URL=https://tu-backend-produccion.com
npm run build
```

**Windows (PowerShell):**
```powershell
$env:REACT_APP_TRAMITES_ONLY="true"
$env:REACT_APP_BACKEND_URL="https://tu-backend-produccion.com"
npm run build
```

**Windows (CMD):**
```cmd
set REACT_APP_TRAMITES_ONLY=true
set REACT_APP_BACKEND_URL=https://tu-backend-produccion.com
npm run build
```

## Comportamiento

Cuando `REACT_APP_TRAMITES_ONLY=true`:

✅ **Se muestra:**
- Solo la pestaña "Seguimiento de Trámites"
- El título cambia a "Sistema de Seguimiento de Trámites"
- El icono cambia al de seguimiento

❌ **Se oculta:**
- Dashboard
- Obras
- Cargar Obras
- Configuración

## Desarrollo vs Producción

### Desarrollo (Modo Completo)
```env
REACT_APP_TRAMITES_ONLY=false
# o simplemente no definir la variable
```

### Producción (Solo Trámites)
```env
REACT_APP_TRAMITES_ONLY=true
REACT_APP_BACKEND_URL=https://tu-backend-produccion.com
```

## Notas Importantes

1. **Las variables de entorno deben comenzar con `REACT_APP_`** para que React las reconozca
2. **Debes reconstruir la aplicación** después de cambiar las variables de entorno
3. Las variables de entorno se inyectan en tiempo de construcción, no en tiempo de ejecución
4. Si cambias las variables, necesitas hacer un nuevo `npm run build`

## Verificación

Después de construir, puedes verificar que el modo está activo:
- La aplicación solo mostrará la pestaña de "Seguimiento de Trámites"
- El título en el header será "Sistema de Seguimiento de Trámites"
- No habrá otras pestañas visibles
