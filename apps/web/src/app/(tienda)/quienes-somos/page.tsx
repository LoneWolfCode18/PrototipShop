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

export default async function QuienesSomosPage() {
  const s = await fetchSettings();
  const name = s.store_name || 'Tienda';

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-neutral-900 mb-6">
        Quiénes somos
      </h1>

      {s.about_text ? (
        <div className="prose prose-neutral max-w-none text-neutral-700 leading-relaxed">
          {s.about_text.split('\n').map((line, i) =>
            line.trim() ? (
              <p key={i} className="mb-4">{line}</p>
            ) : (
              <br key={i} />
            )
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center">
          <p className="text-sm text-neutral-500">
            Próximamente encontrarás aquí más información sobre <strong>{name}</strong>.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            (El administrador puede configurar este texto en el panel de ajustes.)
          </p>
        </div>
      )}
    </main>
  );
}
