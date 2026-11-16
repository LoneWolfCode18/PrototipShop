import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { requireAdmin } from '../middlewares/auth';
import { AppError } from '../utils/errors';
import {
  addImageSchema,
  adminAddImage,
  adminCreateProduct,
  adminCreateVariant,
  adminDeleteImage,
  adminDeleteVariant,
  adminGetProduct,
  adminGetStats,
  adminListProducts,
  adminSetPriceTiers,
  adminSetProductStatus,
  adminUpdateProduct,
  adminUpdateSettings,
  adminUpdateVariant,
  createProductSchema,
  createVariantSchema,
  priceTierSchema,
  updateProductSchema,
  updateSettingsSchema,
  updateVariantSchema,
} from '../services/admin.service';

export const adminRouter = Router();

// Todo lo que cuelga de /admin exige un admin autenticado.
adminRouter.use(requireAdmin);

const uuid = z.string().uuid();

/* ─── Dashboard ───────────────────────────────────────────────── */

adminRouter.get('/stats', async (_req, res) => {
  res.json(await adminGetStats());
});

/* ─── Productos ───────────────────────────────────────────────── */

adminRouter.get('/products', async (_req, res) => {
  res.json({ data: await adminListProducts() });
});

adminRouter.get('/products/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);
  res.json(await adminGetProduct(id));
});

adminRouter.post('/products', async (req, res) => {
  const body = createProductSchema.parse(req.body);
  const result = await adminCreateProduct(body);
  res.status(201).json(result);
});

adminRouter.put('/products/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const body = updateProductSchema.parse(req.body);
  res.json(await adminUpdateProduct(id, body));
});

adminRouter.patch('/products/:id/status', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { is_active } = z.object({ is_active: z.boolean() }).parse(req.body);
  res.json(await adminSetProductStatus(id, is_active));
});

/* ─── Variantes ───────────────────────────────────────────────── */

adminRouter.post('/products/:id/variants', async (req, res) => {
  const productId = uuid.parse(req.params.id);
  const body = createVariantSchema.parse(req.body);
  const result = await adminCreateVariant(productId, body);
  res.status(201).json(result);
});

adminRouter.put('/variants/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const body = updateVariantSchema.parse(req.body);
  res.json(await adminUpdateVariant(id, body));
});

adminRouter.delete('/variants/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);
  res.json(await adminDeleteVariant(id));
});

// Ajustar stock: { delta: +10 | -2, reason: "Ingreso de mercadería" }
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

/* ─── Precios por mayor ────────────────────────────────────────── */

adminRouter.put('/products/:id/price-tiers', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { tiers } = z.object({ tiers: z.array(priceTierSchema) }).parse(req.body);
  res.json(await adminSetPriceTiers(id, tiers));
});

/* ─── Imágenes ────────────────────────────────────────────────── */

adminRouter.post('/products/:id/images', async (req, res) => {
  const productId = uuid.parse(req.params.id);
  const body = addImageSchema.parse(req.body);
  const result = await adminAddImage(productId, body);
  res.status(201).json(result);
});

adminRouter.delete('/images/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);
  res.json(await adminDeleteImage(id));
});

/* ─── Stock ───────────────────────────────────────────────────── */

adminRouter.get('/stock/low', async (_req, res) => {
  const { data, error } = await supabase.from('v_low_stock').select('*').order('stock');
  if (error) throw error;
  res.json({ data });
});

adminRouter.get('/stock/movements', async (req, res) => {
  const variantId = req.query.variantId as string | undefined;
  let q = supabase
    .from('stock_movements')
    .select('id, type, quantity, reason, created_at, variant_id')
    .order('created_at', { ascending: false })
    .limit(100);
  if (variantId) q = q.eq('variant_id', variantId);
  const { data, error } = await q;
  if (error) throw error;
  res.json({ data });
});

/* ─── Pedidos ─────────────────────────────────────────────────── */

adminRouter.get('/orders', async (req, res) => {
  const status = z
    .enum(['enviado_whatsapp', 'confirmado', 'pagado', 'entregado', 'cancelado'])
    .optional()
    .parse(req.query.status);

  let q = supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  res.json({ data });
});

adminRouter.get('/orders/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Pedido no encontrado');
  res.json(data);
});

// Cambiar estado. Al pasar a 'confirmado' se descuenta el stock (todo o nada).
adminRouter.patch('/orders/:id/status', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { status } = z
    .object({ status: z.enum(['confirmado', 'pagado', 'entregado', 'cancelado']) })
    .parse(req.body);

  if (status === 'confirmado') {
    const { error } = await supabase.rpc('confirm_order', {
      p_order: id,
      p_user: res.locals.userId,
    });
    if (error) throw new AppError(409, 'CONFIRM_ERROR', error.message);
  } else {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  }
  res.json({ ok: true, status });
});

/* ─── Settings ────────────────────────────────────────────────── */

adminRouter.get('/settings', async (_req, res) => {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  res.json(data);
});

adminRouter.put('/settings', async (req, res) => {
  const body = updateSettingsSchema.parse(req.body);
  res.json(await adminUpdateSettings(body));
});

/* ─── Catálogos (lectura para los selects del formulario) ──────── */

adminRouter.get('/catalogs', async (_req, res) => {
  const [categories, fits, materials, colors, sizes] = await Promise.all([
    supabase.from('categories').select('id, name, slug').eq('is_active', true).order('sort_order'),
    supabase.from('fits').select('id, name, slug').order('name'),
    supabase.from('materials').select('id, name, slug').order('name'),
    supabase.from('colors').select('id, name, hex').order('name'),
    supabase.from('sizes').select('id, label, sort_order').order('sort_order'),
  ]);
  for (const r of [categories, fits, materials, colors, sizes]) {
    if (r.error) throw r.error;
  }
  res.json({
    categories: categories.data,
    fits: fits.data,
    materials: materials.data,
    colors: colors.data,
    sizes: sizes.data,
  });
});
