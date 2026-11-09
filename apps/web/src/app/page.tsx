import Link from 'next/link';
import { api } from '@/lib/apiClient';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/catalog/ProductCard';

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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-neutral-900 px-6 py-12 text-white sm:px-12 sm:py-16 shadow-lg mb-10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block rounded-md bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-300 backdrop-blur-xs mb-3">
            Confección Nacional · Gamarra, Lima
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Moda Urbana & Confección al Detalle
          </h1>
          <p className="mt-3 text-sm text-neutral-300 sm:text-base">
            Polos en algodón gamuzado y Pima, poleras y conjuntos Estilo Tech. Pedidos directos a nuestro WhatsApp, por unidad y por mayor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="rounded-lg bg-white px-5 py-2.5 text-xs font-bold text-neutral-900 shadow-sm hover:bg-neutral-100 transition active:scale-95"
            >
              Explorar Catálogo
            </Link>
            <Link
              href="/catalogo?gender=caballero"
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
            >
              Caballero
            </Link>
            <Link
              href="/catalogo?gender=dama"
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
            >
              Dama
            </Link>
          </div>
        </div>
      </section>

      {/* Alerta si la API está desconectada */}
      {!apiOnline && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900">
          <p className="font-semibold">Aviso de conexión con el servidor:</p>
          <p className="mt-0.5">
            No se pudo conectar con la API local en{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded">{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}</code>.
            Levántala ejecutando <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">npm run dev:api</code>.
          </p>
        </div>
      )}

      {/* Prendas Destacadas */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Prendas Destacadas
            </h2>
            <p className="text-xs text-neutral-500">Lo más pedido de la semana</p>
          </div>
          <Link
            href="/catalogo"
            className="text-xs font-semibold text-neutral-900 hover:text-neutral-600 transition"
          >
            Ver todas →
          </Link>
        </div>

        {apiOnline && featured.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-xs text-neutral-500">
            Aún no hay prendas marcadas como destacadas en la base de datos.
            <div className="mt-3">
              <Link href="/catalogo" className="font-semibold text-neutral-900 underline">
                Ir al catálogo general
              </Link>
            </div>
          </div>
        )}

        {featured.length > 0 && (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
