import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';
import {
  getProductBySlug,
  listFeatured,
  listProducts,
  productQuerySchema,
} from '../services/products.service';
import {
  createOrder,
  createOrderSchema,
  validateCart,
  validateCartSchema,
} from '../services/orders.service';

// Rate limit estricto para las rutas de pedidos (evita spam)
const ordersLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiadas solicitudes. Espera un momento.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicRouter = Router();

publicRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'prototipshop-api', time: new Date().toISOString() });
});

publicRouter.get('/settings', async (_req, res) => {
  const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NO_SETTINGS', 'Configuración de tienda no encontrada');
  res.json(data);
});

publicRouter.get('/filters', async (_req, res) => {
  const [categories, fits, materials, colors, sizes] = await Promise.all([
    supabase.from('categories').select('id, name, slug').eq('is_active', true).order('sort_order'),
    supabase.from('fits').select('id, name, slug').order('name'),
    supabase.from('materials').select('id, name, slug').order('name'),
    supabase.from('colors').select('id, name, hex').order('name'),
    supabase.from('sizes').select('id, label').order('sort_order'),
  ]);
  for (const r of [categories, fits, materials, colors, sizes]) {
    if (r.error) throw r.error;
  }
  res.json({
    genders: ['dama', 'caballero', 'unisex'],
    categories: categories.data,
    fits: fits.data,
    materials: materials.data,
    colors: colors.data,
    sizes: sizes.data,
  });
});

publicRouter.get('/products', async (req, res) => {
  const filters = productQuerySchema.parse(req.query);
  res.json(await listProducts(filters));
});

// Importante: va ANTES de /products/:slug para que "featured" no se tome como slug.
publicRouter.get('/products/featured', async (_req, res) => {
  res.json({ data: await listFeatured() });
});

publicRouter.get('/products/:slug', async (req, res) => {
  res.json(await getProductBySlug(req.params.slug));
});

// Valida stock y recalcula precios (incluye price_tiers para por mayor).
publicRouter.post('/cart/validate', ordersLimiter, async (req, res) => {
  const { items } = validateCartSchema.parse(req.body);
  const result = await validateCart(items);
  res.json(result);
});

// Registra el pedido, genera el código y devuelve { code, whatsappUrl, whatsappText }.
publicRouter.post('/orders', ordersLimiter, async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const result = await createOrder(input);
  res.status(201).json(result);
});
