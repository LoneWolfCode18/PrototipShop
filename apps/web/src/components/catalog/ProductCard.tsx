'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const primaryImage = product.images?.[0]?.url;

  // Variantes y colores únicos
  const uniqueColors = Array.from(
    new Map(
      product.variants
        ?.filter((v) => v.color?.hex)
        .map((v) => [v.color!.hex, v.color!]) ?? []
    ).values()
  );

  const uniqueSizes = Array.from(
    new Set(
      product.variants
        ?.filter((v) => v.size?.label)
        .map((v) => v.size!.label) ?? []
    )
  );

  const isOnSale = product.sale_price !== null && product.sale_price < product.base_price;
  const discountPercent = isOnSale
    ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100)
    : 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-300 hover:shadow-md">
      <Link href={`/producto/${product.slug}`} className="relative flex flex-col flex-1">
        {/* Contenedor de Imagen */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
          {primaryImage && !imgError ? (
            <Image
              src={primaryImage}
              alt={product.images[0]?.alt || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover object-center transition duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-neutral-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.2}
                stroke="currentColor"
                className="h-12 w-12 text-neutral-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
              <span className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
                {product.category?.name || 'RKeens'}
              </span>
            </div>
          )}

          {/* Badges superiores */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {isOnSale && (
              <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                -{discountPercent}%
              </span>
            )}
            <span className="rounded bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
              {product.gender}
            </span>
          </div>

          {/* Badges de corte/material abajo a la derecha */}
          {(product.fit || product.material) && (
            <div className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-medium text-neutral-700 shadow-sm backdrop-blur-sm">
              {[product.fit?.name, product.material?.name].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Información de la prenda */}
        <div className="flex flex-1 flex-col p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            {product.category?.name || 'Prenda'}
          </p>
          <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold text-neutral-900 group-hover:text-neutral-700">
            {product.name}
          </h3>

          {/* Muestras de colores */}
          {uniqueColors.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {uniqueColors.slice(0, 5).map((color, idx) => (
                <span
                  key={idx}
                  title={color.name}
                  className="h-3.5 w-3.5 rounded-full border border-neutral-300 shadow-xs"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
              {uniqueColors.length > 5 && (
                <span className="text-[10px] text-neutral-500">+{uniqueColors.length - 5}</span>
              )}
            </div>
          )}

          {/* Tallas disponibles */}
          {uniqueSizes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-neutral-500">
              <span className="text-neutral-400">Tallas:</span>
              <span>{uniqueSizes.join(', ')}</span>
            </div>
          )}

          {/* Precios */}
          <div className="mt-auto pt-3 flex items-baseline gap-2">
            <span className="text-base font-bold text-neutral-900">
              S/ {product.final_price.toFixed(2)}
            </span>
            {isOnSale && (
              <span className="text-xs text-neutral-400 line-through">
                S/ {product.base_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
