'use client';

import { useEffect, useState } from 'react';
import { getAdminSettings, updateSettings } from '@/lib/adminClient';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/apiClient';

type SettingsForm = {
  store_name:          string;
  whatsapp_number:     string;
  gallery_address:     string;
  opening_hours:       string;
  welcome_message:     string;
  // Marca (004_marca.sql)
  logo_url:            string;
  primary_color:       string;
  currency_symbol:     string;
  phone_country_code:  string;
  location_tag:        string;
};

const EMPTY: SettingsForm = {
  store_name:          '',
  whatsapp_number:     '',
  gallery_address:     '',
  opening_hours:       '',
  welcome_message:     '',
  logo_url:            '',
  primary_color:       '#111111',
  currency_symbol:     'S/',
  phone_country_code:  '51',
  location_tag:        '',
};

export default function SettingsPage() {
  const [form, setForm]       = useState<SettingsForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getAdminSettings()
      .then((data) => {
        const d = data as Record<string, unknown>;
        setForm({
          store_name:         String(d.store_name         ?? ''),
          whatsapp_number:    String(d.whatsapp_number    ?? ''),
          gallery_address:    String(d.gallery_address    ?? ''),
          opening_hours:      String(d.opening_hours      ?? ''),
          welcome_message:    String(d.welcome_message    ?? ''),
          logo_url:           String(d.logo_url           ?? ''),
          primary_color:      String(d.primary_color      ?? '#111111'),
          currency_symbol:    String(d.currency_symbol    ?? 'S/'),
          phone_country_code: String(d.phone_country_code ?? '51'),
          location_tag:       String(d.location_tag       ?? ''),
        });
        setLoading(false);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Error al cargar la configuración');
        setLoading(false);
      });
  }, []);

  const setField = (key: keyof SettingsForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        store_name:          form.store_name          || undefined,
        whatsapp_number:     form.whatsapp_number     || undefined,
        gallery_address:     form.gallery_address     || null,
        opening_hours:       form.opening_hours       || null,
        welcome_message:     form.welcome_message     || null,
        logo_url:            form.logo_url            || null,
        primary_color:       form.primary_color       || null,
        currency_symbol:     form.currency_symbol     || undefined,
        phone_country_code:  form.phone_country_code  || undefined,
        location_tag:        form.location_tag        || null,
      });
      toast.success('Configuración guardada correctamente.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition';
  const labelCls = 'block text-xs font-semibold text-neutral-700 mb-1';
  const hintCls  = 'mt-1 text-[11px] text-neutral-400';

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-xl">
        <div className="h-8 w-48 rounded bg-neutral-200" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-neutral-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-black text-neutral-900">Configuración de la tienda</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Identidad ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Identidad</h2>

          <div>
            <label className={labelCls}>Nombre de la tienda <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.store_name}
              onChange={(e) => setField('store_name', e.target.value)}
              placeholder="Mi Tienda"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>URL del logo</label>
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => setField('logo_url', e.target.value)}
              placeholder="https://... (dejar vacío para mostrar solo el nombre)"
              className={inputCls}
            />
            <p className={hintCls}>
              URL pública de la imagen del logo (jpg/png/webp). Aparece en el Navbar y pie de página.
            </p>
            {form.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logo_url}
                alt="Vista previa del logo"
                className="mt-2 h-10 w-auto rounded border border-neutral-200 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>

          <div>
            <label className={labelCls}>Etiqueta de ubicación</label>
            <input
              type="text"
              value={form.location_tag}
              onChange={(e) => setField('location_tag', e.target.value)}
              placeholder="Gamarra, Lima"
              className={inputCls}
            />
            <p className={hintCls}>
              Aparece como badge junto al nombre/logo en el Navbar y en el pie de página.
            </p>
          </div>

          <div>
            <label className={labelCls}>Color principal</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setField('primary_color', e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200 p-0.5"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => setField('primary_color', e.target.value)}
                placeholder="#111111"
                maxLength={7}
                className={`${inputCls} flex-1 font-mono`}
              />
            </div>
            <p className={hintCls}>
              Código hexadecimal de 6 dígitos. Por ahora es referencia visual; en futuras versiones
              se aplicará automáticamente al tema de colores.
            </p>
          </div>
        </section>

        {/* ── Contacto y ubicación ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Contacto y ubicación</h2>

          <div>
            <label className={labelCls}>Número de WhatsApp <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.whatsapp_number}
              onChange={(e) => setField('whatsapp_number', e.target.value)}
              placeholder="51900000000 (sin + ni espacios)"
              className={inputCls}
            />
            <p className={hintCls}>
              Código de país + número, sin + ni espacios. Ej: 51912345678
            </p>
          </div>

          <div>
            <label className={labelCls}>Prefijo telefónico del país</label>
            <input
              type="text"
              value={form.phone_country_code}
              onChange={(e) => setField('phone_country_code', e.target.value)}
              placeholder="51"
              maxLength={4}
              className={`${inputCls} max-w-[100px] font-mono`}
            />
            <p className={hintCls}>
              Se usa para normalizar números de cliente al armar enlaces de WhatsApp. Ej: 51 (Perú), 56 (Chile).
            </p>
          </div>

          <div>
            <label className={labelCls}>Dirección de la galería / tienda</label>
            <input
              type="text"
              value={form.gallery_address}
              onChange={(e) => setField('gallery_address', e.target.value)}
              placeholder="Galería X, Stand 123"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Horario de atención</label>
            <input
              type="text"
              value={form.opening_hours}
              onChange={(e) => setField('opening_hours', e.target.value)}
              placeholder="Lun-Sab 9:00 - 19:00"
              className={inputCls}
            />
          </div>
        </section>

        {/* ── Moneda y precios ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Moneda y precios</h2>

          <div>
            <label className={labelCls}>Símbolo de moneda</label>
            <input
              type="text"
              value={form.currency_symbol}
              onChange={(e) => setField('currency_symbol', e.target.value)}
              placeholder="S/"
              maxLength={10}
              className={`${inputCls} max-w-[120px] font-mono`}
            />
            <p className={hintCls}>
              Aparece antes de cada precio. Ej: S/ (soles), $ (dólares), CLP (pesos chilenos).
            </p>
          </div>
        </section>

        {/* ── Catálogo ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Catálogo</h2>

          <div>
            <label className={labelCls}>Mensaje de bienvenida</label>
            <textarea
              rows={2}
              value={form.welcome_message}
              onChange={(e) => setField('welcome_message', e.target.value)}
              placeholder="Texto que aparece como título del hero en la página de inicio"
              className={`${inputCls} resize-none`}
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
