'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { validateCart, createOrder, ApiError } from '@/lib/apiClient';
import type { CreateOrderPayload } from '@/lib/types';

/* ─── helpers ─────────────────────────────────────────────────── */
const money = (n: number) => `S/ ${n.toFixed(2)}`;

type DeliveryOption = 'pickup' | 'delivery';

type FormData = {
  name: string;
  phone: string;
  delivery: DeliveryOption;
  address: string;
  note: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio.';
  if (form.delivery === 'delivery' && !form.address.trim()) {
    errors.address = 'La dirección es obligatoria para envío.';
  }
  return errors;
}

/* ─── componente ─────────────────────────────────────────────── */
export default function CarritoPage() {
  // Patrón mounted para evitar error de hidratación con Zustand + localStorage
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { items, setQty, remove, clear, total } = useCart();

  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    delivery: 'pickup',
    address: '',
    note: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  /* ── handlers de formulario ── */
  const handleField = (key: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  /* ── enviar pedido ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Validar carrito contra la API
      await validateCart(items.map((i) => ({ variantId: i.variantId, qty: i.qty })));

      // 2. Crear pedido
      const payload: CreateOrderPayload = {
        origin: 'online',
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          note: form.note.trim() || undefined,
        },
        delivery: form.delivery,
        address: form.delivery === 'delivery' ? form.address.trim() : undefined,
        items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      };

      const result = await createOrder(payload);

      // 3. Éxito: vaciar carrito y redirigir a WhatsApp
      clear();
      setOrderCode(result.code);
      setWhatsappUrl(result.whatsappUrl);
      window.location.href = result.whatsappUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 501) {
        setSubmitError('El envío de pedidos aún no está disponible. Por favor, contáctanos directamente por WhatsApp.');
      } else if (err instanceof Error) {
        setSubmitError(err.message || 'Ocurrió un error al procesar el pedido. Inténtalo de nuevo.');
      } else {
        setSubmitError('Ocurrió un error inesperado.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── pantalla de espera de montaje ── */
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-32 rounded bg-neutral-200" />
          <div className="h-32 rounded-xl bg-neutral-200" />
          <div className="h-32 rounded-xl bg-neutral-200" />
        </div>
      </div>
    );
  }

  /* ── pantalla post-envío ── */
  if (whatsappUrl && orderCode) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-neutral-900">¡Pedido enviado!</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Código: <span className="font-bold">{orderCode}</span>
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Si tu navegador bloqueó la apertura de WhatsApp, usa el botón de abajo.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-500 transition"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.552 4.093 1.517 5.812L.057 23.886a.5.5 0 00.609.609l6.074-1.46A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.916 0-3.714-.518-5.254-1.42l-.376-.22-3.898.938.956-3.818-.243-.389A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Abrir WhatsApp
        </a>
        <div className="mt-4">
          <Link href="/catalogo" className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition underline">
            Seguir explorando el catálogo
          </Link>
        </div>
      </div>
    );
  }

  /* ── carrito vacío ── */
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-neutral-900">Tu pedido está vacío</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Explora el catálogo y agrega prendas a tu pedido.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition"
        >
          Explorar catálogo
        </Link>
      </div>
    );
  }

  /* ── carrito con productos ── */
  const totalValue = total();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
        Tu pedido
      </h1>

      {/* Aviso de precios */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <span className="font-semibold">ℹ El precio final y el stock se confirman al enviar el pedido.</span>{' '}
        Los precios mostrados son referenciales y pueden variar según disponibilidad.
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Lista de productos ── */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {items.map((item, idx) => (
              <div
                key={item.variantId}
                className={`flex gap-4 p-4 ${idx > 0 ? 'border-t border-neutral-100' : ''}`}
              >
                {/* Imagen miniatura */}
                <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-neutral-200" />
                  )}
                </div>

                {/* Datos */}
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 leading-tight line-clamp-2">
                    {item.productName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Talla: <span className="font-medium text-neutral-700">{item.size}</span>
                    {item.color && (
                      <> · Color: <span className="font-medium text-neutral-700">{item.color}</span></>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Precio unit.: <span className="font-medium text-neutral-700">{money(item.unitPrice)}</span>
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    {/* Control de cantidad */}
                    <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQty(item.variantId, item.qty - 1)}
                        className="px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-50 transition text-sm leading-none"
                        aria-label="Reducir cantidad"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-neutral-900">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(item.variantId, item.qty + 1)}
                        className="px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-50 transition text-sm leading-none"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal */}
                    <span className="text-sm font-bold text-neutral-900">
                      {money(item.unitPrice * item.qty)}
                    </span>

                    {/* Quitar */}
                    <button
                      type="button"
                      onClick={() => remove(item.variantId)}
                      className="text-xs text-neutral-400 hover:text-rose-600 transition"
                      aria-label={`Quitar ${item.productName} del pedido`}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-neutral-700">Total estimado</span>
            <span className="text-lg font-black text-neutral-900">{money(totalValue)}</span>
          </div>
        </div>

        {/* ── Formulario ── */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-neutral-900">Datos del pedido</h2>

          {/* Nombre */}
          <div>
            <label htmlFor="cart-name" className="block text-xs font-semibold text-neutral-700 mb-1">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              id="cart-name"
              type="text"
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              placeholder="Tu nombre completo"
              autoComplete="name"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                errors.name ? 'border-rose-400 bg-rose-50' : 'border-neutral-200 bg-white'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="cart-phone" className="block text-xs font-semibold text-neutral-700 mb-1">
              Teléfono <span className="text-neutral-400 font-normal">(opcional)</span>
            </label>
            <input
              id="cart-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleField('phone', e.target.value)}
              placeholder="9XX XXX XXX"
              autoComplete="tel"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
            />
          </div>

          {/* Tipo de entrega */}
          <div>
            <p className="block text-xs font-semibold text-neutral-700 mb-2">Entrega</p>
            <div className="flex gap-3">
              {(['pickup', 'delivery'] as DeliveryOption[]).map((opt) => (
                <label
                  key={opt}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    form.delivery === opt
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={opt}
                    checked={form.delivery === opt}
                    onChange={() => handleField('delivery', opt)}
                    className="sr-only"
                  />
                  {opt === 'pickup' ? 'Recojo en galería' : 'Envío a domicilio'}
                </label>
              ))}
            </div>
          </div>

          {/* Dirección (solo si es delivery) */}
          {form.delivery === 'delivery' && (
            <div>
              <label htmlFor="cart-address" className="block text-xs font-semibold text-neutral-700 mb-1">
                Dirección de envío <span className="text-rose-500">*</span>
              </label>
              <input
                id="cart-address"
                type="text"
                value={form.address}
                onChange={(e) => handleField('address', e.target.value)}
                placeholder="Av. Ejemplo 123, distrito"
                autoComplete="street-address"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                  errors.address ? 'border-rose-400 bg-rose-50' : 'border-neutral-200 bg-white'
                }`}
              />
              {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
            </div>
          )}

          {/* Nota */}
          <div>
            <label htmlFor="cart-note" className="block text-xs font-semibold text-neutral-700 mb-1">
              Nota <span className="text-neutral-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="cart-note"
              rows={3}
              value={form.note}
              onChange={(e) => handleField('note', e.target.value)}
              placeholder="Colores preferidos, tallas extra, horario, etc."
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
            />
          </div>

          {/* Error de envío */}
          {submitError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              {submitError}
            </div>
          )}

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3.5 text-sm font-bold text-white shadow hover:bg-green-500 disabled:opacity-60 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1"
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60" />
                </svg>
                Procesando…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.552 4.093 1.517 5.812L.057 23.886a.5.5 0 00.609.609l6.074-1.46A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.916 0-3.714-.518-5.254-1.42l-.376-.22-3.898.938.956-3.818-.243-.389A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                Enviar pedido por WhatsApp
              </>
            )}
          </button>

          <Link
            href="/catalogo"
            className="text-center text-xs text-neutral-500 hover:text-neutral-800 transition"
          >
            ← Seguir explorando
          </Link>
        </form>
      </div>
    </div>
  );
}
