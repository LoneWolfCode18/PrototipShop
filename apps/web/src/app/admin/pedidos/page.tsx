'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { listOrders, setOrderStatus } from '@/lib/adminClient';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  enviado_whatsapp: 'Enviado',
  confirmado: 'Confirmado',
  pagado: 'Pagado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  enviado_whatsapp: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-blue-100 text-blue-800',
  pagado: 'bg-green-100 text-green-800',
  entregado: 'bg-neutral-100 text-neutral-700',
  cancelado: 'bg-rose-100 text-rose-700',
};

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; value: Exclude<OrderStatus, 'enviado_whatsapp'> }>> = {
  enviado_whatsapp: { label: 'Confirmar (descuenta stock)', value: 'confirmado' },
  confirmado: { label: 'Marcar pagado', value: 'pagado' },
  pagado: { label: 'Marcar entregado', value: 'entregado' },
};

const money = (n: number) => `S/ ${n.toFixed(2)}`;

export default function PedidosPage() {
  const searchParams = useSearchParams();
  const filterStatus = (searchParams.get('status') as OrderStatus | null) ?? undefined;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('id') ?? null,
  );
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>( filterStatus ?? '');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    listOrders(statusFilter || undefined)
      .then((data) => { setOrders(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (order: Order, newStatus: Exclude<OrderStatus, 'enviado_whatsapp'>) => {
    if (newStatus === 'confirmado') {
      const ok = window.confirm(
        `¿Confirmar el pedido ${order.code}?\nEsto descontará el stock de las variantes. Esta acción no se puede deshacer.`,
      );
      if (!ok) return;
    }
    setUpdating(order.id);
    try {
      await setOrderStatus(order.id, newStatus);
      fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar';
      alert(msg);
    } finally {
      setUpdating(null);
    }
  };

  const selectedOrder = orders.find((o) => o.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-neutral-900">Pedidos</h1>

        {/* Filtro por estado */}
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
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Lista */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-neutral-200" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
              No hay pedidos{statusFilter ? ' con ese estado' : ''}.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-50">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id === selectedId ? null : order.id)}
                  className={`w-full text-left px-4 py-3 transition hover:bg-neutral-50 ${selectedId === order.id ? 'bg-neutral-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-neutral-900">{order.code}</p>
                      <p className="text-xs text-neutral-500 truncate">{order.customer_name ?? '—'}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      {new Date(order.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-sm font-bold text-neutral-900">{money(order.total)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalle */}
        <div className="lg:col-span-2">
          {!selectedOrder ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-neutral-200 text-sm text-neutral-400">
              Selecciona un pedido para ver el detalle
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              {/* Cabecera */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
                <div>
                  <p className="text-lg font-black text-neutral-900">{selectedOrder.code}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[selectedOrder.status]}`}>
                    {STATUS_LABEL[selectedOrder.status]}
                  </span>
                </div>
                {/* Botón de siguiente estado */}
                {NEXT_STATUS[selectedOrder.status] && (
                  <button
                    type="button"
                    disabled={updating === selectedOrder.id}
                    onClick={() => handleStatusChange(selectedOrder, NEXT_STATUS[selectedOrder.status]!.value)}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition"
                  >
                    {updating === selectedOrder.id ? 'Procesando…' : NEXT_STATUS[selectedOrder.status]!.label}
                  </button>
                )}
                {selectedOrder.status !== 'cancelado' && selectedOrder.status !== 'entregado' && (
                  <button
                    type="button"
                    disabled={updating === selectedOrder.id}
                    onClick={() => handleStatusChange(selectedOrder, 'cancelado')}
                    className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 transition"
                  >
                    Cancelar pedido
                  </button>
                )}
              </div>

              {/* Datos del cliente */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-5 py-4 text-sm border-b border-neutral-100">
                <div>
                  <p className="text-xs text-neutral-500">Cliente</p>
                  <p className="font-semibold text-neutral-900">{selectedOrder.customer_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Teléfono</p>
                  <p className="font-semibold text-neutral-900">{selectedOrder.customer_phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Entrega</p>
                  <p className="font-semibold text-neutral-900 capitalize">
                    {selectedOrder.delivery_type === 'recojo_galeria' ? 'Recojo en galería' : 'Envío a domicilio'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Origen</p>
                  <p className="font-semibold text-neutral-900 capitalize">{selectedOrder.origin}</p>
                </div>
                {selectedOrder.customer_note && (
                  <div className="col-span-2">
                    <p className="text-xs text-neutral-500">Nota</p>
                    <p className="font-medium text-neutral-800">{selectedOrder.customer_note}</p>
                  </div>
                )}
              </div>

              {/* Ítems */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">Detalle</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 leading-tight">{item.product_name}</p>
                          <p className="text-xs text-neutral-500">{item.size_label} · {item.color_name}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-neutral-500">{item.quantity} × {money(item.unit_price)}</p>
                          <p className="text-sm font-bold text-neutral-900">{money(item.line_total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end border-t border-neutral-100 pt-3">
                    <p className="text-base font-black text-neutral-900">Total: {money(selectedOrder.total)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
