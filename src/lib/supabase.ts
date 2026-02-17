import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;

// Cliente estándar para lectura de datos
export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente con service_role para subir archivos (bypass RLS)
// La service_role key omite todas las políticas RLS — solo usar para Storage
export const supabaseStorage = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : supabase;
