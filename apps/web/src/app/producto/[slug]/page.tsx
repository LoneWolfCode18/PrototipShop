'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProduct, ApiError } from '@/lib/apiClient';
import { useCart } from '@/store/cart';
import type { ProductDetail, Variant, PriceTier } from '@/lib/types';

/* ─── helpers ───────────────────────────────────────────────────── */
const money = (n: number) => `S/ ${n.toFixed(2)}`;

function PlaceholderImage({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-100 text-neutral-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.2}
        stroke="currentColor"
        className="h-16 w-16 text-neutral-300"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
      <span className="mt-2 text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ─── componente principal ───────────────────────────────────────── */
export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // Selecciones del usuario
  const [selectedColorHex, setSelectedColorHex] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  // Feedback de agregar al carrito
  const [added, setAdded] = useState(false);

  const addToCart = useCart((s) => s.add);

  /* ── cargar producto ── */
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getProduct(slug)
      .then((p) => {
        setProduct(p);
        setLoading(false);
        // Pre-seleccionar el primer color y talla disponibles
        const firstColor = p.variants.find((v) => v.color?.hex)?.color?.hex ?? null;
        setSelectedColorHex(firstColor);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        }
        setLoading(false);
      });
  }, [slug]);

  /* ── resetear talla cuando cambia color ── */
  useEffect(() => {
    setSelectedSize(null);
    setQty(1);
  }, [selectedColorHex]);

  /* ── resetear qty si excede el stock ── */
  const selectedVariant: Variant | undefined = product?.variants.find(
    (v) =>
      v.color?.hex === selectedColorHex &&
      v.size?.label === selectedSize,
  );

  useEffect(() => {
    if (selectedVariant && qty > selectedVariant.stock) {
      setQty(Math.max(1, selectedVariant.stock));
    }
  }, [selectedVariant, qty]);

  /* ── listas únicas de colores y tallas ── */
  const uniqueColors = product
    ? Array.from(
        new Map(
          product.variants
            .filter((v) => v.color?.hex)
            .map((v) => [v.color!.hex, v.color!]),
        ).values(),
      )
    : [];

  const sizesForColor: string[] = product
    ? product.variants
        .filter((v) => v.color?.hex === selectedColorHex && v.size?.label)
        .map((v) => v.size!.label)
    : [];

  const hasStockForCombo = (colorHex: string, sizeLabel: string) => {
    const v = product?.variants.find(
      (v) => v.color?.hex === colorHex && v.size?.label === sizeLabel,
    );
    return (v?.stock ?? 0) > 0;
  };

  /* ── agregar al carrito ── */
  const handleAddToCart = useCallback(() => {
    if (!product || !selectedVariant) return;
    const unitPrice = selectedVariant.price_override ?? product.final_price;
    addToCart(
      {
        variantId: selectedVariant.id,
        productName: product.name,
        size: selectedSize ?? '',
        color: selectedVariant.color?.name ?? '',
        unitPrice,
        image: product.images?.[0]?.url,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }, [product, selectedVariant, selectedSize, qty, addToCart]);

  /* ══════════════════════════════════════════════════════════════ */
  /*                         RENDER STATES                          */
  /* ══════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="animate-pulse grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-neutral-200 w-full" />
          <div className="space-y-4 py-4">
            <div className="h-3 w-24 rounded bg-neutral-200" />
            <div className="h-7 w-3/4 rounded bg-neutral-200" />
            <div className="h-5 w-32 rounded bg-neutral-200" />
            <div className="mt-6 h-10 w-1/2 rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-neutral-900">Prenda no encontrada</h1>
        <p className="mt-2 text-sm text-neutral-500">
          No existe ninguna prenda con ese enlace o ya no está disponible.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  /* ── datos del producto ── */
  const isOnSale = product.sale_price !== null && product.sale_price < product.base_price;
  const discountPct = isOnSale
    ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100)
    : 0;

  const images = product.images ?? [];
  const currentImg = images[activeImg];
  const unitPrice = selectedVariant?.price_override ?? product.final_price;

  const canAdd =
    selectedColorHex !== null &&
    selectedSize !== null &&
    selectedVariant !== undefined &&
    selectedVariant.stock > 0;

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-neutral-500">
        <Link href="/" className="hover:text-neutral-800 transition">Inicio</Link>
        <span>/</span>
        <Link href="/catalogo" className="hover:text-neutral-800 transition">Catálogo</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/catalogo?category=${product.category.slug}`}
              className="hover:text-neutral-800 transition capitalize"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-neutral-700 font-medium line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
        {/* ── GALERÍA ── */}
        <div className="flex flex-col gap-3">
          {/* Imagen principal */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
            {currentImg && !imgError[activeImg] ? (
              <Image
                src={currentImg.url}
                alt={currentImg.alt ?? product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center"
                priority
                onError={() => setImgError((e) => ({ ...e, [activeImg]: true }))}
              />
            ) : (
              <PlaceholderImage label={product.category?.name ?? 'RKeens'} />
            )}

            {/* Badge oferta */}
            {isOnSale && (
              <span className="absolute top-3 left-3 rounded bg-rose-600 px-2 py-1 text-xs font-bold uppercase text-white shadow">
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Miniaturas */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === activeImg
                      ? 'border-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  {img && !imgError[i] ? (
                    <Image
                      src={img.url}
                      alt={img.alt ?? `Imagen ${i + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                      onError={() => setImgError((e) => ({ ...e, [i]: true }))}
                    />
                  ) : (
                    <div className="h-full w-full bg-neutral-200" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── INFO + SELECTOR ── */}
        <div className="flex flex-col gap-5">
          {/* Categoría y género */}
          <div className="flex flex-wrap items-center gap-2">
            {product.category && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 capitalize">
                {product.category.name}
              </span>
            )}
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 capitalize">
              {product.gender}
            </span>
            {product.fit && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                {product.fit.name}
              </span>
            )}
            {product.material && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                {product.material.name}
              </span>
            )}
          </div>

          {/* Nombre */}
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl leading-tight">
            {product.name}
          </h1>

          {/* Precio */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-neutral-900">{money(unitPrice)}</span>
            {isOnSale && (
              <span className="text-base text-neutral-400 line-through">{money(product.base_price)}</span>
            )}
          </div>

          {/* Descripción */}
          {product.description && (
            <p className="text-sm text-neutral-600 leading-relaxed">{product.description}</p>
          )}

          {/* ── SELECTOR DE COLOR ── */}
          {uniqueColors.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Color
                {selectedColorHex && (
                  <span className="ml-2 font-normal normal-case text-neutral-500">
                    — {uniqueColors.find((c) => c.hex === selectedColorHex)?.name}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {uniqueColors.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    title={color.name}
                    onClick={() => setSelectedColorHex(color.hex)}
                    className={`h-8 w-8 rounded-full border-2 transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1 ${
                      selectedColorHex === color.hex
                        ? 'border-neutral-900 scale-110 shadow-md'
                        : 'border-neutral-300 hover:border-neutral-500 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={`Color ${color.name}`}
                    aria-pressed={selectedColorHex === color.hex}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── SELECTOR DE TALLA ── */}
          {sizesForColor.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">Talla</p>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((label) => {
                  const inStock = hasStockForCombo(selectedColorHex!, label);
                  const isSelected = selectedSize === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={!inStock}
                      onClick={() => { setSelectedSize(label); setQty(1); }}
                      className={`min-w-[2.75rem] rounded-lg border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1 ${
                        !inStock
                          ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-300 line-through'
                          : isSelected
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500'
                      }`}
                      aria-label={`Talla ${label}${!inStock ? ', sin stock' : ''}`}
                      aria-pressed={isSelected}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock bajo */}
          {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3 && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ Últimas {selectedVariant.stock} unidades
            </p>
          )}

          {/* ── CANTIDAD + BOTÓN ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Cantidad */}
            <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="px-3.5 py-2.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 transition text-lg leading-none"
                aria-label="Reducir cantidad"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-bold text-neutral-900">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(selectedVariant?.stock ?? 1, q + 1))}
                disabled={!selectedVariant || qty >= selectedVariant.stock}
                className="px-3.5 py-2.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 transition text-lg leading-none"
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>

            {/* Botón agregar */}
            <button
              type="button"
              disabled={!canAdd}
              onClick={handleAddToCart}
              className={`flex-1 rounded-lg px-5 py-3 text-sm font-bold transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1 ${
                added
                  ? 'bg-green-600 text-white'
                  : canAdd
                  ? 'bg-neutral-900 text-white hover:bg-neutral-700 shadow'
                  : 'cursor-not-allowed bg-neutral-200 text-neutral-400'
              }`}
            >
              {added
                ? '✓ Agregado al pedido'
                : !selectedColorHex
                ? 'Selecciona un color'
                : !selectedSize
                ? 'Selecciona una talla'
                : selectedVariant?.stock === 0
                ? 'Sin stock'
                : 'Agregar al pedido'}
            </button>
          </div>

          {/* Link rápido al carrito cuando se agrega */}
          {added && (
            <Link
              href="/carrito"
              className="text-center text-xs font-semibold text-neutral-900 underline hover:no-underline transition"
            >
              Ver pedido →
            </Link>
          )}

          {/* ── PRECIO POR MAYOR ── */}
          {product.price_tiers && product.price_tiers.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-700">
                Precio por mayor
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-500">
                    <th className="pb-1.5 text-left font-medium">Desde</th>
                    <th className="pb-1.5 text-right font-medium">Precio unitario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {product.price_tiers.map((tier: PriceTier) => (
                    <tr key={tier.min_qty}>
                      <td className="py-1.5 text-neutral-700">{tier.min_qty} unidades</td>
                      <td className="py-1.5 text-right font-semibold text-neutral-900">
                        {money(tier.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-neutral-500">
                * El precio final por mayor lo confirma nuestro equipo al revisar tu pedido.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
