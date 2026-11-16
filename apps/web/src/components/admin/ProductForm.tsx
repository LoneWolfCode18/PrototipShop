'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProduct,
  createVariant,
  deleteImage,
  deleteVariant,
  addImage,
  getCatalogs,
  setPriceTiers,
  updateProduct,
  updateVariant,
} from '@/lib/adminClient';
import { ApiError } from '@/lib/apiClient';
import type { AdminCatalogs, AdminProduct, AdminVariant, PriceTier } from '@/lib/types';

interface ProductFormProps {
  product?: AdminProduct; // si viene, es edición; si no, es creación
}

type FormData = {
  name: string;
  slug: string;
  description: string;
  gender: 'dama' | 'caballero' | 'unisex';
  category_id: string;
  fit_id: string;
  material_id: string;
  base_price: string;
  sale_price: string;
  is_featured: boolean;
  is_active: boolean;
};

const emptyForm: FormData = {
  name: '',
  slug: '',
  description: '',
  gender: 'unisex',
  category_id: '',
  fit_id: '',
  material_id: '',
  base_price: '',
  sale_price: '',
  is_featured: false,
  is_active: true,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!product;

  const [catalogs, setCatalogs] = useState<AdminCatalogs | null>(null);
  const [form, setForm] = useState<FormData>(
    product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description ?? '',
          gender: product.gender,
          category_id: String(product.category?.id ?? ''),
          fit_id: String(product.fit?.id ?? ''),
          material_id: String(product.material?.id ?? ''),
          base_price: String(product.base_price),
          sale_price: product.sale_price !== null ? String(product.sale_price) : '',
          is_featured: product.is_featured,
          is_active: product.is_active,
        }
      : emptyForm,
  );

  const [tiers, setTiers] = useState<PriceTier[]>(product?.price_tiers ?? []);
  const [variants, setVariants] = useState<AdminVariant[]>(product?.variants ?? []);
  const [images, setImages] = useState(product?.images ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado de formulario de nueva variante
  const [newVariant, setNewVariant] = useState({
    size_id: '',
    color_id: '',
    sku: '',
    stock: '0',
    price_override: '',
  });
  const [addingVariant, setAddingVariant] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);

  // Estado nueva imagen
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [addingImage, setAddingImage] = useState(false);

  /* ── Cargar catálogos ── */
  useEffect(() => {
    getCatalogs().then(setCatalogs).catch(() => null);
  }, []);

  /* ── Auto-slug al escribir el nombre (solo en creación) ── */
  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      ...(!isEditing && f.slug === slugify(f.name) ? { slug: slugify(name) } : {}),
    }));
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /* ── Guardar datos base ── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || undefined,
      gender: form.gender,
      category_id: form.category_id ? Number(form.category_id) : undefined,
      fit_id: form.fit_id ? Number(form.fit_id) : undefined,
      material_id: form.material_id ? Number(form.material_id) : undefined,
      base_price: parseFloat(form.base_price),
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      is_featured: form.is_featured,
      is_active: form.is_active,
    };

    try {
      if (isEditing) {
        await updateProduct(product.id, payload);
        // Guardar tiers al mismo tiempo
        await setPriceTiers(
          product.id,
          tiers.map(({ min_qty, unit_price }) => ({ min_qty, unit_price })),
        );
        setSuccess('Prenda actualizada correctamente.');
      } else {
        const result = await createProduct(payload);
        router.replace(`/admin/productos/${result.id}/editar`);
        return;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  /* ── Variantes ── */
  const handleAddVariant = async () => {
    setVariantError(null);
    if (!newVariant.size_id || !newVariant.color_id || !newVariant.sku.trim()) {
      setVariantError('Talla, color y SKU son obligatorios.');
      return;
    }
    if (!product) return;
    setAddingVariant(true);
    try {
      await createVariant(product.id, {
        size_id: Number(newVariant.size_id),
        color_id: Number(newVariant.color_id),
        sku: newVariant.sku.trim(),
        stock: parseInt(newVariant.stock, 10) || 0,
        price_override: newVariant.price_override ? parseFloat(newVariant.price_override) : null,
      });
      // Recargar variantes
      const updated = await import('@/lib/adminClient').then((m) => m.getAdminProduct(product.id));
      setVariants(updated.variants);
      setNewVariant({ size_id: '', color_id: '', sku: '', stock: '0', price_override: '' });
    } catch (err) {
      setVariantError(err instanceof ApiError ? err.message : 'Error al agregar variante');
    } finally {
      setAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('¿Eliminar esta variante?')) return;
    try {
      await deleteVariant(variantId);
      setVariants((v) => v.filter((x) => x.id !== variantId));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error');
    }
  };

  /* ── Imágenes ── */
  const handleAddImage = async () => {
    if (!newImageUrl.trim() || !product) return;
    setAddingImage(true);
    try {
      await addImage(product.id, { url: newImageUrl.trim(), alt: newImageAlt.trim() || undefined });
      const updated = await import('@/lib/adminClient').then((m) => m.getAdminProduct(product.id));
      setImages(updated.images);
      setNewImageUrl('');
      setNewImageAlt('');
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al agregar imagen');
    } finally {
      setAddingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('¿Quitar esta imagen?')) return;
    try {
      await deleteImage(imageId);
      setImages((imgs) => imgs.filter((i) => i.id !== imageId));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error');
    }
  };

  /* ── Tiers ── */
  const addTier = () => setTiers((t) => [...t, { min_qty: 6, unit_price: 0 }]);
  const removeTier = (i: number) => setTiers((t) => t.filter((_, idx) => idx !== i));
  const updateTier = (i: number, key: keyof PriceTier, val: number) =>
    setTiers((t) => t.map((tier, idx) => (idx === i ? { ...tier, [key]: val } : tier)));

  /* ══════════════════════════════════════════════════════════════ */

  const inputCls =
    'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition';
  const labelCls = 'block text-xs font-semibold text-neutral-700 mb-1';

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-neutral-500 hover:text-neutral-800 transition"
        >
          ← Volver
        </button>
        <h1 className="text-xl font-black text-neutral-900">
          {isEditing ? `Editar: ${product.name}` : 'Nueva prenda'}
        </h1>
      </div>

      {/* ── Formulario datos base ── */}
      <form onSubmit={handleSave} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-5">
        <h2 className="text-sm font-bold text-neutral-900">Datos generales</h2>

        {/* Nombre + Slug */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Nombre <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Polo Boxy Fit Ola"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Slug (URL) <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setField('slug', e.target.value)}
              required
              placeholder="polo-boxy-fit-ola"
              className={inputCls}
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className={labelCls}>Descripción</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Detalles del producto..."
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Género + Categoría */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Género <span className="text-rose-500">*</span></label>
            <select
              value={form.gender}
              onChange={(e) => setField('gender', e.target.value as FormData['gender'])}
              required
              className={inputCls}
            >
              <option value="dama">Dama</option>
              <option value="caballero">Caballero</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Categoría <span className="text-rose-500">*</span></label>
            <select
              value={form.category_id}
              onChange={(e) => setField('category_id', e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Seleccionar…</option>
              {catalogs?.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Corte</label>
            <select
              value={form.fit_id}
              onChange={(e) => setField('fit_id', e.target.value)}
              className={inputCls}
            >
              <option value="">Sin especificar</option>
              {catalogs?.fits.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Material + Precios */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Material</label>
            <select
              value={form.material_id}
              onChange={(e) => setField('material_id', e.target.value)}
              className={inputCls}
            >
              <option value="">Sin especificar</option>
              {catalogs?.materials.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Precio base (S/) <span className="text-rose-500">*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.base_price}
              onChange={(e) => setField('base_price', e.target.value)}
              required
              placeholder="45.00"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Precio oferta (S/)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.sale_price}
              onChange={(e) => setField('sale_price', e.target.value)}
              placeholder="Dejar vacío si no hay oferta"
              className={inputCls}
            />
          </div>
        </div>

        {/* Flags */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setField('is_featured', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
            />
            Destacado en home
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
            />
            Activo (visible en catálogo)
          </label>
        </div>

        {/* Precio por mayor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls + ' mb-0'}>Precio por mayor</label>
            <button type="button" onClick={addTier} className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition">
              + Agregar escala
            </button>
          </div>
          {tiers.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin escalas de precio por mayor.</p>
          ) : (
            <div className="space-y-2">
              {tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-neutral-500">Desde (uds.)</span>
                      <input
                        type="number"
                        min="2"
                        value={tier.min_qty}
                        onChange={(e) => updateTier(i, 'min_qty', parseInt(e.target.value, 10))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-500">Precio unit. (S/)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.unit_price}
                        onChange={(e) => updateTier(i, 'unit_price', parseFloat(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTier(i)}
                    className="mt-4 text-xs text-rose-500 hover:text-rose-700 transition flex-shrink-0"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error / éxito */}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">{success}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition"
        >
          {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear prenda'}
        </button>
      </form>

      {/* ── Variantes (solo en edición) ── */}
      {isEditing && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900">Variantes (talla + color + stock)</h2>

          {/* Lista de variantes */}
          {variants.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin variantes aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                    <th className="pb-2 text-left font-medium">SKU</th>
                    <th className="pb-2 text-left font-medium">Talla</th>
                    <th className="pb-2 text-left font-medium">Color</th>
                    <th className="pb-2 text-right font-medium">Stock</th>
                    <th className="pb-2 text-right font-medium">P. override</th>
                    <th className="pb-2 text-center font-medium">Estado</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {variants.map((v) => (
                    <VariantRow
                      key={v.id}
                      variant={v}
                      productId={product.id}
                      onDelete={handleDeleteVariant}
                      onUpdated={(updated) =>
                        setVariants((vs) => vs.map((x) => (x.id === updated.id ? updated : x)))
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Agregar variante */}
          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold text-neutral-700 mb-3">Agregar variante</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <select
                value={newVariant.size_id}
                onChange={(e) => setNewVariant((v) => ({ ...v, size_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Talla…</option>
                {catalogs?.sizes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select
                value={newVariant.color_id}
                onChange={(e) => setNewVariant((v) => ({ ...v, color_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Color…</option>
                {catalogs?.colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="text"
                value={newVariant.sku}
                onChange={(e) => setNewVariant((v) => ({ ...v, sku: e.target.value }))}
                placeholder="SKU"
                className={inputCls}
              />
              <input
                type="number"
                min="0"
                value={newVariant.stock}
                onChange={(e) => setNewVariant((v) => ({ ...v, stock: e.target.value }))}
                placeholder="Stock"
                className={inputCls}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={newVariant.price_override}
                onChange={(e) => setNewVariant((v) => ({ ...v, price_override: e.target.value }))}
                placeholder="Override S/ (opc.)"
                className={inputCls}
              />
            </div>
            {variantError && (
              <p className="mt-2 text-xs text-rose-600">{variantError}</p>
            )}
            <button
              type="button"
              disabled={addingVariant}
              onClick={handleAddVariant}
              className="mt-3 rounded-lg border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition"
            >
              {addingVariant ? 'Agregando…' : '+ Agregar variante'}
            </button>
          </div>
        </div>
      )}

      {/* ── Imágenes (solo en edición) ── */}
      {isEditing && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900">Imágenes (URL)</h2>
          {images.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin imágenes aún.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt ?? ''}
                    className="h-20 w-16 rounded-lg object-cover border border-neutral-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white text-xs shadow"
                    aria-label="Quitar imagen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://... (URL de la imagen)"
              className={`${inputCls} flex-1`}
            />
            <input
              type="text"
              value={newImageAlt}
              onChange={(e) => setNewImageAlt(e.target.value)}
              placeholder="Descripción (opcional)"
              className={`${inputCls} w-40`}
            />
            <button
              type="button"
              disabled={!newImageUrl.trim() || addingImage}
              onClick={handleAddImage}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition flex-shrink-0"
            >
              {addingImage ? '…' : 'Agregar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-componente fila de variante editable inline ── */
function VariantRow({
  variant,
  onDelete,
  onUpdated,
}: {
  variant: AdminVariant;
  productId: string;
  onDelete: (id: string) => void;
  onUpdated: (updated: AdminVariant) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [stock, setStock] = useState(String(variant.stock));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateVariant(variant.id, { stock: parseInt(stock, 10) });
      onUpdated({ ...variant, stock: parseInt(stock, 10) });
      setEditing(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="py-2 pr-3 font-mono text-xs text-neutral-600">{variant.sku}</td>
      <td className="py-2 pr-3">{variant.size?.label ?? '—'}</td>
      <td className="py-2 pr-3">
        <span className="flex items-center gap-1.5">
          {variant.color?.hex && (
            <span
              className="h-3 w-3 rounded-full border border-neutral-300 inline-block"
              style={{ backgroundColor: variant.color.hex }}
            />
          )}
          {variant.color?.name ?? '—'}
        </span>
      </td>
      <td className="py-2 pr-3 text-right">
        {editing ? (
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-16 rounded border border-neutral-200 px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        ) : (
          <span className={variant.stock <= 3 ? 'text-rose-600 font-bold' : ''}>{variant.stock}</span>
        )}
      </td>
      <td className="py-2 pr-3 text-right text-neutral-500">
        {variant.price_override !== null ? `S/ ${variant.price_override.toFixed(2)}` : '—'}
      </td>
      <td className="py-2 pr-3 text-center">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${variant.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
          {variant.is_active ? 'Activa' : 'Inactiva'}
        </span>
      </td>
      <td className="py-2 text-right">
        {editing ? (
          <div className="flex items-center gap-1 justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="text-xs font-semibold text-green-700 hover:text-green-900 transition"
            >
              {saving ? '…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setStock(String(variant.stock)); }}
              className="text-xs text-neutral-400 hover:text-neutral-700 transition"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-neutral-500 hover:text-neutral-800 transition"
            >
              Editar stock
            </button>
            <button
              type="button"
              onClick={() => onDelete(variant.id)}
              className="text-xs text-rose-400 hover:text-rose-700 transition"
            >
              ×
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
