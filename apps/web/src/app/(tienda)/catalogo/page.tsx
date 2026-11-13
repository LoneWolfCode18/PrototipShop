'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/apiClient';
import type { FiltersResponse, Product, ProductListResponse } from '@/lib/types';
import { ProductCard } from '@/components/catalog/ProductCard';
import { FilterBar, type ActiveFilters } from '@/components/catalog/FilterBar';
import { SortSelector } from '@/components/catalog/SortSelector';
import { Pagination } from '@/components/catalog/Pagination';

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [availableFilters, setAvailableFilters] = useState<FiltersResponse | null>(null);
  const [productsData, setProductsData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Leer estado inicial de los searchParams de la URL
  const activeFilters: ActiveFilters = {
    gender: (searchParams.get('gender') as any) || undefined,
    category: searchParams.get('category') || undefined,
    fit: searchParams.get('fit') || undefined,
    material: searchParams.get('material') || undefined,
    color: searchParams.get('color') || undefined,
    size: searchParams.get('size') || undefined,
    inStock: searchParams.get('inStock') === 'true' ? true : undefined,
    q: searchParams.get('q') || undefined,
  };

  const currentSort = (searchParams.get('sort') as any) || 'newest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // 1. Cargar opciones del catálogo de filtros
  useEffect(() => {
    api<FiltersResponse>('/filters')
      .then(setAvailableFilters)
      .catch((err) => console.error('Error cargando filtros:', err));
  }, []);

  // 2. Cargar productos cada vez que cambien los searchParams
  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (activeFilters.gender) query.set('gender', activeFilters.gender);
    if (activeFilters.category) query.set('category', activeFilters.category);
    if (activeFilters.fit) query.set('fit', activeFilters.fit);
    if (activeFilters.material) query.set('material', activeFilters.material);
    if (activeFilters.color) query.set('color', activeFilters.color);
    if (activeFilters.size) query.set('size', activeFilters.size);
    if (activeFilters.inStock) query.set('inStock', 'true');
    if (activeFilters.q) query.set('q', activeFilters.q);
    query.set('sort', currentSort);
    query.set('page', String(currentPage));
    query.set('limit', '12');

    api<ProductListResponse>(`/products?${query.toString()}`)
      .then((res) => {
        setProductsData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error al conectar con la tienda');
        setLoading(false);
      });
  }, [searchParams]);

  // Actualizar la URL de forma suave al cambiar un filtro
  const updateUrl = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([k, v]) => {
      if (v === undefined || v === '') {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });

    // Resetear a la página 1 cuando se cambia un filtro (excepto si el cambio fue de página)
    if (!('page' in newParams)) {
      params.delete('page');
    }

    startTransition(() => {
      router.push(`/catalogo?${params.toString()}`, { scroll: false });
    });
  };

  const handleFilterChange = (key: keyof ActiveFilters, value: any) => {
    updateUrl({ [key]: value ? String(value) : undefined });
  };

  const handleSortChange = (newSort: 'newest' | 'price_asc' | 'price_desc') => {
    updateUrl({ sort: newSort });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push('/catalogo', { scroll: false });
    });
  };

  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Encabezado del catálogo */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
            Catálogo de Prendas
          </h1>
          <p className="mt-1 text-xs text-neutral-600 sm:text-sm">
            Polos, poleras y conjuntos Tech confeccionados en Gamarra.
          </p>
        </div>

        {/* Acciones de cabecera: Botón móvil de filtros + Selector de orden */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-xs lg:hidden hover:bg-neutral-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
            Filtros {activeCount > 0 && `(${activeCount})`}
          </button>

          <SortSelector value={currentSort} onChange={handleSortChange} />
        </div>
      </div>

      {/* Contenedor principal: Barra lateral + Grid */}
      <div className="flex gap-8">
        <FilterBar
          availableFilters={availableFilters}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
          isOpenMobile={mobileFilterOpen}
          onCloseMobile={() => setMobileFilterOpen(false)}
        />

        {/* Área del Grid de Productos */}
        <main className="flex-1">
          {/* Chips de filtros activos para limpiar rápidamente */}
          {activeCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-500">Filtrando por:</span>
              {Object.entries(activeFilters).map(([k, v]) => {
                if (!v) return null;
                const label = k === 'inStock' ? 'En stock' : String(v);
                return (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-200/80 px-2.5 py-0.5 text-[11px] font-medium text-neutral-800"
                  >
                    <span className="capitalize">{label}</span>
                    <button
                      type="button"
                      onClick={() => handleFilterChange(k as any, undefined)}
                      className="text-neutral-500 hover:text-neutral-900"
                      aria-label={`Eliminar filtro ${label}`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Limpiar todos
              </button>
            </div>
          )}

          {/* Estado de Error */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="text-sm font-medium text-rose-800">{error}</p>
              <p className="mt-1 text-xs text-rose-600">
                Asegúrate de que la API esté encendida en local o que Supabase tenga conexión.
              </p>
            </div>
          )}

          {/* Skeletons de Carga */}
          {loading && !error && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="aspect-[3/4] w-full rounded-lg bg-neutral-200" />
                  <div className="mt-3 h-3 w-1/3 rounded bg-neutral-200" />
                  <div className="mt-2 h-4 w-3/4 rounded bg-neutral-200" />
                  <div className="mt-4 h-5 w-1/2 rounded bg-neutral-200" />
                </div>
              ))}
            </div>
          )}

          {/* Lista vacía */}
          {!loading && !error && (!productsData?.data || productsData.data.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-neutral-900">
                No encontramos prendas con esos filtros
              </h3>
              <p className="mt-1 max-w-sm text-xs text-neutral-500">
                Prueba quitando algunos filtros como corte, talla o color para ver más prendas disponibles.
              </p>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Grid de Productos */}
          {!loading && !error && productsData?.data && productsData.data.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {productsData.data.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Paginación */}
              <div className="mt-8">
                <Pagination
                  page={productsData.page}
                  limit={productsData.limit}
                  total={productsData.total}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-neutral-500">
          Cargando catálogo...
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
