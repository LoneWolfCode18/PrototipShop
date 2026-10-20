import { z } from 'zod';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';

export const productQuerySchema = z.object({
  gender: z.enum(['dama', 'caballero', 'unisex']).optional(),
  category: z.string().trim().optional(), // slug: polos, poleras, conjuntos...
  fit: z.string().trim().optional(), // slug: clasico, oversize, boxy-fit
  material: z.string().trim().optional(), // slug: algodon-pima...
  color: z.string().trim().optional(), // nombre: Negro, Blanco...
  size: z.string().trim().optional(), // etiqueta: S, M, L...
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  q: z.string().trim().min(1).max(60).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

const PRODUCT_SELECT = `
  *,
  category:categories(name, slug),
  fit:fits(name, slug),
  material:materials(name, slug),
  images:product_images(url, alt, color_id, sort_order),
  variants:product_variants(id, sku, stock, price_override, is_active, size:sizes(label, sort_order), color:colors(name, hex))
`;

/** Convierte un nombre/slug en el id de su tabla de catálogo (sin distinguir mayúsculas). */
async function resolveId(table: string, column: string, value: string): Promise<number | null> {
  const escaped = value.replace(/[%_\\]/g, '\\$&');
  const { data, error } = await supabase.from(table).select('id').ilike(column, escaped).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Deja la respuesta lista para el frontend: solo variantes activas, precio final, imágenes ordenadas. */
function shape(row: any) {
  return {
    ...row,
    final_price: row.sale_price ?? row.base_price,
    images: [...(row.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
    variants: (row.variants ?? [])
      .filter((v: any) => v.is_active)
      .sort((a: any, b: any) => (a.size?.sort_order ?? 0) - (b.size?.sort_order ?? 0)),
  };
}

export async function listProducts(f: ProductQuery) {
  const empty = { data: [], page: f.page, limit: f.limit, total: 0 };

  const [categoryId, fitId, materialId, colorId, sizeId] = await Promise.all([
    f.category ? resolveId('categories', 'slug', f.category) : null,
    f.fit ? resolveId('fits', 'slug', f.fit) : null,
    f.material ? resolveId('materials', 'slug', f.material) : null,
    f.color ? resolveId('colors', 'name', f.color) : null,
    f.size ? resolveId('sizes', 'label', f.size) : null,
  ]);

  // Si pidieron un filtro que no existe, no hay resultados.
  if ((f.category && !categoryId) || (f.fit && !fitId) || (f.material && !materialId)) return empty;
  if ((f.color && !colorId) || (f.size && !sizeId)) return empty;

  // Filtros que dependen de las variantes (color, talla, con stock).
  let productIds: string[] | null = null;
  if (f.color || f.size || f.inStock === 'true') {
    let vq = supabase.from('product_variants').select('product_id').eq('is_active', true);
    if (colorId) vq = vq.eq('color_id', colorId);
    if (sizeId) vq = vq.eq('size_id', sizeId);
    if (f.inStock === 'true') vq = vq.gt('stock', 0);
    const { data, error } = await vq;
    if (error) throw error;
    productIds = [...new Set((data ?? []).map((r: any) => r.product_id as string))];
    if (productIds.length === 0) return empty;
  }

  let q = supabase.from('products').select(PRODUCT_SELECT, { count: 'exact' }).eq('is_active', true);

  if (f.gender) q = q.eq('gender', f.gender);
  if (categoryId) q = q.eq('category_id', categoryId);
  if (fitId) q = q.eq('fit_id', fitId);
  if (materialId) q = q.eq('material_id', materialId);
  if (productIds) q = q.in('id', productIds);
  // Simplificación: el rango de precio compara con el precio base (no con la oferta).
  if (f.minPrice !== undefined) q = q.gte('base_price', f.minPrice);
  if (f.maxPrice !== undefined) q = q.lte('base_price', f.maxPrice);
  if (f.q) q = q.ilike('name', `%${f.q.replace(/[%_\\]/g, '\\$&')}%`);

  if (f.sort === 'price_asc') q = q.order('base_price', { ascending: true });
  else if (f.sort === 'price_desc') q = q.order('base_price', { ascending: false });
  else q = q.order('created_at', { ascending: false });

  const from = (f.page - 1) * f.limit;
  q = q.range(from, from + f.limit - 1);

  const { data, count, error } = await q;
  if (error) throw error;

  return { data: (data ?? []).map(shape), page: f.page, limit: f.limit, total: count ?? 0 };
}

export async function listFeatured(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(shape);
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`${PRODUCT_SELECT}, price_tiers(min_qty, unit_price)`)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado');

  const product = shape(data);
  product.price_tiers = [...(data.price_tiers ?? [])].sort((a: any, b: any) => a.min_qty - b.min_qty);
  return product;
}
