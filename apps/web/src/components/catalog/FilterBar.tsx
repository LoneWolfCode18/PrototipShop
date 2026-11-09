'use client';

import type { FiltersResponse, Gender } from '@/lib/types';
import { useState } from 'react';

export interface ActiveFilters {
  gender?: Gender;
  category?: string;
  fit?: string;
  material?: string;
  color?: string;
  size?: string;
  inStock?: boolean;
  q?: string;
}

interface FilterBarProps {
  availableFilters: FiltersResponse | null;
  activeFilters: ActiveFilters;
  onFilterChange: (key: keyof ActiveFilters, value: any) => void;
  onClear: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function FilterBar({
  availableFilters,
  activeFilters,
  onFilterChange,
  onClear,
  isOpenMobile,
  onCloseMobile,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(activeFilters.q || '');

  const hasActiveFilters = Object.values(activeFilters).some(
    (v) => v !== undefined && v !== '' && v !== false
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange('q', searchInput.trim() || undefined);
  };

  const content = (
    <div className="space-y-6">
      {/* Encabezado y Limpiar */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <h2 className="text-base font-bold text-neutral-900">Filtros</h2>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchInput('');
              onClear();
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Buscador por nombre */}
      <div>
        <label htmlFor="search-q" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
          Buscar prenda
        </label>
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            id="search-q"
            type="text"
            placeholder="Ej: Polo Boxy, Tech..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
          />
          <button
            type="submit"
            className="absolute right-1.5 rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-neutral-800 transition"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Género (Pills principales) */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
          Género
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['todos', 'dama', 'caballero'] as const).map((g) => {
            const isSelected = g === 'todos' ? !activeFilters.gender : activeFilters.gender === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => onFilterChange('gender', g === 'todos' ? undefined : g)}
                className={`rounded-lg py-1.5 text-xs font-medium capitalize transition text-center ${
                  isSelected
                    ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tipo de prenda (Categorías) */}
      {availableFilters?.categories && availableFilters.categories.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            Tipo de Prenda
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableFilters.categories.map((cat) => {
              const isSelected = activeFilters.category === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onFilterChange('category', isSelected ? undefined : cat.slug)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Corte (Fits: Clásico, Oversize, Boxy Fit) */}
      {availableFilters?.fits && availableFilters.fits.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            Corte
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableFilters.fits.map((fit) => {
              const isSelected = activeFilters.fit === fit.slug;
              return (
                <button
                  key={fit.id}
                  type="button"
                  onClick={() => onFilterChange('fit', isSelected ? undefined : fit.slug)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {fit.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tallas */}
      {availableFilters?.sizes && availableFilters.sizes.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            Talla
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableFilters.sizes.map((sz) => {
              const isSelected = activeFilters.size === sz.label;
              return (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => onFilterChange('size', isSelected ? undefined : sz.label)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {sz.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colores */}
      {availableFilters?.colors && availableFilters.colors.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            Color {activeFilters.color && <span className="font-normal text-neutral-500">({activeFilters.color})</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {availableFilters.colors.map((col) => {
              const isSelected = activeFilters.color === col.name;
              return (
                <button
                  key={col.id}
                  type="button"
                  title={col.name}
                  onClick={() => onFilterChange('color', isSelected ? undefined : col.name)}
                  className={`relative h-6 w-6 rounded-full border transition active:scale-95 ${
                    isSelected
                      ? 'ring-2 ring-neutral-900 ring-offset-2'
                      : 'border-neutral-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: col.hex }}
                >
                  <span className="sr-only">{col.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Material */}
      {availableFilters?.materials && availableFilters.materials.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            Material
          </label>
          <select
            value={activeFilters.material || ''}
            onChange={(e) => onFilterChange('material', e.target.value || undefined)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-900 focus:outline-hidden"
          >
            <option value="">Todos los materiales</option>
            {availableFilters.materials.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Switch solo stock disponible */}
      <div className="pt-2 border-t border-neutral-200">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!activeFilters.inStock}
            onChange={(e) => onFilterChange('inStock', e.target.checked ? true : undefined)}
            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <span className="text-xs font-medium text-neutral-800">Solo prendas con stock</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Vista de escritorio (Barra lateral) */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          {content}
        </div>
      </aside>

      {/* Vista Móvil (Drawer / Modal) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Fondo oscuro */}
          <div
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Panel deslizante */}
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-lg font-bold text-neutral-900">Filtrar prendas</h3>
              <button
                onClick={onCloseMobile}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {content}
            <div className="mt-8 pt-4 border-t border-neutral-200">
              <button
                onClick={onCloseMobile}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-neutral-800 transition"
              >
                Ver resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
