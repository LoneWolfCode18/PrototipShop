'use client';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between border-t border-neutral-200 px-2 py-4 sm:px-0" aria-label="Paginación de productos">
      <div className="hidden sm:block">
        <p className="text-xs text-neutral-600">
          Mostrando página <span className="font-semibold text-neutral-900">{page}</span> de{' '}
          <span className="font-semibold text-neutral-900">{totalPages}</span> ({total} prendas)
        </p>
      </div>
      <div className="flex flex-1 justify-between sm:justify-end gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 shadow-xs hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition"
        >
          Anterior
        </button>
        <span className="flex items-center text-xs font-medium text-neutral-600 sm:hidden">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 shadow-xs hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
