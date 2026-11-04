'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/store/cart';
import { useEffect, useState } from 'react';

export function Navbar() {
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);

  // Evitar error de hidratación con el estado de persistencia de Zustand
  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItems = mounted ? count : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo / Marca */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-tight text-neutral-900 group-hover:text-neutral-700 transition">
              RKeens
            </span>
            <span className="hidden text-[10px] font-bold uppercase tracking-wider text-neutral-600 sm:inline-block bg-neutral-100 px-2 py-0.5 rounded">
              Gamarra
            </span>
          </Link>

          {/* Navegación Principal */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                pathname === '/'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              Inicio
            </Link>
            <Link
              href="/catalogo"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                pathname.startsWith('/catalogo')
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              Catálogo
            </Link>
          </nav>
        </div>

        {/* Acciones: Carrito */}
        <div className="flex items-center gap-3">
          <Link
            href="/carrito"
            className="relative flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 active:scale-95"
            aria-label={`Carrito de compras con ${totalItems} prendas`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <span className="hidden sm:inline">Pedido</span>
            {totalItems > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-neutral-900 px-1.5 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
