import { z } from 'zod';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';

/* ─── Schemas de entrada ──────────────────────────────────────── */

export const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(999),
});

export const validateCartSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
});

export const createOrderSchema = z.object({
  origin: z.enum(['online', 'tienda']).default('online'),
  customer: z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
    phone: z.string().trim().max(20).optional(),
    note: z.string().trim().max(500).optional(),
  }),
  delivery: z.enum(['pickup', 'delivery']),
  address: z.string().trim().max(300).optional(),
  items: z.array(cartItemSchema).min(1).max(50),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/* ─── Tipos internos ──────────────────────────────────────────── */

type VariantRow = {
  id: string;
  stock: number;
  price_override: number | null;
  product_id: string;
  products: {
    name: string;
    base_price: number;
    sale_price: number | null;
    whatsapp_number?: string; // se une luego
  };
  sizes: { label: string } | null;
  colors: { name: string } | null;
};

type ValidatedItem = {
  variantId: string;
  qty: number;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  lineTotal: number;
};

/* ─── Helpers ─────────────────────────────────────────────────── */

const money = (n: number) => `S/ ${n.toFixed(2)}`;

/** Aplica price_tiers si corresponde; si no, devuelve el precio base del producto. */
async function resolveUnitPrice(
  productId: string,
  basePrice: number,
  salePrice: number | null,
  qty: number,
): Promise<number> {
  // Precio por mayor: buscar el tier más alto que aplique para esta cantidad
  const { data: tiers } = await supabase
    .from('price_tiers')
    .select('min_qty, unit_price')
    .eq('product_id', productId)
    .lte('min_qty', qty)
    .order('min_qty', { ascending: false })
    .limit(1);

  if (tiers && tiers.length > 0) {
    return tiers[0].unit_price as number;
  }

  // Precio normal (oferta si hay, si no base)
  return salePrice !== null && salePrice < basePrice ? salePrice : basePrice;
}

/** Construye el texto del mensaje de WhatsApp. */
function buildWhatsAppText(opts: {
  code: string;
  origin: string;
  customer: { name: string; phone?: string; delivery: string; address?: string; note?: string };
  items: ValidatedItem[];
  total: number;
}): string {
  const lines = opts.items.map(
    (it, i) =>
      `${i + 1}) ${it.productName}\n   Talla: ${it.size} · Color: ${it.color}\n   ${it.qty} × ${money(it.unitPrice)} = ${money(it.lineTotal)}`,
  );

  const deliveryLabel =
    opts.customer.delivery === 'pickup'
      ? 'Recojo en galería'
      : `Envío a: ${opts.customer.address ?? 'dirección no especificada'}`;

  return [
    '🛍️ *NUEVO PEDIDO · RKeens*',
    `Código: *${opts.code}*`,
    `Origen: ${opts.origin === 'online' ? 'Web' : 'Tienda'}`,
    '',
    `👤 *Cliente:* ${opts.customer.name}`,
    opts.customer.phone ? `📱 *Teléfono:* ${opts.customer.phone}` : '',
    `🚚 *Entrega:* ${deliveryLabel}`,
    '',
    '━━━━━━━━━━━━━━',
    '*DETALLE*',
    '',
    lines.join('\n\n'),
    '',
    '━━━━━━━━━━━━━━',
    `*Total: ${money(opts.total)}*`,
    opts.customer.note ? `\n📝 Nota: ${opts.customer.note}` : '',
    '',
    'Pedido generado desde el catálogo digital.',
  ]
    .filter((line, i, arr) => line !== '' || (arr[i - 1] ?? '') !== '')
    .join('\n');
}

/* ─── validateCart ────────────────────────────────────────────── */

/**
 * Verifica que cada variante exista y tenga stock suficiente.
 * Recalcula precios (incluye price_tiers).
 * Devuelve el carrito corregido con precios reales.
 */
export async function validateCart(
  rawItems: { variantId: string; qty: number }[],
): Promise<{ valid: boolean; items: ValidatedItem[]; errors: string[] }> {
  const errors: string[] = [];
  const validatedItems: ValidatedItem[] = [];

  // Traer todas las variantes de una sola consulta
  const ids = rawItems.map((i) => i.variantId);
  const { data: variants, error } = await supabase
    .from('product_variants')
    .select(
      'id, stock, price_override, product_id, products(name, base_price, sale_price), sizes(label), colors(name)',
    )
    .in('id', ids)
    .eq('is_active', true);

  if (error) throw error;

  const variantMap = new Map<string, VariantRow>(
    (variants ?? []).map((v: any) => [v.id as string, v as VariantRow]),
  );

  for (const item of rawItems) {
    const v = variantMap.get(item.variantId);

    if (!v) {
      errors.push(`Variante ${item.variantId}: no encontrada o inactiva.`);
      continue;
    }

    if (v.stock < item.qty) {
      errors.push(
        `${v.products.name} (${v.sizes?.label ?? '?'} / ${v.colors?.name ?? '?'}): solo quedan ${v.stock} unidades.`,
      );
      continue;
    }

    const unitPrice =
      v.price_override !== null
        ? v.price_override
        : await resolveUnitPrice(
            v.product_id,
            v.products.base_price,
            v.products.sale_price,
            item.qty,
          );

    validatedItems.push({
      variantId: v.id,
      qty: item.qty,
      productName: v.products.name,
      size: v.sizes?.label ?? '',
      color: v.colors?.name ?? '',
      unitPrice,
      lineTotal: unitPrice * item.qty,
    });
  }

  return {
    valid: errors.length === 0,
    items: validatedItems,
    errors,
  };
}

/* ─── createOrder ─────────────────────────────────────────────── */

export async function createOrder(input: CreateOrderInput): Promise<{
  code: string;
  whatsappUrl: string;
  whatsappText: string;
}> {
  // 1. Validar carrito completo (stock + precios reales)
  const { valid, items, errors } = await validateCart(input.items);
  if (!valid) {
    throw new AppError(
      409,
      'CART_INVALID',
      `El carrito tiene problemas: ${errors.join(' | ')}`,
    );
  }

  // 2. Calcular totales
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const total = subtotal; // sin impuestos ni envío por ahora

  // 3. Obtener configuración de la tienda (número de WhatsApp)
  const { data: settings, error: settingsError } = await supabase
    .from('store_settings')
    .select('whatsapp_number')
    .eq('id', 1)
    .maybeSingle();

  if (settingsError) throw settingsError;
  if (!settings?.whatsapp_number) {
    throw new AppError(500, 'NO_WHATSAPP', 'El número de WhatsApp de la tienda no está configurado');
  }

  // 4. Generar código y construir el mensaje ANTES de insertar
  //    (el default de la BD lo genera, pero lo necesitamos para el mensaje;
  //     lo generamos aquí con la misma función y lo pasamos explícitamente)
  const { data: codeRow, error: codeError } = await supabase
    .rpc('next_order_code');
  if (codeError) throw codeError;
  const code = codeRow as string;

  const deliveryLabel =
    input.delivery === 'pickup'
      ? 'Recojo en galería'
      : `Envío a: ${input.address ?? 'dirección no especificada'}`;

  const whatsappText = buildWhatsAppText({
    code,
    origin: input.origin,
    customer: {
      name: input.customer.name,
      phone: input.customer.phone,
      delivery: deliveryLabel,
      address: input.address,
      note: input.customer.note,
    },
    items,
    total,
  });

  const whatsappUrl = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(whatsappText)}`;

  // 5. Insertar pedido (con el código ya generado)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      code,
      origin: input.origin,
      status: 'enviado_whatsapp',
      customer_name: input.customer.name,
      customer_phone: input.customer.phone ?? null,
      customer_note: input.customer.note ?? null,
      delivery_type: input.delivery === 'pickup' ? 'recojo_galeria' : 'envio',
      subtotal,
      total,
      whatsapp_text: whatsappText,
    })
    .select('id')
    .single();

  if (orderError) throw orderError;

  // 6. Insertar ítems del pedido
  const orderItemsToInsert = items.map((item) => ({
    order_id: order.id,
    variant_id: item.variantId,
    product_name: item.productName,
    size_label: item.size,
    color_name: item.color,
    quantity: item.qty,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
  if (itemsError) throw itemsError;

  return { code, whatsappUrl, whatsappText };
}
