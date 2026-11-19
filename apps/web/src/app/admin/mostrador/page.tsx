'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listCounterProducts,
  reorderCounter,
  updateCounterSettings,
  adjustStock,
} from '@/lib/adminClient';
import { toast } from '@/lib/toast';
import { QrCode, QrCodePrint } from '@/components/admin/QrCode';
import type { AdminProduct } from '@/lib/types';

const money = (n: number) => `S/ ${n.toFixed(2)}`;

/* ── Helpers ── */
function totalStock(p: AdminProduct) {
  return p.variants?.reduce((s, v) => s + (v.is_active ? v.stock : 0), 0) ?? 0;
}

export default function MostradorAdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Panel QR expandido
  const [qrOpen, setQrOpen] = useState<string | null>(null);

  // Panel ajuste rápido de stock
  const [stockPanel, setStockPanel] = useState<{
    variantId: string;
    productName: string;
    variantLabel: string;
    current: number;
  } | null>(null);

  // Vista imprimible
  const [printOpen, setPrintOpen] = useState(false);

  // Guardado en curso
  const [saving, setSaving] = useState<string | null>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    listCounterProducts()
      .then((data) => { setProducts(data); setLoading(false); })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Error al cargar');
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* ── Toggle "Mostrar en mostrador" ── */
  const handleToggleCounter = async (p: AdminProduct) => {
    setSaving(p.id);
    try {
      await updateCounterSettings(p.id, { show_in_counter: !p.show_in_counter });
      setProducts((ps) =>
        ps.map((x) => (x.id === p.id ? { ...x, show_in_counter: !p.show_in_counter } : x)),
      );
      toast.success(
        p.show_in_counter
          ? `"${p.name}" ocultado del mostrador.`
          : `"${p.name}" visible en mostrador.`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(null);
    }
  };

  /* ── Toggle "Destacado en mostrador" ── */
  const handleToggleFeatured = async (p: AdminProduct) => {
    setSaving(p.id);
    try {
      await updateCounterSettings(p.id, { is_counter_featured: !p.is_counter_featured });
      setProducts((ps) =>
        ps.map((x) =>
          x.id === p.id ? { ...x, is_counter_featured: !p.is_counter_featured } : x,
        ),
      );
      toast.success(
        p.is_counter_featured
          ? `"${p.name}" ya no es destacado.`
          : `"${p.name}" marcado como destacado.`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(null);
    }
  };

  /* ── Mover producto en el orden del mostrador ── */
  const moveProduct = async (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= products.length) return;
    const updated = [...products];
    [updated[index], updated[swapIdx]] = [updated[swapIdx], updated[index]];
    setProducts(updated);
    try {
      await reorderCounter(updated.map((p) => p.id));
    } catch {
      setProducts(products);
      toast.error('No se pudo guardar el orden.');
    }
  };

  const filtered = products.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-neutral-900">Mostrador</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
          >
            🖨 Vista imprimible
          </button>
        </div>
      </div>

      <p className="text-sm text-neutral-500">
        Gestiona qué prendas aparecen en la pantalla de mostrador, su orden y sus QR.
      </p>

      {/* Buscador */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar prenda…"
        className="w-full max-w-sm rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
      />

      {/* Lista */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500">
          {search ? 'Sin resultados.' : 'No hay prendas aún.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-50">
          {/* Cabecera tabla */}
          <div className="hidden grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 border-b border-neutral-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 sm:grid">
            <span className="w-8 text-center">#</span>
            <span>Prenda</span>
            <span className="text-center">Stock</span>
            <span className="text-center">Mostrador</span>
            <span className="text-center">Destacado</span>
            <span className="text-center">QR</span>
            <span className="text-center">Ajuste rápido</span>
          </div>

          {filtered.map((p, idx) => (
            <div
              key={p.id}
              className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[auto_1fr_auto_auto_auto_auto_auto] sm:items-center sm:gap-4"
            >
              {/* Orden */}
              <div className="flex items-center gap-1 w-8">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveProduct(idx, 'up')}
                    disabled={idx === 0}
                    className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20 leading-none"
                    title="Subir"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProduct(idx, 'down')}
                    disabled={idx === filtered.length - 1}
                    className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20 leading-none"
                    title="Bajar"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {p.category?.name ?? '—'} · {p.gender}
                  {!p.is_active && (
                    <span className="ml-1.5 rounded bg-neutral-100 px-1 py-0.5 text-[10px] font-medium text-neutral-500">
                      Inactivo
                    </span>
                  )}
                </p>
              </div>

              {/* Stock total */}
              <div className="text-center">
                <span
                  className={`text-sm font-bold ${totalStock(p) === 0 ? 'text-rose-600' : totalStock(p) <= 5 ? 'text-amber-600' : 'text-neutral-800'}`}
                >
                  {totalStock(p)}
                </span>
              </div>

              {/* Toggle mostrador */}
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={saving === p.id}
                  onClick={() => handleToggleCounter(p)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    p.show_in_counter
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                  }`}
                  title={p.show_in_counter ? 'Ocultar del mostrador' : 'Mostrar en mostrador'}
                >
                  {p.show_in_counter ? 'Visible' : 'Oculto'}
                </button>
              </div>

              {/* Toggle destacado */}
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={saving === p.id}
                  onClick={() => handleToggleFeatured(p)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    p.is_counter_featured
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                  }`}
                  title={p.is_counter_featured ? 'Quitar destacado' : 'Marcar destacado'}
                >
                  {p.is_counter_featured ? '★ Dest.' : '☆'}
                </button>
              </div>

              {/* QR */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setQrOpen(qrOpen === p.id ? null : p.id)}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  QR
                </button>
              </div>

              {/* Ajuste rápido stock */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const firstVariant = p.variants?.find((v) => v.is_active);
                    if (!firstVariant) {
                      toast.info('Esta prenda no tiene variantes activas.');
                      return;
                    }
                    setStockPanel({
                      variantId: firstVariant.id,
                      productName: p.name,
                      variantLabel: `${firstVariant.size?.label ?? '—'} / ${firstVariant.color?.name ?? '—'}`,
                      current: firstVariant.stock,
                    });
                  }}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition"
                  title="Ajuste rápido de stock"
                >
                  Stock ±
                </button>
              </div>

              {/* Panel QR expandido */}
              {qrOpen === p.id && (
                <div className="col-span-full border-t border-neutral-100 pt-3 pb-1 flex justify-center">
                  <QrCode slug={p.slug} size={160} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal ajuste rápido de stock */}
      {stockPanel && (
        <StockAdjustModal
          panel={stockPanel}
          onClose={() => setStockPanel(null)}
          onSaved={(variantId, newStock) => {
            setProducts((ps) =>
              ps.map((p) => ({
                ...p,
                variants: p.variants?.map((v) =>
                  v.id === variantId ? { ...v, stock: newStock } : v,
                ),
              })),
            );
            setStockPanel(null);
          }}
        />
      )}

      {/* Vista imprimible */}
      {printOpen && (
        <PrintView products={products.filter((p) => p.show_in_counter)} onClose={() => setPrintOpen(false)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Modal: ajuste rápido de stock
   ═══════════════════════════════════════════════════════════════ */
function StockAdjustModal({
  panel,
  onClose,
  onSaved,
}: {
  panel: { variantId: string; productName: string; variantLabel: string; current: number };
  onClose: () => void;
  onSaved: (variantId: string, newStock: number) => void;
}) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const deltaNum = parseInt(delta, 10);
  const preview = !isNaN(deltaNum) ? panel.current + deltaNum : null;
  const invalid = isNaN(deltaNum) || deltaNum === 0 || !reason.trim();

  const handleSave = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      const result = await adjustStock(panel.variantId, deltaNum, reason.trim());
      toast.success(`Stock actualizado: ${result.stock} uds.`);
      onSaved(panel.variantId, result.stock);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Ajuste de stock</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{panel.productName}</p>
            <p className="text-xs text-neutral-400">{panel.variantLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="rounded-lg bg-neutral-50 px-4 py-3 text-center">
          <p className="text-xs text-neutral-500">Stock actual</p>
          <p className="text-2xl font-black text-neutral-900">{panel.current}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Delta (+/−)
            </label>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="+10 ó -3"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            {preview !== null && (
              <p className="mt-1 text-xs text-neutral-500">
                Resultado: <strong className={preview < 0 ? 'text-rose-600' : ''}>{preview}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Motivo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ingreso de mercadería, devolución…"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-200 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={invalid || saving}
            onClick={handleSave}
            className="flex-1 rounded-lg bg-neutral-900 py-2 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-50 transition"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Vista imprimible: varios QR por hoja
   ═══════════════════════════════════════════════════════════════ */
function PrintView({
  products,
  onClose,
}: {
  products: AdminProduct[];
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Prendas</title>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 16px; }
        .grid { display: flex; flex-wrap: wrap; gap: 24px; justify-content: flex-start; }
        .item { display: flex; flex-direction: column; align-items: center; gap: 4px; page-break-inside: avoid; }
        canvas { border-radius: 4px; }
        p { margin: 0; font-size: 11px; text-align: center; max-width: 120px; word-break: break-word; }
        .price { color: #555; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <h2 className="text-sm font-bold text-neutral-900">Vista imprimible — QR de prendas</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 transition"
            >
              🖨 Imprimir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Grid de QR (también es el contenido que se imprime) */}
        <div className="overflow-y-auto p-6">
          <div ref={printRef}>
            <div className="flex flex-wrap gap-6 justify-start">
              {products.map((p) => (
                <QrCodePrint
                  key={p.id}
                  slug={p.slug}
                  name={p.name}
                  price={p.sale_price ?? p.base_price}
                  size={120}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
