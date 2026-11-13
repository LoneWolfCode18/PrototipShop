'use client';

import { useEffect, useState } from 'react';
import { getAdminSettings, updateSettings } from '@/lib/adminClient';
import { ApiError } from '@/lib/apiClient';

type SettingsForm = {
  store_name: string;
  whatsapp_number: string;
  gallery_address: string;
  opening_hours: string;
  welcome_message: string;
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    store_name: '',
    whatsapp_number: '',
    gallery_address: '',
    opening_hours: '',
    welcome_message: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getAdminSettings()
      .then((data) => {
        setForm({
          store_name: (data.store_name as string) ?? '',
          whatsapp_number: (data.whatsapp_number as string) ?? '',
          gallery_address: (data.gallery_address as string) ?? '',
          opening_hours: (data.opening_hours as string) ?? '',
          welcome_message: (data.welcome_message as string) ?? '',
        });
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateSettings({
        store_name: form.store_name || undefined,
        whatsapp_number: form.whatsapp_number || undefined,
        gallery_address: form.gallery_address || null,
        opening_hours: form.opening_hours || null,
        welcome_message: form.welcome_message || null,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof SettingsForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inputCls =
    'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition';
  const labelCls = 'block text-xs font-semibold text-neutral-700 mb-1';

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-xl">
        <div className="h-8 w-40 rounded bg-neutral-200" />
        {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-xl bg-neutral-200" />)}
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-black text-neutral-900">Configuración de la tienda</h1>

      <form onSubmit={handleSubmit} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div>
          <label className={labelCls}>Nombre de la tienda</label>
          <input
            type="text"
            value={form.store_name}
            onChange={(e) => setField('store_name', e.target.value)}
            placeholder="RKeens"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Número de WhatsApp <span className="text-rose-500">*</span></label>
          <input
            type="text"
            value={form.whatsapp_number}
            onChange={(e) => setField('whatsapp_number', e.target.value)}
            placeholder="51900000000 (sin + ni espacios)"
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-neutral-400">
            Formato: código de país + número. Ej: 51912345678
          </p>
        </div>

        <div>
          <label className={labelCls}>Dirección de la galería</label>
          <input
            type="text"
            value={form.gallery_address}
            onChange={(e) => setField('gallery_address', e.target.value)}
            placeholder="Galería X, Stand 123, Gamarra"
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

        <div>
          <label className={labelCls}>Mensaje de bienvenida (opcional)</label>
          <textarea
            rows={2}
            value={form.welcome_message}
            onChange={(e) => setField('welcome_message', e.target.value)}
            placeholder="Texto que aparece al cliente al abrir el catálogo"
            className={`${inputCls} resize-none`}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
            ✓ Configuración guardada correctamente.
          </div>
        )}

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
