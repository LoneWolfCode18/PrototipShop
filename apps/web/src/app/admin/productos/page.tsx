'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listAdminProducts, setProductStatus, duplicateProduct } from '@/lib/adminClient';
import { toast } from '@/lib/toast';
import type { AdminProduct } from '@/lib/types';

const money = (n: number) => `S/ ${n.toFixed(2)}`;

type Gender = 'dama' | 'caballero' | 'unisex';

export default function ProductosAdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  // Filtros
  const [filterGender, setFilterGender] = useState<Gender | ''>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchProducts = useCallback(() => {
    setLoading(true);
    listAdminProducts()
      .then((data) => { setProducts(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleToggleStatus = async (product: AdminProduct) => {
    setToggling(product.id);
    try {
      await setProductStatus(product.id, !product.is_active);
      fetchProducts();
      toast.success(
        product.is_active
          ? `"${product.name}" desactivado.`
          : `"${product.name}" activado.`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setToggling(null);
    }
  };

  const handleDuplicate = async (product: AdminProduct) => {
    if (!confirm(`¿Duplicar "${product.name}"? Se creará una copia inactiva.`)) return;
    setDuplicating(product.id);
    try {
      const result = await duplicateProduct(product.id);
      toast.success(`Copia creada. Redirigiendo al editor…`);
      router.push(`/admin/productos/${result.id}/editar`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al duplicar');
    } finally {
      setDuplicating(null);
    }
  };

  // Categorías únicas presentes en la lista
  const categoryOptions = Array.from(
    new Map(
      products
        .filter((p) => p.category)
        .map((p) => [p.category!.id, p.category!]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const filtered = products.filter((p) => {
    if (search && !(
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (filterGender && p.gender !== filterGender) return false;
    if (filterCategory && String(p.category?.id) !== filterCategory) return false;
    if (filterActive === 'active' && !p.is_active) return false;
    if (filterActive === 'inactive' && p.is_active) return false;
    return true;
  });

  const hasFilters = search || filterGender || filterCategory || filterActive !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilterGender('');
    setFilterCategory('');
    setFilterActive('all');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-neutral-900">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-700 transition"
        >
          + Nueva prenda
        </Link>
      </div>

      {/* Buscador + Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o slug…"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 w-56"
        />

        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value as Gender | '')}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="">Todos los géneros</option>
          <option value="dama">Dama</option>
          <option value="caballero">Caballero</option>
          <option value="unisex">Unisex</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="">Todas las categorías</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="all">Activos e inactivos</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 transition"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl bg-neutral-200" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500">
          {hasFilters ? 'Sin resultados para esos filtros.' : 'No hay prendas aún.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {/* Encabezado tabla */}
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-neutral-100 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 sm:grid">
            <span>Prenda</span>
            <span className="text-right">Precio</span>
            <span className="text-center">Estado</span>
            <span className="text-center">Variantes</span>
            <span />
          </div>

          <div className="divide-y divide-neutral-50">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-4"
              >
                {/* Nombre + categoría */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{product.name}</p>
                  <p className="text-xs text-neutral-500">
                    {product.category?.name ?? '—'} · {product.gender}
                    {product.is_featured && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">★ Destacado</span>
                    )}
                  </p>
                </div>

                {/* Precio */}
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-900">{money(product.base_price)}</p>
                  {product.sale_price !== null && (
                    <p className="text-xs text-rose-600 font-semibold">{money(product.sale_price)} oferta</p>
                  )}
                </div>

                {/* Estado */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={toggling === product.id}
                    onClick={() => handleToggleStatus(product)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                      product.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    }`}
                    title={product.is_active ? 'Click para desactivar' : 'Click para activar'}
                  >
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                {/* Variantes */}
                <div className="text-center text-xs text-neutral-500">
                  {product.variants?.length ?? 0} var.
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/productos/${product.id}/editar`}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    disabled={duplicating === product.id}
                    onClick={() => handleDuplicate(product)}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 transition"
                    title="Duplicar producto"
                  >
                    {duplicating === product.id ? '…' : 'Duplicar'}
                  </button>
                  <Link
                    href={`/producto/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-400 hover:text-neutral-700 transition"
                    title="Ver en la tienda"
                  >
                    ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contador de resultados */}
      {!loading && products.length > 0 && (
        <p className="text-xs text-neutral-400">
          Mostrando {filtered.length} de {products.length} prendas
        </p>
      )}
    </div>
  );
}
