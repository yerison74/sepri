# 📊 Estado de Conexión con Supabase API

## ✅ Funcionalidades que usan Supabase

### 1. Dashboard (StatsDashboard)
- ✅ `statsAPI.obtenerResumenDashboard()` → Supabase
- ✅ `statsAPI.obtenerObrasProximasInaugurar()` → Supabase
- **Estado**: Completamente migrado a Supabase

### 2. Obras/Mantenimientos (ObrasTable)
- ✅ `mantenimientosAPI.obtenerObras()` → Supabase
- ✅ `mantenimientosAPI.eliminarObra()` → Supabase
- **Estado**: Completamente migrado a Supabase

### 3. Carga de Archivos (FileUpload)
- ✅ `uploadAPI.subirXml()` → Supabase Storage + Procesamiento Frontend
- ✅ `uploadAPI.subirExcel()` → Supabase Storage + Procesamiento Frontend
- ✅ `uploadAPI.validarXml()` → Procesamiento Frontend
- ✅ `uploadAPI.validarExcel()` → Procesamiento Frontend
- ✅ `uploadAPI.descargarDatos()` → Genera Excel desde Supabase
- ✅ `uploadAPI.descargarPlantilla()` → Genera plantilla XML
- ✅ `uploadAPI.descargarPlantillaExcel()` → Genera plantilla Excel
- ✅ `uploadAPI.obtenerHistorial()` → Supabase
- **Estado**: Completamente migrado a Supabase

## ⚠️ Funcionalidades que usan Backend Local

### 4. Seguimiento de Trámites (UploadHistory/TramiteHistory)
**TODAS las funciones de trámites usan el backend local:**
- ⚠️ `tramitesAPI.obtenerTramites()` → Backend (localhost:3001)
- ⚠️ `tramitesAPI.obtenerTramitePorId()` → Backend (localhost:3001)
- ⚠️ `tramitesAPI.crearTramite()` → Backend (localhost:3001)
- ⚠️ `tramitesAPI.crearTramiteConArchivo()` → Backend (localhost:3001)
- ⚠️ `tramitesAPI.actualizarTramite()` → Backend (localhost:3001)
- ⚠️ `tramitesAPI.eliminarTramite()` → Backend (localhost:3001)
- ⚠️ `tramitesAPI.obtenerHistorialTramite()` → Backend (localhost:3001)
- ⚠️ `tramitesAPI.registrarMovimiento()` → Backend (localhost:3001)

**Razón**: El seguimiento de trámites debe usar el backend local según los requisitos.

## 📋 Resumen

| Componente | Funcionalidad | API Usada |
|------------|---------------|-----------|
| Dashboard | Todas las funciones | ✅ Supabase |
| Obras | Todas las funciones | ✅ Supabase |
| Carga de Archivos | Todas las funciones | ✅ Supabase |
| Trámites | **TODAS las funciones** (seguimiento de trámites) | ⚠️ Backend (localhost:3001) |

## 🎯 Conclusión

**Toda la aplicación web usa Supabase, EXCEPTO:**
- **El seguimiento de trámites (UploadHistory/TramiteHistory)** - Todas sus funciones usan el backend local (localhost:3001)

**Resumen:**
- ✅ Dashboard → Supabase
- ✅ Obras/Mantenimientos → Supabase
- ✅ Carga de Archivos → Supabase
- ⚠️ Seguimiento de Trámites → Backend Local (localhost:3001)
