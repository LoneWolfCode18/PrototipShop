/**
 * Server Component: lee settings y renderiza el footer.
 * No necesita 'use client' — se renderiza en servidor.
 */
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

export async function FooterServer() {
  const s = await fetchSettings();
  const name     = s.store_name    || 'Tienda';
  const location = s.location_tag  ? ` · ${s.location_tag}` : '';
  const address  = s.gallery_address ? ` · ${s.gallery_address}` : '';

  return (
    <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
      <p>
        © {new Date().getFullYear()} {name}{location}{address}
        {' · '}Pedidos sin pasarela vía WhatsApp
      </p>
    </footer>
  );
}
