'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/lib/settings';

const NAV_LINKS = [
  { href: '/',              label: 'Inicio',         exact: true  },
  { href: '/catalogo',      label: 'Catálogo',       exact: false },
  { href: '/quienes-somos', label: 'Quiénes somos',  exact: false },
  { href: '/contacto',      label: 'Contacto',       exact: false },
];

export function Navbar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const count     = useCart((s) => s.count());
  const settings  = useSettings();
  const [mounted,       setMounted]       = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  // Cerrar menú al navegar
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  const totalItems = mounted ? count : 0;
  const storeName  = settings.store_name || 'Tienda';

  const isActive = (link: typeof NAV_LINKS[0]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/catalogo?q=${encodeURIComponent(q)}`);
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/5 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">

        {/* ── Logo / Nombre ── */}
        <Link href="/" className="flex shrink-0 items-center gap-2 group">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_url}
              alt={storeName}
              className="h-9 w-auto max-w-[140px] object-contain transition group-hover:opacity-80"
            />
          ) : (
            <span className="text-xl font-black tracking-tight text-neutral-900 transition group-hover:opacity-70">
              {storeName}
            </span>
          )}
          {settings.location_tag && (
            <span className="hidden rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 sm:inline-block">
              {settings.location_tag}
            </span>
          )}
        </Link>

        {/* ── Nav desktop ── */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                isActive(link) ? 'nav-active' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Acciones derechas ── */}
        <div className="flex items-center gap-2">

          {/* Buscador expandible (desktop) */}
          <div className="hidden sm:flex items-center">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-1">
                <input
                  ref={searchRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar prendas…"
                  className="w-44 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition"
                />
                <button type="submit" aria-label="Buscar"
                  className="rounded-full p-1.5 text-neutral-500 hover:text-neutral-900 transition">
                  <SearchIcon />
                </button>
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda"
                  className="rounded-full p-1.5 text-neutral-400 hover:text-neutral-700 transition">
                  <CloseIcon />
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Buscar"
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition">
                <SearchIcon />
              </button>
            )}
          </div>

          {/* Botón carrito */}
          <Link
            href="/carrito"
            aria-label={`Carrito con ${totalItems} ${totalItems === 1 ? 'prenda' : 'prendas'}`}
            className="btn-primary relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition active:scale-95"
          >
            <BagIcon />
            <span className="hidden sm:inline">Pedido</span>
            {totalItems > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/25 px-1 text-xs font-bold">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Hamburguesa móvil */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 transition lg:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* ── Menú móvil ── */}
      {menuOpen && (
        <div className="lg:hidden border-t border-neutral-100 bg-white px-4 pb-4 pt-3 shadow-md">
          <nav className="flex flex-col gap-1 mb-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive(link) ? 'nav-active' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Buscador en móvil */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar prendas…"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button type="submit"
              className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold transition">
              Buscar
            </button>
          </form>
        </div>
      )}
    </header>
  );
}

/* ── Iconos SVG inline pequeños ── */
function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5">
      <line x1="4" x2="20" y1="6"  y2="6"  />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="h-4 w-4">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" x2="21" y1="6" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
