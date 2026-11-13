'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAdminProduct } from '@/lib/adminClient';
import { ProductForm } from '@/components/admin/ProductForm';
import type { AdminProduct } from '@/lib/types';

export default function EditarProductoPage() {
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getAdminProduct(id)
      .then((p) => { setProduct(p as AdminProduct); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 w-48 rounded bg-neutral-200" />
        <div className="h-80 rounded-xl bg-neutral-200" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error ?? 'Producto no encontrado'}
      </div>
    );
  }

  return <ProductForm product={product} />;
}
