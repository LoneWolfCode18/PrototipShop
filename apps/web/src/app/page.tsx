import { api } from '@/lib/apiClient';
import type { Product } from '@/lib/types';

export default async function Home() {
  let featured: Product[] = [];
  let apiOnline = true;

  try {
    const res = await api<{ data: Product[] }>('/products/featured');
    featured = res.data;
  } catch {
    apiOnline = false; // La API aún no está levantada o falta configurar Supabase.
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">RKeens</h1>
        <p className="mt-1 text-neutral-600">Dama · Caballero — pedidos por WhatsApp</p>
      </header>

      {!apiOnline && (
        <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          No se pudo conectar con la API. Revisa que esté corriendo en{' '}
          <code>{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}</code>.
        </p>
      )}

      {apiOnline && featured.length === 0 && (
        <p className="text-neutral-600">
          Aún no hay prendas destacadas. Carga productos en Supabase y márcalos como destacados.
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {featured.map((p) => (
          <article key={p.id} className="rounded-lg border border-neutral-200 p-3">
            <div className="aspect-square rounded bg-neutral-100" />
            <h2 className="mt-2 text-sm font-medium">{p.name}</h2>
            <p className="text-sm text-neutral-600">S/ {p.final_price.toFixed(2)}</p>
          </article>
        ))}
      </section>

      {/* TODO: catálogo con filtros (/catalogo), ficha (/producto/[slug]), carrito (/carrito) */}
    </main>
  );
}
