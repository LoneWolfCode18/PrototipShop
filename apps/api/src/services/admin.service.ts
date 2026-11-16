import { z } from 'zod';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';

/* ─── Schemas ─────────────────────────────────────────────────── */

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug solo puede tener letras minúsculas, números y guiones'),
  description: z.string().trim().max(1000).optional(),
  gender: z.enum(['dama', 'caballero', 'unisex']),
  category_id: z.number().int().positive(),
  fit_id: z.number().int().positive().optional(),
  material_id: z.number().int().positive().optional(),
  base_price: z.number().min(0),
  sale_price: z.number().min(0).nullable().optional(),
  is_featured: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  size_id: z.number().int().positive(),
  color_id: z.number().int().positive(),
  sku: z.string().trim().min(1).max(60),
  stock: z.number().int().min(0).default(0),
  price_override: z.number().min(0).nullable().optional(),
  low_stock_threshold: z.number().int().min(0).optional().default(3),
});

export const updateVariantSchema = createVariantSchema.partial();

export const priceTierSchema = z.object({
  min_qty: z.number().int().min(2),
  unit_price: z.number().min(0),
});

export const updateSettingsSchema = z.object({
  store_name: z.string().trim().min(1).max(80).optional(),
  whatsapp_number: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, 'Formato: código de país + número sin espacios ni +')
    .optional(),
  gallery_address: z.string().trim().max(200).nullable().optional(),
  opening_hours: z.string().trim().max(100).nullable().optional(),
  welcome_message: z.string().trim().max(300).nullable().optional(),
});

/* ─── Productos ───────────────────────────────────────────────── */

export async function adminListProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, name, slug, gender, base_price, sale_price, is_featured, is_active, created_at,
       category:categories(id, name),
       variants:product_variants(id, sku, stock, is_active, size:sizes(label), color:colors(name, hex))`,
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminGetProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(
      `*, category:categories(id, name, slug), fit:fits(id, name, slug), material:materials(id, name, slug),
       images:product_images(id, url, alt, sort_order),
       variants:product_variants(id, sku, stock, price_override, low_stock_threshold, is_active,
         size:sizes(id, label), color:colors(id, name, hex)),
       price_tiers(id, min_qty, unit_price)`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Producto no encontrado');
  return data;
}

export async function adminCreateProduct(body: z.infer<typeof createProductSchema>) {
  // Verificar slug único
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('slug', body.slug)
    .maybeSingle();
  if (existing) throw new AppError(409, 'SLUG_TAKEN', `El slug "${body.slug}" ya está en uso`);

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...body,
      sale_price: body.sale_price ?? null,
      fit_id: body.fit_id ?? null,
      material_id: body.material_id ?? null,
    })
    .select('id, slug')
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateProduct(id: string, body: z.infer<typeof updateProductSchema>) {
  // Si viene slug, verificar que no esté tomado por otro producto
  if (body.slug) {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('slug', body.slug)
      .neq('id', id)
      .maybeSingle();
    if (existing) throw new AppError(409, 'SLUG_TAKEN', `El slug "${body.slug}" ya está en uso`);
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Producto no encontrado');
  return data;
}

export async function adminSetProductStatus(id: string, is_active: boolean) {
  const { data, error } = await supabase
    .from('products')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Producto no encontrado');
  return { ok: true, is_active };
}

/* ─── Variantes ───────────────────────────────────────────────── */

export async function adminCreateVariant(
  productId: string,
  body: z.infer<typeof createVariantSchema>,
) {
  // Verificar que el producto existe
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Producto no encontrado');

  // Verificar SKU único
  const { data: skuExists } = await supabase
    .from('product_variants')
    .select('id')
    .eq('sku', body.sku)
    .maybeSingle();
  if (skuExists) throw new AppError(409, 'SKU_TAKEN', `El SKU "${body.sku}" ya existe`);

  const { data, error } = await supabase
    .from('product_variants')
    .insert({ ...body, product_id: productId, price_override: body.price_override ?? null })
    .select('id')
    .single();
  if (error) {
    // unique constraint (product_id, size_id, color_id)
    if (error.code === '23505') {
      throw new AppError(409, 'VARIANT_EXISTS', 'Ya existe una variante con esa talla y color');
    }
    throw error;
  }
  return data;
}

export async function adminUpdateVariant(
  variantId: string,
  body: z.infer<typeof updateVariantSchema>,
) {
  if (body.sku) {
    const { data: skuExists } = await supabase
      .from('product_variants')
      .select('id')
      .eq('sku', body.sku)
      .neq('id', variantId)
      .maybeSingle();
    if (skuExists) throw new AppError(409, 'SKU_TAKEN', `El SKU "${body.sku}" ya existe`);
  }

  const { data, error } = await supabase
    .from('product_variants')
    .update({ ...body, price_override: body.price_override ?? null })
    .eq('id', variantId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Variante no encontrada');
  return data;
}

export async function adminDeleteVariant(variantId: string) {
  // Verificar que no tiene order_items activos (no cancelados)
  const { data: items } = await supabase
    .from('order_items')
    .select('id')
    .eq('variant_id', variantId)
    .limit(1);
  if (items && items.length > 0) {
    // No eliminar: solo desactivar para preservar historial
    const { error } = await supabase
      .from('product_variants')
      .update({ is_active: false })
      .eq('id', variantId);
    if (error) throw error;
    return { ok: true, action: 'deactivated' };
  }

  const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
  if (error) throw error;
  return { ok: true, action: 'deleted' };
}

/* ─── Precios por mayor ────────────────────────────────────────── */

export async function adminSetPriceTiers(
  productId: string,
  tiers: z.infer<typeof priceTierSchema>[],
) {
  // Verificar producto
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Producto no encontrado');

  // Reemplazar todos los tiers del producto
  const { error: delError } = await supabase
    .from('price_tiers')
    .delete()
    .eq('product_id', productId);
  if (delError) throw delError;

  if (tiers.length === 0) return { ok: true };

  const { error: insertError } = await supabase
    .from('price_tiers')
    .insert(tiers.map((t) => ({ ...t, product_id: productId })));
  if (insertError) throw insertError;

  return { ok: true };
}

/* ─── Imágenes (URL externa) ──────────────────────────────────── */

export const addImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().trim().max(120).optional(),
  sort_order: z.number().int().min(0).optional().default(0),
  color_id: z.number().int().positive().optional(),
});

export async function adminAddImage(
  productId: string,
  body: z.infer<typeof addImageSchema>,
) {
  const { data, error } = await supabase
    .from('product_images')
    .insert({ ...body, product_id: productId, color_id: body.color_id ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function adminDeleteImage(imageId: string) {
  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  if (error) throw error;
  return { ok: true };
}

/* ─── Settings ────────────────────────────────────────────────── */

export async function adminUpdateSettings(body: z.infer<typeof updateSettingsSchema>) {
  const { data, error } = await supabase
    .from('store_settings')
    .update(body)
    .eq('id', 1)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Configuración no encontrada');
  return data;
}

/* ─── Stats (dashboard) ───────────────────────────────────────── */

export async function adminGetStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [ordersToday, ordersPending, lowStock] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'enviado_whatsapp'),
    supabase.from('v_low_stock').select('*').order('stock').limit(10),
  ]);

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, code, status, customer_name, total, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    ordersToday: ordersToday.count ?? 0,
    ordersPending: ordersPending.count ?? 0,
    lowStockCount: lowStock.data?.length ?? 0,
    lowStockItems: lowStock.data ?? [],
    recentOrders: recentOrders ?? [],
  };
}
