import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { requireAdmin } from '../middlewares/auth';
import { AppError } from '../utils/errors';

export const adminRouter = Router();

// Todo lo que cuelga de /admin exige un admin autenticado.
adminRouter.use(requireAdmin);

const uuid = z.string().uuid();

// Lista completa de prendas (incluye inactivas) con sus variantes.
adminRouter.get('/products', async (_req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*, variants:product_variants(id, sku, stock, low_stock_threshold, size:sizes(label), color:colors(name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ data });
});

// Prendas con poco stock (usa la vista v_low_stock).
adminRouter.get('/stock/low', async (_req, res) => {
  const { data, error } = await supabase.from('v_low_stock').select('*').order('stock');
  if (error) throw error;
  res.json({ data });
});

// Ajustar stock de una variante: { delta: +10 | -2, reason: "Ingreso de mercadería" }
adminRouter.patch('/variants/:id/stock', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const body = z
    .object({
      delta: z.number().int().refine((n) => n !== 0, 'delta no puede ser 0'),
      reason: z.string().trim().min(1).max(200),
    })
    .parse(req.body);

  const { data, error } = await supabase.rpc('adjust_stock', {
    p_variant: id,
    p_delta: body.delta,
    p_type: body.delta > 0 ? 'ingreso' : 'ajuste',
    p_reason: body.reason,
    p_user: res.locals.userId,
  });
  if (error) throw new AppError(409, 'STOCK_ERROR', error.message);
  res.json({ stock: data });
});

adminRouter.get('/orders', async (req, res) => {
  const status = z
    .enum(['enviado_whatsapp', 'confirmado', 'pagado', 'entregado', 'cancelado'])
    .optional()
    .parse(req.query.status);

  let q = supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false }).limit(100);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  res.json({ data });
});

// Cambiar estado. Al pasar a 'confirmado' se descuenta el stock (todo o nada).
adminRouter.patch('/orders/:id/status', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { status } = z
    .object({ status: z.enum(['confirmado', 'pagado', 'entregado', 'cancelado']) })
    .parse(req.body);

  if (status === 'confirmado') {
    const { error } = await supabase.rpc('confirm_order', { p_order: id, p_user: res.locals.userId });
    if (error) throw new AppError(409, 'CONFIRM_ERROR', error.message);
  } else {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  }
  res.json({ ok: true, status });
});

// TODO (fase 3): POST/PUT/DELETE de productos, variantes, imágenes, precio por mayor,
// catálogos (categorías, cortes, materiales, colores) y PUT /settings.
