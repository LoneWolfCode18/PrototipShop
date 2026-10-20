export type WhatsAppItem = {
  name: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: number;
};

type Options = {
  phone: string; // formato 519XXXXXXXX, sin "+"
  code: string; // ej: RK-20261020-0042 (lo genera la base de datos al guardar el pedido)
  origin: 'Web' | 'Tienda';
  customer: { name: string; phone?: string; delivery: string; note?: string };
  items: WhatsAppItem[];
};

const money = (n: number) => `S/ ${n.toFixed(2)}`;

export function buildWhatsAppText(opts: Options): string {
  const lines = opts.items.map(
    (it, i) =>
      `${i + 1}) ${it.name}\n   Talla: ${it.size} · Color: ${it.color}\n   ${it.qty} × ${money(it.unitPrice)} = ${money(it.qty * it.unitPrice)}`,
  );
  const total = opts.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  return [
    '🛍️ *NUEVO PEDIDO · RKeens*',
    `Código: *${opts.code}*`,
    `Origen: ${opts.origin}`,
    '',
    `👤 *Cliente:* ${opts.customer.name}`,
    opts.customer.phone ? `📱 *Teléfono:* ${opts.customer.phone}` : '',
    `🚚 *Entrega:* ${opts.customer.delivery}`,
    '',
    '━━━━━━━━━━━━━━',
    '*DETALLE*',
    '',
    lines.join('\n\n'),
    '',
    '━━━━━━━━━━━━━━',
    `*Total: ${money(total)}*`,
    opts.customer.note ? `\n📝 Nota: ${opts.customer.note}` : '',
    '',
    'Pedido generado desde el catálogo digital.',
  ]
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n');
}

export function buildWhatsAppUrl(opts: Options): string {
  return `https://wa.me/${opts.phone}?text=${encodeURIComponent(buildWhatsAppText(opts))}`;
}
