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
  store_name:         z.string().trim().min(1).max(80).optional(),
  whatsapp_number: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, 'Formato: código de país + número sin espacios ni +')
    .optional(),
  gallery_address:    z.string().trim().max(200).nullable().optional(),
  opening_hours:      z.string().trim().max(100).nullable().optional(),
  welcome_message:    z.string().trim().max(300).nullable().optional(),
  // 004_marca.sql
  logo_url:           z.string().url().nullable().optional(),
  primary_color:      z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal válido, ej: #1A2B3C')
    .nullable()
    .optional(),
  currency_symbol:    z.string().trim().min(1).max(10).optional(),
  phone_country_code: z.string().trim().regex(/^\d{1,4}$/, 'Solo dígitos, máximo 4').optional(),
  location_tag:       z.string().trim().max(80).nullable().optional(),
  // 005_tienda_publica.sql
  about_text:         z.string().trim().max(3000).nullable().optional(),
  hero_image_url:     z.string().url().nullable().optional(),
  hero_subtitle:      z.string().trim().max(300).nullable().optional(),
  catalog_subtitle:   z.string().trim().max(200).nullable().optional(),
  instagram_url:      z.string().url().nullable().optional(),
  facebook_url:       z.string().url().nullable().optional(),
  tiktok_url:         z.string().url().nullable().optional(),
});

export const createUserSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña temporal debe tener al menos 8 caracteres'),
  full_name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  role: z.enum(['admin', 'vendedor']),
});

export const updateUserSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  role: z.enum(['admin', 'vendedor']).optional(),
  is_active: z.boolean().optional(),
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

export async function adminDuplicateProduct(id: string) {
  // Obtener el producto original con variantes e imágenes
  const { data: original, error: fetchError } = await supabase
    .from('products')
    .select(
      `*, images:product_images(url, alt, sort_order, color_id),
       variants:product_variants(size_id, color_id, stock, price_override, low_stock_threshold),
       price_tiers(min_qty, unit_price)`,
    )
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!original) throw new AppError(404, 'NOT_FOUND', 'Producto no encontrado');

  // Generar slug único: base-(copia|copia-2|copia-3…)
  const baseSlug = `${original.slug}-copia`;
  let candidateSlug = baseSlug;
  let attempt = 1;
  while (true) {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle();
    if (!existing) break;
    attempt++;
    candidateSlug = `${baseSlug}-${attempt}`;
  }

  // Crear producto copia (inactivo, nombre con "(Copia)")
  const { data: newProduct, error: insertError } = await supabase
    .from('products')
    .insert({
      name: `${original.name} (Copia)`,
      slug: candidateSlug,
      description: original.description,
      gender: original.gender,
      category_id: original.category_id,
      fit_id: original.fit_id,
      material_id: original.material_id,
      base_price: original.base_price,
      sale_price: original.sale_price,
      is_featured: false,
      is_active: false,
    })
    .select('id, slug')
    .single();
  if (insertError) throw insertError;

  const newId = newProduct.id;

  // Copiar price tiers
  if (original.price_tiers?.length) {
    await supabase
      .from('price_tiers')
      .insert(original.price_tiers.map((t: { min_qty: number; unit_price: number }) => ({ ...t, product_id: newId })));
  }

  // Copiar imágenes
  if (original.images?.length) {
    await supabase
      .from('product_images')
      .insert(
        original.images.map((img: { url: string; alt: string | null; sort_order: number; color_id: number | null }) => ({
          product_id: newId,
          url: img.url,
          alt: img.alt,
          sort_order: img.sort_order,
          color_id: img.color_id,
        })),
      );
  }

  // Copiar variantes con SKU único y stock 0
  if (original.variants?.length) {
    for (const v of original.variants as Array<{
      size_id: number;
      color_id: number;
      stock: number;
      price_override: number | null;
      low_stock_threshold: number;
    }>) {
      // Generar SKU único basado en uuid truncado
      const skuBase = `${newId.slice(0, 8)}-${v.size_id}-${v.color_id}`;
      await supabase.from('product_variants').insert({
        product_id: newId,
        size_id: v.size_id,
        color_id: v.color_id,
        sku: skuBase,
        stock: 0,
        price_override: v.price_override,
        low_stock_threshold: v.low_stock_threshold,
        is_active: true,
      });
    }
  }

  return { id: newId, slug: candidateSlug };
}



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

export async function adminReorderImages(
  productId: string,
  orderedIds: string[],
) {
  // Actualizar sort_order de cada imagen según su posición en el array
  const updates = orderedIds.map((id, idx) =>
    supabase
      .from('product_images')
      .update({ sort_order: idx })
      .eq('id', id)
      .eq('product_id', productId),
  );
  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
  return { ok: true };
}

/* ─── Mostrador ───────────────────────────────────────────────── */

export const updateCounterSchema = z.object({
  show_in_counter:     z.boolean().optional(),
  counter_order:       z.number().int().min(0).optional(),
  is_counter_featured: z.boolean().optional(),
});

export async function adminListCounterProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, name, slug, gender, base_price, sale_price, is_featured, is_active,
       show_in_counter, counter_order, is_counter_featured,
       category:categories(id, name, slug),
       images:product_images(id, url, alt, sort_order),
       variants:product_variants(id, sku, stock, is_active, size:sizes(label), color:colors(name, hex))`,
    )
    .order('counter_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function adminUpdateCounterProduct(
  id: string,
  body: z.infer<typeof updateCounterSchema>,
) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Producto no encontrado');
  return { ok: true };
}

export async function adminReorderCounter(orderedIds: string[]) {
  const updates = orderedIds.map((id, idx) =>
    supabase
      .from('products')
      .update({ counter_order: idx, updated_at: new Date().toISOString() })
      .eq('id', id),
  );
  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
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

/* ─── Usuarios ────────────────────────────────────────────────── */

export async function adminListUsers() {
  const [{ data: authData, error: authError }, { data: profiles, error: profileError }] =
    await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase
        .from('profiles')
        .select('id, full_name, role, is_active, created_at')
        .order('created_at', { ascending: false }),
    ]);

  if (authError) throw authError;
  if (profileError) throw profileError;

  const authMap = new Map(authData.users.map((u) => [u.id, u]));

  return (profiles ?? []).map((p) => {
    const authUser = authMap.get(p.id);
    return {
      id: p.id,
      email: authUser?.email ?? '',
      full_name: p.full_name,
      role: p.role,
      is_active: p.is_active,
      created_at: p.created_at,
    };
  });
}

export async function adminCreateUser(body: z.infer<typeof createUserSchema>) {
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name },
  });

  if (userError || !userData.user) {
    throw new AppError(400, 'USER_CREATE_ERROR', userError?.message ?? 'No se pudo crear el usuario');
  }

  const userId = userData.user.id;

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    full_name: body.full_name,
    role: body.role,
    is_active: true,
  });

  if (profileError) {
    // Si falla el insert, borrar el usuario de Auth
    await supabase.auth.admin.deleteUser(userId);
    throw new AppError(400, 'PROFILE_CREATE_ERROR', profileError.message);
  }

  return {
    id: userId,
    email: body.email,
    full_name: body.full_name,
    role: body.role,
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

export async function adminUpdateUser(
  targetUserId: string,
  currentUserId: string,
  body: z.infer<typeof updateUserSchema>,
) {
  if (targetUserId === currentUserId) {
    if (body.is_active === false) {
      throw new AppError(400, 'SELF_DEACTIVATION', 'No puedes desactivar tu propia cuenta');
    }
    if (body.role === 'vendedor') {
      throw new AppError(400, 'SELF_DEMOTION', 'No puedes quitarte el rol de administrador');
    }
  }

  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetError) throw targetError;
  if (!targetProfile) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');

  const willBeInactive = body.is_active === false;
  const willBeDemoted = body.role === 'vendedor';

  if (targetProfile.role === 'admin' && targetProfile.is_active && (willBeInactive || willBeDemoted)) {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);

    if (countError) throw countError;
    if ((count ?? 0) <= 1) {
      throw new AppError(
        400,
        'CANNOT_REMOVE_LAST_ADMIN',
        'No se puede desactivar ni cambiar el rol al único administrador activo del sistema',
      );
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.full_name !== undefined) updatePayload.full_name = body.full_name;
  if (body.role !== undefined) updatePayload.role = body.role;
  if (body.is_active !== undefined) updatePayload.is_active = body.is_active;

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetUserId);

    if (updateError) throw updateError;
  }

  if (body.full_name !== undefined) {
    await supabase.auth.admin
      .updateUserById(targetUserId, {
        user_metadata: { full_name: body.full_name },
      })
      .catch(() => null);
  }

  const [{ data: updatedProfile, error: pError }, { data: authUser }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at')
      .eq('id', targetUserId)
      .single(),
    supabase.auth.admin.getUserById(targetUserId),
  ]);

  if (pError) throw pError;

  return {
    id: updatedProfile.id,
    email: authUser?.user?.email ?? '',
    full_name: updatedProfile.full_name,
    role: updatedProfile.role,
    is_active: updatedProfile.is_active,
    created_at: updatedProfile.created_at,
  };
}
