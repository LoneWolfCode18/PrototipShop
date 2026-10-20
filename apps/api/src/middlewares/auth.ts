import type { RequestHandler } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';

/**
 * Exige un JWT de Supabase Auth en `Authorization: Bearer <token>` y que el usuario
 * tenga rol 'admin' activo en la tabla `profiles`. Deja el id en res.locals.userId.
 */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'NO_TOKEN', 'Falta el token de autenticación');

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new AppError(401, 'BAD_TOKEN', 'Token inválido o vencido');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    throw new AppError(403, 'FORBIDDEN', 'No tienes permisos de administrador');
  }

  res.locals.userId = data.user.id;
  next();
};
