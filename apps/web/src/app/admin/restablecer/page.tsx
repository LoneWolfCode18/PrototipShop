'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminRestablecerPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('Tienda');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase
      .from('store_settings')
      .select('store_name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.store_name) setStoreName(data.store_name);
      });

    // Escuchar el evento PASSWORD_RECOVERY
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && window.location.hash.includes('type=recovery'))) {
        setIsRecoveryMode(true);
        setChecking(false);
      }
    });

    // Verificar si ya hay una sesión activa o un hash de recuperación
    supabase.auth.getSession().then(({ data }) => {
      const hasRecoveryHash =
        typeof window !== 'undefined' &&
        (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token'));

      if (data.session || hasRecoveryHash) {
        setIsRecoveryMode(true);
      }
      setChecking(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'Error al restablecer la contraseña.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirigir al panel tras breve pausa
    setTimeout(() => {
      router.replace('/admin');
    }, 1500);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

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
          <h1 className="mb-2 text-base font-bold text-neutral-900">Nueva contraseña</h1>

          {!isRecoveryMode ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 leading-relaxed">
                El enlace de restablecimiento es inválido, ha expirado o no contiene una sesión de recuperación válida.
              </div>
              <Link
                href="/admin/recuperar"
                className="block w-full text-center rounded-lg bg-neutral-900 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 transition"
              >
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 leading-relaxed text-center">
              ✓ Contraseña actualizada correctamente. Redirigiendo al panel…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-neutral-600">
                Ingresa tu nueva contraseña para acceder al panel.
              </p>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Nueva contraseña (mínimo 8 caracteres)
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition active:scale-95"
              >
                {loading ? 'Guardando…' : 'Restablecer contraseña'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-neutral-400">
          ← <Link href="/admin/login" className="hover:text-neutral-700 transition">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
