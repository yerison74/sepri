-- Tabla para registrar formularios de atencion al contratista
-- id autogenerado con formato: FC-000001

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
  nota text
);

