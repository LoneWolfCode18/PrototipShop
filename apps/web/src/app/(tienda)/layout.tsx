import type { StoreSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { Navbar } from '@/components/Navbar';
import { FooterFull } from '@/components/FooterFull';
import { WhatsAppFab } from '@/components/WhatsAppFab';

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

/** Convierte #RRGGBB a "R G B" para usar en rgba() en CSS */
function hexToRgbParts(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '17 17 17';
  return `${r} ${g} ${b}`;
}

export default async function TiendaLayout({ children }: { children: React.ReactNode }) {
  const s = await fetchSettings();
  const primary = s.primary_color ?? '#111111';
  const rgb = hexToRgbParts(primary);

  // Variables CSS inyectadas en el div raíz de la tienda.
  // --color-primary      → hex completo (#RRGGBB)
  // --color-primary-rgb  → partes R G B (para rgba())
  // --color-primary-10   → tono muy claro para el fondo degradado
  const cssVars = {
    '--color-primary':     primary,
    '--color-primary-rgb': rgb,
  } as React.CSSProperties;

  return (
    <div style={cssVars} className="tienda-root flex min-h-screen flex-col bg-primary-tint">
      <Navbar />
      <div className="flex-1">{children}</div>
      <FooterFull />
      <WhatsAppFab />
    </div>
  );
}
