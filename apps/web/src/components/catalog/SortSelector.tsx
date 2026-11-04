'use client';

interface SortSelectorProps {
  value: string;
  onChange: (value: 'newest' | 'price_asc' | 'price_desc') => void;
}

export function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-xs font-medium text-neutral-500 whitespace-nowrap">
        Ordenar por:
      </label>
      <select
        id="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as any)}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-xs focus:border-neutral-900 focus:outline-hidden"
      >
        <option value="newest">Más recientes</option>
        <option value="price_asc">Menor precio</option>
        <option value="price_desc">Mayor precio</option>
      </select>
    </div>
  );
}
