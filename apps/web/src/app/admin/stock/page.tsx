'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getLowStock, adjustStock } from '@/lib/adminClient';
import { ApiError } from '@/lib/apiClient';
import type { DashboardStats } from '@/lib/types';

type LowStockItem = DashboardStats['lowStockItems'][number];

export default function StockPage() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado de ajuste por variante: { [variantId]: { delta, reason } }
  const [adjustments, setAdjustments] = useState<Record<string, { delta: string; reason: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    getLowStock()
      .then((data) => { setItems(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getAdj = (id: string) =>
    adjustments[id] ?? { delta: '', reason: '' };

  const setAdj = (id: string, field: 'delta' | 'reason', value: string) =>
    setAdjustments((a) => ({ ...a, [id]: { ...getAdj(id), [field]: value } }));

  const handleAdjust = async (item: LowStockItem) => {
    const adj = getAdj(item.variant_id);
    const delta = parseInt(adj.delta, 10);
    if (!delta || delta === 0) return alert('El delta no puede ser 0.');
    if (!adj.reason.trim()) return alert('El motivo es obligatorio.');

    setSaving(item.variant_id);
    try {
      await adjustStock(item.variant_id, delta, adj.reason.trim());
      // Limpiar y recargar
      setAdjustments((a) => {
        const next = { ...a };
        delete next[item.variant_id];
        return next;
      });
      fetchItems();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al ajustar stock');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-neutral-900">Stock bajo</h1>
        <button
          type="button"
          onClick={fetchItems}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-neutral-200" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center">
          <p className="text-sm font-semibold text-green-700">✓ Todo el stock está en niveles normales.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const adj = getAdj(item.variant_id);
            return (
              <div
                key={item.variant_id}
                className="rounded-xl border border-amber-200 bg-white overflow-hidden"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                  {/* Info */}
                  <div>
                    <Link
                      href={`/admin/productos/${item.product_id}/editar`}
                      className="text-sm font-bold text-neutral-900 hover:underline"
                    >
                      {item.product_name}
                    </Link>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Talla: <span className="font-medium">{item.size}</span> · Color: <span className="font-medium">{item.color}</span>
                    </p>
                    <p className="text-xs mt-1">
                      Stock actual: <span className="font-black text-rose-700">{item.stock}</span>
                      <span className="text-neutral-400"> / umbral: {item.low_stock_threshold}</span>
                    </p>
                  </div>

                  {/* Ajuste rápido */}
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Delta (+/-)
                      </label>
                      <input
                        type="number"
                        value={adj.delta}
                        onChange={(e) => setAdj(item.variant_id, 'delta', e.target.value)}
                        placeholder="ej: +10"
                        className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Motivo
                      </label>
                      <input
                        type="text"
                        value={adj.reason}
                        onChange={(e) => setAdj(item.variant_id, 'reason', e.target.value)}
                        placeholder="Ingreso de mercadería"
                        className="w-48 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={saving === item.variant_id}
                      onClick={() => handleAdjust(item)}
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition"
                    >
                      {saving === item.variant_id ? 'Guardando…' : 'Ajustar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Solo muestra variantes activas con stock ≤ umbral de alerta. Para ajustar stock de cualquier variante, también puedes ir a{' '}
        <Link href="/admin/productos" className="underline hover:text-neutral-700">Productos → Editar</Link>.
      </p>
    </div>
  );
}
