/**
 * Server Component: footer completo de la tienda pública.
 * Lee settings directamente (mismo caché que el SettingsProvider).
 */
import Link from 'next/link';
import type { StoreSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/settings';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function fetchSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch(`${API}/settings`, { next: { revalidate: 60 } });
    if (!res.ok) return DEFAULT_SETTINGS;
    return (await res.json()) as StoreSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function FooterFull() {
  const s = await fetchSettings();
  const name = s.store_name || 'Tienda';
  const hasContact = s.whatsapp_number || s.gallery_address || s.opening_hours;
  const hasSocial  = s.instagram_url || s.facebook_url || s.tiktok_url;

  const waUrl = s.whatsapp_number
    ? `https://wa.me/${s.whatsapp_number}?text=${encodeURIComponent('Hola, quisiera hacer un pedido.')}`
    : null;

  return (
    <footer className="border-t border-black/5 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* Columna 1: Marca */}
          <div className="space-y-3">
            <p className="text-base font-black text-neutral-900">{name}</p>
            {s.location_tag && (
              <p className="text-xs text-neutral-500">{s.location_tag}</p>
            )}
            {s.welcome_message && (
              <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3">
                {s.welcome_message}
              </p>
            )}
          </div>

          {/* Columna 2: Navegación */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Tienda</p>
            <ul className="space-y-2">
              {[
                { href: '/',              label: 'Inicio'         },
                { href: '/catalogo',      label: 'Catálogo'       },
                { href: '/quienes-somos', label: 'Quiénes somos'  },
                { href: '/contacto',      label: 'Contacto'       },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href}
                    className="text-sm text-neutral-600 hover:text-neutral-900 transition">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          {hasContact && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Contacto</p>
              <ul className="space-y-2 text-sm text-neutral-600">
                {waUrl && (
                  <li>
                    <a href={waUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-neutral-900 transition">
                      <span className="text-[#25D366]">●</span>
                      WhatsApp
                    </a>
                  </li>
                )}
                {s.gallery_address && (
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-neutral-400">📍</span>
                    <span>{s.gallery_address}</span>
                  </li>
                )}
                {s.opening_hours && (
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-neutral-400">🕐</span>
                    <span>{s.opening_hours}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Columna 4: Redes */}
          {hasSocial && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Síguenos</p>
              <div className="flex flex-col gap-2">
                {s.instagram_url && (
                  <a href={s.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition">
                    <InstagramIcon /> Instagram
                  </a>
                )}
                {s.facebook_url && (
                  <a href={s.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition">
                    <FacebookIcon /> Facebook
                  </a>
                )}
                {s.tiktok_url && (
                  <a href={s.tiktok_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition">
                    <TikTokIcon /> TikTok
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Línea inferior */}
        <div className="mt-8 border-t border-neutral-100 pt-6 flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} {name}. Pedidos directos por WhatsApp.
          </p>
          <p className="text-[11px] text-neutral-300">Plataforma PrototipShop</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Iconos de redes ── */
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.266h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.73a8.19 8.19 0 0 0 4.79 1.53V6.79a4.85 4.85 0 0 1-1.02-.1z"/>
    </svg>
  );
}
