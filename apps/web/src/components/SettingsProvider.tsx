/**
 * Server Component: obtiene store_settings desde la API y los inyecta
 * en el contexto React para todos los Client Components hijos.
 *
 * Se monta una vez en cada layout raíz.  Next.js cachea el fetch por
 * ruta gracias a revalidate = 60s.
 */
import type { StoreSettings } from '@/lib/types';
import { DEFAULT_SETTINGS, SettingsContext } from '@/lib/settings';
import { SettingsClientProvider } from './SettingsClientProvider';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function fetchSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch(`${API}/settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_SETTINGS;
    return (await res.json()) as StoreSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await fetchSettings();
  return (
    <SettingsClientProvider settings={settings}>
      {children}
    </SettingsClientProvider>
  );
}
