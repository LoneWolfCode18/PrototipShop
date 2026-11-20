export type WhatsAppItem = {
  name: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: number;
};

type Options = {
  storeName: string;      // viene de store_settings.store_name
  currencySymbol: string; // viene de store_settings.currency_symbol
  phone: string;          // formato 519XXXXXXXX, sin "+"
  code: string;           // ej: RK-20261020-0042
  origin: 'Web' | 'Tienda';
  customer: { name: string; phone?: string; delivery: string; note?: string };
  items: WhatsAppItem[];
};

const makeMoney = (sym: string) => (n: number) => `${sym} ${n.toFixed(2)}`;

export function buildWhatsAppText(opts: Options): string {
  const money = makeMoney(opts.currencySymbol);
  const lines = opts.items.map(
    (it, i) =>
      `${i + 1}) ${it.name}\n   Talla: ${it.size} · Color: ${it.color}\n   ${it.qty} × ${money(it.unitPrice)} = ${money(it.qty * it.unitPrice)}`,
  );
  const total = opts.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  return [
    `🛍️ *NUEVO PEDIDO · ${opts.storeName.toUpperCase()}*`,
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
