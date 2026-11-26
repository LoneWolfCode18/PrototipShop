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
  logo_url:            string;
  primary_color:       string;
  currency_symbol:     string;
  phone_country_code:  string;
  location_tag:        string;
  // 005_tienda_publica.sql
  about_text:          string;
  hero_image_url:      string;
  hero_subtitle:       string;
  catalog_subtitle:    string;
  instagram_url:       string;
  facebook_url:        string;
  tiktok_url:          string;
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
  about_text:          '',
  hero_image_url:      '',
  hero_subtitle:       '',
  catalog_subtitle:    '',
  instagram_url:       '',
  facebook_url:        '',
  tiktok_url:          '',
};

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

export default function SettingsPage() {
  const [form, setForm]       = useState<SettingsForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getAdminSettings()
      .then((data) => {
        const d = data as Record<string, unknown>;
        setForm({
          store_name:         str(d.store_name),
          whatsapp_number:    str(d.whatsapp_number),
          gallery_address:    str(d.gallery_address),
          opening_hours:      str(d.opening_hours),
          welcome_message:    str(d.welcome_message),
          logo_url:           str(d.logo_url),
          primary_color:      str(d.primary_color) || '#111111',
          currency_symbol:    str(d.currency_symbol) || 'S/',
          phone_country_code: str(d.phone_country_code) || '51',
          location_tag:       str(d.location_tag),
          about_text:         str(d.about_text),
          hero_image_url:     str(d.hero_image_url),
          hero_subtitle:      str(d.hero_subtitle),
          catalog_subtitle:   str(d.catalog_subtitle),
          instagram_url:      str(d.instagram_url),
          facebook_url:       str(d.facebook_url),
          tiktok_url:         str(d.tiktok_url),
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

  const nullable = (v: string) => v.trim() || null;
  const optional = (v: string) => v.trim() || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        store_name:          optional(form.store_name),
        whatsapp_number:     optional(form.whatsapp_number),
        gallery_address:     nullable(form.gallery_address),
        opening_hours:       nullable(form.opening_hours),
        welcome_message:     nullable(form.welcome_message),
        logo_url:            nullable(form.logo_url),
        primary_color:       nullable(form.primary_color),
        currency_symbol:     optional(form.currency_symbol),
        phone_country_code:  optional(form.phone_country_code),
        location_tag:        nullable(form.location_tag),
        about_text:          nullable(form.about_text),
        hero_image_url:      nullable(form.hero_image_url),
        hero_subtitle:       nullable(form.hero_subtitle),
        catalog_subtitle:    nullable(form.catalog_subtitle),
        instagram_url:       nullable(form.instagram_url),
        facebook_url:        nullable(form.facebook_url),
        tiktok_url:          nullable(form.tiktok_url),
      });
      toast.success('Configuración guardada correctamente.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inp =
    'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition';
  const lbl = 'block text-xs font-semibold text-neutral-700 mb-1';
  const hint = 'mt-1 text-[11px] text-neutral-400';

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-xl">
        <div className="h-8 w-48 rounded bg-neutral-200" />
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 rounded-xl bg-neutral-200" />)}
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
            <label className={lbl}>Nombre de la tienda <span className="text-rose-500">*</span></label>
            <input type="text" value={form.store_name}
              onChange={(e) => setField('store_name', e.target.value)}
              placeholder="Mi Tienda" className={inp} />
          </div>

          <div>
            <label className={lbl}>URL del logo</label>
            <input type="url" value={form.logo_url}
              onChange={(e) => setField('logo_url', e.target.value)}
              placeholder="https://..." className={inp} />
            <p className={hint}>URL pública de la imagen (jpg/png/webp). Se muestra en el Navbar.</p>
            {form.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="Vista previa"
                className="mt-2 h-10 w-auto rounded border border-neutral-200 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>

          <div>
            <label className={lbl}>Etiqueta de ubicación</label>
            <input type="text" value={form.location_tag}
              onChange={(e) => setField('location_tag', e.target.value)}
              placeholder="Gamarra, Lima" className={inp} />
            <p className={hint}>Badge junto al logo en el Navbar y el footer.</p>
          </div>

          <div>
            <label className={lbl}>Color principal</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color}
                onChange={(e) => setField('primary_color', e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200 p-0.5" />
              <input type="text" value={form.primary_color}
                onChange={(e) => setField('primary_color', e.target.value)}
                placeholder="#111111" maxLength={7}
                className={`${inp} flex-1 font-mono`} />
            </div>
            <p className={hint}>Hex de 6 dígitos. Se aplica en botones y acentos de la tienda.</p>
          </div>
        </section>

        {/* ── Tienda pública — textos ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Textos de la tienda</h2>

          <div>
            <label className={lbl}>Subtítulo del hero</label>
            <input type="text" value={form.hero_subtitle}
              onChange={(e) => setField('hero_subtitle', e.target.value)}
              placeholder="Prendas de calidad directo al WhatsApp"
              className={inp} />
            <p className={hint}>Si está vacío se usa el mensaje de bienvenida.</p>
          </div>

          <div>
            <label className={lbl}>Imagen del hero (URL)</label>
            <input type="url" value={form.hero_image_url}
              onChange={(e) => setField('hero_image_url', e.target.value)}
              placeholder="https://..." className={inp} />
            <p className={hint}>Aparece a la derecha del hero. Si está vacía el hero ocupa todo el ancho.</p>
          </div>

          <div>
            <label className={lbl}>Mensaje de bienvenida / título alternativo del hero</label>
            <textarea rows={2} value={form.welcome_message}
              onChange={(e) => setField('welcome_message', e.target.value)}
              placeholder="Bienvenido a nuestra tienda"
              className={`${inp} resize-none`} />
          </div>

          <div>
            <label className={lbl}>Subtítulo del catálogo</label>
            <input type="text" value={form.catalog_subtitle}
              onChange={(e) => setField('catalog_subtitle', e.target.value)}
              placeholder="Encuentra tu prenda ideal"
              className={inp} />
            <p className={hint}>Aparece bajo el título de la página /catalogo.</p>
          </div>
        </section>

        {/* ── Quiénes somos ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Quiénes somos</h2>
          <div>
            <label className={lbl}>Texto de presentación</label>
            <textarea rows={6} value={form.about_text}
              onChange={(e) => setField('about_text', e.target.value)}
              placeholder="Cuéntales a tus clientes quiénes son, qué ofrecen y cuál es su diferenciador..."
              className={`${inp} resize-y`} />
            <p className={hint}>Se muestra en la página /quienes-somos. Soporta saltos de línea.</p>
          </div>
        </section>

        {/* ── Contacto y ubicación ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Contacto y ubicación</h2>

          <div>
            <label className={lbl}>Número de WhatsApp <span className="text-rose-500">*</span></label>
            <input type="text" value={form.whatsapp_number}
              onChange={(e) => setField('whatsapp_number', e.target.value)}
              placeholder="51900000000 (sin + ni espacios)" className={inp} />
            <p className={hint}>Código de país + número sin + ni espacios. Ej: 51912345678</p>
          </div>

          <div>
            <label className={lbl}>Prefijo telefónico del país</label>
            <input type="text" value={form.phone_country_code}
              onChange={(e) => setField('phone_country_code', e.target.value)}
              placeholder="51" maxLength={4}
              className={`${inp} max-w-[100px] font-mono`} />
            <p className={hint}>Ej: 51 (Perú), 56 (Chile), 52 (México).</p>
          </div>

          <div>
            <label className={lbl}>Dirección</label>
            <input type="text" value={form.gallery_address}
              onChange={(e) => setField('gallery_address', e.target.value)}
              placeholder="Galería X, Stand 123" className={inp} />
          </div>

          <div>
            <label className={lbl}>Horario de atención</label>
            <input type="text" value={form.opening_hours}
              onChange={(e) => setField('opening_hours', e.target.value)}
              placeholder="Lun-Sab 9:00 - 19:00" className={inp} />
          </div>
        </section>

        {/* ── Redes sociales ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Redes sociales</h2>
          <p className="text-xs text-neutral-500">Deja vacío los que no uses. Deben ser URLs completas.</p>

          <div>
            <label className={lbl}>Instagram</label>
            <input type="url" value={form.instagram_url}
              onChange={(e) => setField('instagram_url', e.target.value)}
              placeholder="https://instagram.com/tutienda" className={inp} />
          </div>

          <div>
            <label className={lbl}>Facebook</label>
            <input type="url" value={form.facebook_url}
              onChange={(e) => setField('facebook_url', e.target.value)}
              placeholder="https://facebook.com/tutienda" className={inp} />
          </div>

          <div>
            <label className={lbl}>TikTok</label>
            <input type="url" value={form.tiktok_url}
              onChange={(e) => setField('tiktok_url', e.target.value)}
              placeholder="https://tiktok.com/@tutienda" className={inp} />
          </div>
        </section>

        {/* ── Moneda ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Moneda y precios</h2>
          <div>
            <label className={lbl}>Símbolo de moneda</label>
            <input type="text" value={form.currency_symbol}
              onChange={(e) => setField('currency_symbol', e.target.value)}
              placeholder="S/" maxLength={10}
              className={`${inp} max-w-[120px] font-mono`} />
            <p className={hint}>Ej: S/ (soles), $ (dólares), CLP (pesos chilenos).</p>
          </div>
        </section>

        <button type="submit" disabled={saving}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
