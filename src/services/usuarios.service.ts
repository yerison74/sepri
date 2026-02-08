import { supabase } from '../lib/supabase';

export const obtenerUsuariosActivos = async () => {
  const { data, error } = await supabase
    .from('usuarios_app')
    .select('*')
    .eq('activo', true)
    .order('usuario');

  if (error) throw error;
  return data || [];
};

export const eliminarUsuario = async (id: number) => {
  const { error } = await supabase
    .from('usuarios_app')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw error;
};