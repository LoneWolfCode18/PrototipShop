'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminRecuperarPage() {
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('Tienda');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from('store_settings')
      .select('store_name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.store_name) setStoreName(data.store_name);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = `${origin}/admin/restablecer`;

    // Neutral: no revela si el correo existe o no
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    }).catch(() => null);

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-black tracking-tight text-neutral-900">
            {storeName}
          </Link>
          <p className="mt-1 text-xs text-neutral-500">Panel de administración</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-base font-bold text-neutral-900">Recuperar contraseña</h1>
          <p className="mb-5 text-xs text-neutral-600">
            Ingresa tu correo para recibir un enlace de restablecimiento.
          </p>

          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 leading-relaxed">
                Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos. Revisa también tu carpeta de spam.
              </div>
              <Link
                href="/admin/login"
                className="block w-full text-center rounded-lg bg-neutral-900 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 transition"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="tu-correo@ejemplo.com"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition active:scale-95"
              >
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-neutral-400">
          ← <Link href="/admin/login" className="hover:text-neutral-700 transition">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
