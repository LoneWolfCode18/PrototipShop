'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStats } from '@/lib/adminClient';
import type { DashboardStats } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  enviado_whatsapp: 'Enviado',
  confirmado: 'Confirmado',
  pagado: 'Pagado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  enviado_whatsapp: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-blue-100 text-blue-800',
  pagado: 'bg-green-100 text-green-800',
  entregado: 'bg-neutral-100 text-neutral-700',
  cancelado: 'bg-rose-100 text-rose-700',
};

const money = (n: number) => `S/ ${n.toFixed(2)}`;

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1 rounded-xl border p-5 transition hover:shadow-md ${
        highlight && value > 0
          ? 'border-amber-200 bg-amber-50'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span
        className={`text-3xl font-black ${
          highlight && value > 0 ? 'text-amber-700' : 'text-neutral-900'
        }`}
      >
        {value}
      </span>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err.message ?? 'Error al cargar estadísticas'));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-200" />
          ))}
        </div>
        <div className="h-48 rounded-xl bg-neutral-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black text-neutral-900">Inicio</h1>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pedidos hoy" value={stats.ordersToday} href="/admin/pedidos" />
        <StatCard
          label="Pendientes de confirmar"
          value={stats.ordersPending}
          href="/admin/pedidos?status=enviado_whatsapp"
          highlight
        />
        <StatCard
          label="Variantes con stock bajo"
          value={stats.lowStockCount}
          href="/admin/stock"
          highlight
        />
      </div>

      {/* Últimos pedidos */}
      {stats.recentOrders.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-900">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-neutral-50">
            {stats.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/pedidos?id=${order.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{order.code}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {order.customer_name ?? 'Sin nombre'}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[order.status] ?? 'bg-neutral-100 text-neutral-700'}`}
                  >
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-bold text-neutral-900">{money(order.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stock bajo */}
      {stats.lowStockItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-amber-100">
            <h2 className="text-sm font-bold text-amber-900">⚠ Stock bajo</h2>
            <Link href="/admin/stock" className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition">
              Gestionar →
            </Link>
          </div>
          <div className="divide-y divide-amber-100">
            {stats.lowStockItems.slice(0, 5).map((item) => (
              <div key={item.variant_id} className="flex items-center justify-between px-5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-900 truncate">{item.product_name}</p>
                  <p className="text-xs text-amber-700">{item.size} · {item.color}</p>
                </div>
                <span className="ml-4 text-sm font-black text-rose-700 flex-shrink-0">
                  {item.stock} ud.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
