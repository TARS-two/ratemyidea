
import { createClient } from '@supabase/supabase-js';

// Inicializa el cliente Supabase
// ASEGÚRATE DE REEMPLAZAR ESTAS VARIABLES DE ENTORNO CON LAS TUYAS REALES
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Esta clave debe ser SECRETA y solo en el backend

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Obtener la sesión del usuario (Autenticación)
  // Asumiendo que el token de sesión se envía en los headers (Authorization: Bearer <token>)
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided.' });
  }

  const { data: userResponse, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userResponse.user) {
    console.error('Authentication error:', authError);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const userId = userResponse.user.id;

  // 2. Obtener la información del usuario desde la base de datos
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles') // Asume que tienes una tabla 'profiles' con información de usuario
    .select('is_pro, free_evaluations_left, last_share_date')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError);
    return res.status(500).json({ error: 'Could not fetch user profile.' });
  }

  // Si el usuario es Pro, no necesita evaluaciones extra gratuitas
  if (userProfile.is_pro) {
    return res.status(200).json({ message: 'Pro user, no free evaluation needed.' });
  }

  // 3. Verificar si el usuario es elegible para la evaluación extra
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Establecer a inicio del día para comparación

  const lastShareDate = userProfile.last_share_date ? new Date(userProfile.last_share_date) : null;
  let hasSharedToday = false;
  if (lastShareDate) {
      lastShareDate.setHours(0, 0, 0, 0);
      hasSharedToday = lastShareDate.getTime() === today.getTime();
  }

  if (hasSharedToday) {
    return res.status(200).json({ message: 'Extra evaluation already granted for today.' });
  }

  // 4. Otorgar la evaluación extra (incrementar el contador)
  const newFreeEvaluationsLeft = userProfile.free_evaluations_left + 1;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      free_evaluations_left: newFreeEvaluationsLeft,
      last_share_date: new Date().toISOString() // Registrar la fecha de la compartición
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating user evaluations:', updateError);
    return res.status(500).json({ error: 'Could not grant extra evaluation.' });
  }

  return res.status(200).json({ message: 'Extra evaluation granted!', freeEvaluationsLeft: newFreeEvaluationsLeft });
}
