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

export default async function ContactoPage() {
  const s = await fetchSettings();

  const waUrl = s.whatsapp_number
    ? `https://wa.me/${s.whatsapp_number}?text=${encodeURIComponent('Hola, quisiera hacer un pedido.')}`
    : null;

  const hasSocial = s.instagram_url || s.facebook_url || s.tiktok_url;

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-neutral-900 mb-8">Contacto</h1>

      <div className="space-y-6">
        {/* WhatsApp */}
        {waUrl && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex items-start gap-4">
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-semibold text-neutral-900 mb-1">WhatsApp</p>
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="inline-block btn-primary rounded-lg px-4 py-2 text-sm font-semibold transition">
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Dirección */}
        {s.gallery_address && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex items-start gap-4">
            <span className="text-2xl">📍</span>
            <div>
              <p className="font-semibold text-neutral-900 mb-1">Ubicación</p>
              <p className="text-sm text-neutral-600">{s.gallery_address}</p>
            </div>
          </div>
        )}

        {/* Horario */}
        {s.opening_hours && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex items-start gap-4">
            <span className="text-2xl">🕐</span>
            <div>
              <p className="font-semibold text-neutral-900 mb-1">Horario</p>
              <p className="text-sm text-neutral-600">{s.opening_hours}</p>
            </div>
          </div>
        )}

        {/* Redes */}
        {hasSocial && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="font-semibold text-neutral-900 mb-3">Redes sociales</p>
            <div className="flex flex-wrap gap-3">
              {s.instagram_url && (
                <a href={s.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 transition">
                  Instagram
                </a>
              )}
              {s.facebook_url && (
                <a href={s.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 transition">
                  Facebook
                </a>
              )}
              {s.tiktok_url && (
                <a href={s.tiktok_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 transition">
                  TikTok
                </a>
              )}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {!waUrl && !s.gallery_address && !s.opening_hours && !hasSocial && (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center">
            <p className="text-sm text-neutral-500">
              La información de contacto aún no está configurada.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
