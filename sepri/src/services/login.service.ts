import { supabase } from '../lib/supabase';

export async function loginUsuario(usuario: string, password: string) {
  const { data, error } = await supabase
    .from('usuarios_app')
    .select('*')
    .eq('usuario', usuario)
    .eq('password', password)
    .eq('activo', true)
    .single();

  if (error || !data) {
    throw new Error('Usuario o contraseña incorrectos');
  }

  return data;
}