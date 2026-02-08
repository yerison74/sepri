-- ============================================
-- Script SQL para crear las tablas en Supabase
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Tabla de obras
CREATE TABLE IF NOT EXISTS obras (
  id SERIAL PRIMARY KEY,
  id_obra VARCHAR(50) UNIQUE, -- ID de la obra (formato: OB-0000 o MT-0000)
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  estado VARCHAR(50) NOT NULL,
  fecha_inicio DATE,
  fecha_fin_estimada DATE,
  responsable VARCHAR(100),
  descripcion TEXT,
  provincia VARCHAR(100),
  municipio VARCHAR(100),
  nivel VARCHAR(50),
  no_aula INTEGER,
  observacion_legal TEXT,
  observacion_financiero TEXT,
  latitud VARCHAR(20),
  longitud VARCHAR(20),
  distrito_minerd_sigede VARCHAR(20),
  fecha_inauguracion DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de historial de estados
CREATE TABLE IF NOT EXISTS historial_estados (
  id SERIAL PRIMARY KEY,
  obra_id INTEGER NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario VARCHAR(100),
  observaciones TEXT
);

-- Tabla de trámites
CREATE TABLE IF NOT EXISTS tramites (
  id VARCHAR(50) PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  nombre_destinatario VARCHAR(255) NOT NULL,
  area_destinatario VARCHAR(100) NOT NULL,
  area_destino_final VARCHAR(100) NOT NULL,
  estado VARCHAR(50) DEFAULT 'en_transito',
  codigo_barras VARCHAR(50),
  archivo_pdf VARCHAR(255),
  nombre_archivo VARCHAR(255),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de movimientos de trámites
CREATE TABLE IF NOT EXISTS movimientos_tramites (
  id SERIAL PRIMARY KEY,
  tramite_id VARCHAR(50) NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
  area_origen VARCHAR(100) NOT NULL,
  area_destino VARCHAR(100) NOT NULL,
  fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observaciones TEXT,
  usuario VARCHAR(100)
);

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

-- ============================================
-- Índices para mejorar el rendimiento
-- ============================================

CREATE INDEX IF NOT EXISTS idx_obras_codigo ON obras(codigo);
CREATE INDEX IF NOT EXISTS idx_obras_id_obra ON obras(id_obra);
CREATE INDEX IF NOT EXISTS idx_obras_estado ON obras(estado);
CREATE INDEX IF NOT EXISTS idx_obras_nombre ON obras(nombre);
CREATE INDEX IF NOT EXISTS idx_obras_responsable ON obras(responsable);
CREATE INDEX IF NOT EXISTS idx_obras_provincia ON obras(provincia);
CREATE INDEX IF NOT EXISTS idx_obras_municipio ON obras(municipio);
CREATE INDEX IF NOT EXISTS idx_obras_fecha_inauguracion ON obras(fecha_inauguracion);

CREATE INDEX IF NOT EXISTS idx_historial_obra_id ON historial_estados(obra_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha_cambio ON historial_estados(fecha_cambio);

CREATE INDEX IF NOT EXISTS idx_tramites_id ON tramites(id);
CREATE INDEX IF NOT EXISTS idx_tramites_estado ON tramites(estado);
CREATE INDEX IF NOT EXISTS idx_tramites_area_destinatario ON tramites(area_destinatario);
CREATE INDEX IF NOT EXISTS idx_tramites_fecha_creacion ON tramites(fecha_creacion);

CREATE INDEX IF NOT EXISTS idx_movimientos_tramite_id ON movimientos_tramites(tramite_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_tramites(fecha_movimiento);

CREATE INDEX IF NOT EXISTS idx_historial_uploads_fecha ON historial_uploads(fecha_subida);

-- ============================================
-- Función para actualizar updated_at automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_obras_updated_at
  BEFORE UPDATE ON obras
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tramites_updated_at
  BEFORE UPDATE ON tramites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) - Configuración básica
-- Por ahora, permitimos acceso público para desarrollo
-- IMPORTANTE: Configura RLS según tus necesidades de seguridad
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE tramites ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_tramites ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_uploads ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: Permitir todo para desarrollo
-- NOTA: En producción, deberías crear políticas más restrictivas

-- Política para obras: Permitir todas las operaciones
CREATE POLICY "Allow all operations on obras" ON obras
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Política para historial_estados
CREATE POLICY "Allow all operations on historial_estados" ON historial_estados
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Política para tramites
CREATE POLICY "Allow all operations on tramites" ON tramites
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Política para movimientos_tramites
CREATE POLICY "Allow all operations on movimientos_tramites" ON movimientos_tramites
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Política para historial_uploads
CREATE POLICY "Allow all operations on historial_uploads" ON historial_uploads
  FOR ALL
  USING (true)
  WITH CHECK (true);
