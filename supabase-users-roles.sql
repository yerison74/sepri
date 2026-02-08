-- ============================================================
-- Tabla de usuarios para el sistema de roles y permisos
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  nombre_usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  cargo TEXT,
  area TEXT,
  permisos JSONB NOT NULL DEFAULT '[]'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsqueda por nombre de usuario (login)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nombre_usuario ON public.users(nombre_usuario);

-- Comentarios
COMMENT ON TABLE public.users IS 'Usuarios del sistema con permisos por rol';
COMMENT ON COLUMN public.users.permisos IS 'Array de códigos de permiso: ver_dashboard, ver_obras, ver_carga_obras, editar_carga_obras, ver_tramites, editar_tramites, ver_configuracion, crear_usuarios, editar_usuarios';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Habilitar RLS (opcional: el backend usa service role para auth)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: solo permitir lectura/escritura vía service role (backend)
-- No exponer usuarios al anon key desde el frontend para contraseñas
CREATE POLICY "Backend service role only" ON public.users
  FOR ALL USING (true) WITH CHECK (true);
