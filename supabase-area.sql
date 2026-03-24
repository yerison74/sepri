-- Tabla de áreas institucionales usadas en SEPRI
-- id: código del área (ej: DIGE, OAIP, JURI)
-- area: nombre descriptivo del área
-- encargado_id: referencia opcional al usuario encargado del área (tabla usuarios_app)

CREATE TABLE IF NOT EXISTS area (
  id           text PRIMARY KEY,
  area         text NOT NULL,
  encargado_id text REFERENCES usuarios_app(id)
);

-- Poblar tabla area con las áreas existentes del sistema de trámites

INSERT INTO area (id, area, encargado_id) VALUES
  ('DIGE', 'Dirección General', NULL),
  ('OAIP', 'Oficina de Libre Acceso a la Información Pública', NULL),
  ('JURI', 'Departamento Jurídico', NULL),
  ('RRHH', 'Departamento de Recursos Humanos', NULL),
  ('PYDE', 'Departamento de Planificación y Desarrollo', NULL),
  ('COGI', 'División Control de Gestión Interna', NULL),
  ('SEFI', 'División de Seguridad', NULL),
  ('TECO', 'División de Tecnologías de la Información y Comunicación', NULL),
  ('ADFI', 'Departamento Administrativo y Financiero', NULL),
  ('DIAR', 'Departamento de Diseño y Arquitectura', NULL),
  ('GEIE', 'Departamento de Gestión de Infraestructura Escolar', NULL),
  ('GERI', 'Departamento Gestión de Riesgo', NULL),
  ('MANO', 'Departamento de Mantenimiento de Obras', NULL),
  ('SUPO', 'Departamento Supervisión de Obras', NULL),
  ('FISO', 'Departamento Fiscalización de Obras', NULL),
  ('CUBI', 'Departamento de Cubicaciones', NULL),
  ('COOR', 'Departamento de Coordinación Regional', NULL);

