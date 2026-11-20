'use client';

import { useCallback, useEffect, useState } from 'react';
import { listOrders, setOrderStatus } from '@/lib/adminClient';
import type { OrderFilters } from '@/lib/adminClient';
import { toast } from '@/lib/toast';
import { useSettings } from '@/lib/settings';
import type { Order, OrderStatus } from '@/lib/types';

/* ─── Constantes de presentación ─── */

const STATUS_LABEL: Record<OrderStatus, string> = {
  enviado_whatsapp: 'Enviado',
  confirmado:       'Confirmado',
  pagado:           'Pagado',
  entregado:        'Entregado',
  cancelado:        'Cancelado',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  enviado_whatsapp: 'bg-amber-100 text-amber-800',
  confirmado:       'bg-blue-100  text-blue-800',
  pagado:           'bg-green-100 text-green-800',
  entregado:        'bg-neutral-100 text-neutral-700',
  cancelado:        'bg-rose-100  text-rose-700',
};

const NEXT_STATUS: Partial<Record<
  OrderStatus,
  { label: string; value: Exclude<OrderStatus, 'enviado_whatsapp'> }
>> = {
  enviado_whatsapp: { label: 'Confirmar (descuenta stock)', value: 'confirmado' },
  confirmado:       { label: 'Marcar pagado',               value: 'pagado'     },
  pagado:           { label: 'Marcar entregado',            value: 'entregado'  },
};

const money = (n: number) => `S/ ${n.toFixed(2)}`;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ─── Helpers de exportación CSV ─── */

function escapeCsv(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportToCsv(orders: Order[]) {
  const headers = [
    'Código', 'Estado', 'Cliente', 'Teléfono', 'Entrega', 'Origen',
    'Subtotal', 'Total', 'Fecha',
  ];
  const rows = orders.map((o) => [
    o.code,
    STATUS_LABEL[o.status],
    o.customer_name ?? '',
    o.customer_phone ?? '',
    o.delivery_type === 'recojo_galeria' ? 'Recojo galería' : o.delivery_type === 'envio' ? 'Envío' : '',
    o.origin,
    o.subtotal.toFixed(2),
    o.total.toFixed(2),
    fmtDate(o.created_at),
  ]);

  const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `pedidos-${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── WhatsApp helper ─── */

function waUrl(phone: string, code: string, countryCode: string): string {
  let num = phone.replace(/[\s\-+()\u00a0]/g, '');
  // Si parece número local (comienza por el primer dígito del prefijo local común)
  // y tiene ≤ 9 dígitos, añadimos el código de país
  if (num.length <= 9 && !num.startsWith(countryCode)) num = `${countryCode}${num}`;
  const text = encodeURIComponent(`Hola, te contactamos sobre tu pedido ${code}.`);
  return `https://wa.me/${num}?text=${text}`;
}

/* ══════════════════════════════════════════════════════════════════
   Página principal
   ══════════════════════════════════════════════════════════════════ */

export default function PedidosPage() {
  const settings = useSettings();
  const countryCode = settings.phone_country_code || '51';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filtros */
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [search, setSearch]             = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');

  /* UI */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updating, setUpdating]     = useState<string | null>(null);
  // En móvil, el detalle ocupa toda la pantalla cuando está abierto
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError(null);
    const filters: OrderFilters = {};
    if (statusFilter) filters.status    = statusFilter;
    if (search.trim()) filters.search   = search.trim();
    if (dateFrom)      filters.date_from = dateFrom;
    if (dateTo)        filters.date_to   = dateTo;

    listOrders(filters)
      .then((data) => { setOrders(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
        setLoading(false);
      });
  }, [statusFilter, search, dateFrom, dateTo]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Cambio de estado ── */
  const handleStatusChange = async (
    order: Order,
    newStatus: Exclude<OrderStatus, 'enviado_whatsapp'>,
  ) => {
    if (newStatus === 'confirmado') {
      const ok = window.confirm(
        `¿Confirmar el pedido ${order.code}?\nEsto descuenta el stock. No se puede deshacer.`,
      );
      if (!ok) return;
    }
    if (newStatus === 'cancelado') {
      const ok = window.confirm(`¿Cancelar el pedido ${order.code}?`);
      if (!ok) return;
    }

    setUpdating(order.id);
    try {
      await setOrderStatus(order.id, newStatus);
      toast.success(`Pedido ${order.code} → ${STATUS_LABEL[newStatus]}`);
      fetchOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  /* ── Limpiar filtros ── */
  const hasFilters = statusFilter || search || dateFrom || dateTo;
  const clearFilters = () => {
    setStatusFilter('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const selectedOrder = orders.find((o) => o.id === selectedId);

  const openDetail = (id: string) => {
    setSelectedId(id === selectedId ? null : id);
    setDetailOpen(true);
  };

  /* ── Exportar solo los pedidos actualmente visibles ── */
  const handleExport = () => {
    if (orders.length === 0) { toast.info('No hay pedidos para exportar.'); return; }
    exportToCsv(orders);
    toast.success(`${orders.length} pedidos exportados.`);
  };

  return (
    <div className="space-y-5">
      {/* ── Cabecera ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-neutral-900">Pedidos</h1>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
        >
          ↓ Exportar CSV
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-2 items-end">
        {/* Buscador */}
        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Código o cliente…"
            className="w-48 rounded-lg border border-neutral-200 pl-8 pr-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
            🔍
          </span>
        </div>

        {/* Estado */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); setSelectedId(null); }}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        {/* Desde */}
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-neutral-500 mb-0.5">Desde</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* Hasta */}
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-neutral-500 mb-0.5">Hasta</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="self-end rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 transition"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
          <button
            type="button"
            onClick={fetchOrders}
            className="ml-3 underline text-rose-700 hover:text-rose-900"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Layout lista + detalle ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Lista — oculta en móvil cuando el detalle está abierto */}
        <div className={`lg:col-span-1 ${detailOpen && selectedOrder ? 'hidden lg:block' : ''}`}>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-neutral-200" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500">
              {hasFilters ? 'Sin resultados para esos filtros.' : 'No hay pedidos aún.'}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-neutral-400">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</p>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-50">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => openDetail(order.id)}
                    className={`w-full text-left px-4 py-3 transition hover:bg-neutral-50 ${
                      selectedId === order.id ? 'bg-neutral-50 ring-1 ring-inset ring-neutral-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-neutral-900">{order.code}</p>
                        <p className="text-xs text-neutral-500 truncate">
                          {order.customer_name ?? '—'}
                          {order.customer_phone && (
                            <span className="ml-1 text-neutral-400">· {order.customer_phone}</span>
                          )}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-neutral-400">{fmtDate(order.created_at)}</span>
                      <span className="text-sm font-bold text-neutral-900">{money(order.total)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Detalle */}
        <div className={`lg:col-span-2 ${detailOpen && selectedOrder ? '' : 'hidden lg:block'}`}>
          {!selectedOrder ? (
            <div className="hidden lg:flex h-48 items-center justify-center rounded-xl border border-dashed border-neutral-200 text-sm text-neutral-400">
              Selecciona un pedido para ver el detalle
            </div>
          ) : (
            <OrderDetail
              order={selectedOrder}
              updating={updating === selectedOrder.id}
              onStatusChange={handleStatusChange}
              onBack={() => { setDetailOpen(false); }}
              countryCode={countryCode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Componente de detalle de pedido
   ══════════════════════════════════════════════════════════════════ */

function OrderDetail({
  order,
  updating,
  onStatusChange,
  onBack,
  countryCode,
}: {
  order: Order;
  updating: boolean;
  onStatusChange: (order: Order, status: Exclude<OrderStatus, 'enviado_whatsapp'>) => void;
  onBack: () => void;
  countryCode: string;
}) {
  const next = NEXT_STATUS[order.status];
  const canCancel = order.status !== 'cancelado' && order.status !== 'entregado';
  const hasPhone = !!(order.customer_phone?.trim());

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-3">
          {/* Botón volver — solo visible en móvil */}
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden text-sm text-neutral-500 hover:text-neutral-800 transition"
            aria-label="Volver a la lista"
          >
            ← Volver
          </button>
          <div>
            <p className="text-lg font-black text-neutral-900">{order.code}</p>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          {/* WhatsApp */}
          {hasPhone && (
            <a
              href={waUrl(order.customer_phone!, order.code, countryCode)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition"
            >
              <span>📱</span> WhatsApp
            </a>
          )}

          {/* Avanzar estado */}
          {next && (
            <button
              type="button"
              disabled={updating}
              onClick={() => onStatusChange(order, next.value)}
              className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition"
            >
              {updating ? 'Procesando…' : next.label}
            </button>
          )}

          {/* Cancelar */}
          {canCancel && (
            <button
              type="button"
              disabled={updating}
              onClick={() => onStatusChange(order, 'cancelado')}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-sm border-b border-neutral-100">
        <InfoField label="Cliente"  value={order.customer_name} />
        <InfoField
          label="Teléfono"
          value={order.customer_phone}
          render={
            hasPhone
              ? (v) => (
                  <a
                    href={waUrl(order.customer_phone!, order.code, countryCode)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-green-700 underline underline-offset-2"
                  >
                    {v}
                  </a>
                )
              : undefined
          }
        />
        <InfoField
          label="Entrega"
          value={
            order.delivery_type === 'recojo_galeria'
              ? 'Recojo en galería'
              : order.delivery_type === 'envio'
                ? 'Envío a domicilio'
                : null
          }
        />
        <InfoField label="Origen"  value={order.origin} />
        <InfoField label="Fecha"   value={fmtDate(order.created_at)} />
        {order.customer_note && (
          <div className="col-span-2">
            <p className="text-xs text-neutral-500 mb-0.5">Nota del cliente</p>
            <p className="font-medium text-neutral-800 text-sm">{order.customer_note}</p>
          </div>
        )}
      </div>

      {/* Ítems */}
      {order.items && order.items.length > 0 ? (
        <div className="px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">
            Detalle ({order.items.length} ítem{order.items.length !== 1 ? 's' : ''})
          </p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 leading-tight">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {item.size_label} · {item.color_name}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-neutral-500">
                    {item.quantity} × {money(item.unit_price)}
                  </p>
                  <p className="text-sm font-bold text-neutral-900">{money(item.line_total)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between items-center border-t border-neutral-100 pt-3">
            <p className="text-xs text-neutral-500">Subtotal: {money(order.subtotal)}</p>
            <p className="text-base font-black text-neutral-900">Total: {money(order.total)}</p>
          </div>
        </div>
      ) : (
        <div className="px-5 py-4 text-sm text-neutral-400">Sin ítems registrados.</div>
      )}
    </div>
  );
}

/* ── Campo de información genérico ── */
function InfoField({
  label,
  value,
  render,
}: {
  label: string;
  value: string | null | undefined;
  render?: (v: string) => React.ReactNode;
}) {
  const display = value?.trim() ? value : '—';
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      {render && value?.trim() ? (
        render(value)
      ) : (
        <p className="font-semibold text-neutral-900 capitalize">{display}</p>
      )}
    </div>
  );
}
