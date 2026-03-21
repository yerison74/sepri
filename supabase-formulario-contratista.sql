-- Tabla para registrar formularios de atencion al contratista
-- id autogenerado con formato: FC-000001
--
-- Seguridad (RLS): tras crear tablas, revisa y ejecuta supabase-rls-formulario-contratista.sql

CREATE SEQUENCE IF NOT EXISTS formulario_contratista_id_seq START 1;

CREATE TABLE IF NOT EXISTS formulario_contratista (
  id text PRIMARY KEY DEFAULT ('FC-' || LPAD(nextval('formulario_contratista_id_seq')::text, 6, '0')),
  fecha_visita date NOT NULL,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  nombre_empresa text NOT NULL,
  motivo_visita text NOT NULL CHECK (
    motivo_visita IN (
      'Adenda',
      'Contrato',
      'Equilibrio economico',
      'Linea de credito',
      'Pago de cubicación',
      'Mantenimiento Correctivo',
      'Aula movil',
      'Otras'
    )
  ),
  nombre_obra text,
  nombre_obra_inaugurada text,
  provincia text NOT NULL CHECK (
    provincia IN (
      'Azua',
      'Bahoruco',
      'Barahona',
      'Dajabón',
      'Distrito Nacional',
      'Duarte',
      'Elías Piña',
      'El Seibo',
      'Espaillat',
      'Hato Mayor',
      'Hermanas Mirabal',
      'Independencia',
      'La Altagracia',
      'La Romana',
      'La Vega',
      'María Trinidad Sánchez',
      'Monseñor Nouel',
      'Monte Cristi',
      'Monte Plata',
      'Pedernales',
      'Peravia',
      'Puerto Plata',
      'Samaná',
      'San Cristóbal',
      'San José de Ocoa',
      'San Juan',
      'San Pedro de Macorís',
      'Sánchez Ramírez',
      'Santiago',
      'Santiago Rodríguez',
      'Santo Domingo',
      'Valverde'
    )
  ),
  numero_contrato text NOT NULL,
  correo text NOT NULL,
  nota text,
  -- Flujo: solicitud -> asignación a área -> seguimiento entre áreas (detenido/completado)
  area_actual text,
  estado text NOT NULL DEFAULT 'pendiente_asignacion' CHECK (
    estado IN ('pendiente_asignacion', 'en_seguimiento', 'detenido', 'completado')
  )
);

-- Movimientos / seguimiento entre áreas (ejecutar también supabase-solicitud-contratista-seguimiento.sql si la tabla ya existía sin estas columnas)

CREATE TABLE IF NOT EXISTS movimientos_solicitud_contratista (
  id bigserial PRIMARY KEY,
  solicitud_id text NOT NULL REFERENCES formulario_contratista(id) ON DELETE CASCADE,
  area_origen text NOT NULL,
  area_destino text NOT NULL,
  nota text,
  estado_resultante text CHECK (
    estado_resultante IS NULL OR estado_resultante IN ('detenido', 'completado')
  ),
  usuario text,
  fecha_movimiento timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_solicitud_contratista_solicitud
  ON movimientos_solicitud_contratista (solicitud_id);

