'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PUBLIC_ADMIN_ROUTES = ['/admin/login', '/admin/recuperar', '/admin/restablecer'];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'vendedor' | null>(null);
  const [storeName, setStoreName] = useState<string>('Tienda');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Las páginas públicas de auth no necesitan guard ni sidebar
  const isPublicRoute = PUBLIC_ADMIN_ROUTES.includes(pathname);

  useEffect(() => {
    // Cargar nombre de la tienda desde store_settings
    supabase
      .from('store_settings')
      .select('store_name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.store_name) setStoreName(data.store_name);
      });

    if (isPublicRoute) {
      setChecking(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/admin/login');
      } else {
        setUserEmail(data.session.user.email ?? null);
        // Cargar perfil para conocer el rol
        supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile?.role) setUserRole(profile.role as 'admin' | 'vendedor');
            setChecking(false);
          });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isPublicRoute && (event === 'SIGNED_OUT' || !session)) {
        router.replace('/admin/login');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router, isPublicRoute]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Rutas públicas: renderizar directamente sin sidebar ni guard spinner
  if (isPublicRoute) return <>{children}</>;

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Inicio', exact: true },
    { href: '/admin/pedidos', label: 'Pedidos' },
    { href: '/admin/productos', label: 'Productos' },
    { href: '/admin/stock', label: 'Stock' },
    ...(userRole === 'admin' || userRole === null ? [{ href: '/admin/usuarios', label: 'Usuarios' }] : []),
    { href: '/admin/settings', label: 'Configuración' },
  ];

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-neutral-100 px-5">
          <Link href="/" className="text-xl font-black tracking-tight text-neutral-900 truncate">
            {storeName}
          </Link>
          <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shrink-0">
            Admin
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive(item)
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-neutral-100 p-4">
          <p className="truncate text-xs text-neutral-500">{userEmail}</p>
          {userRole && (
            <span className="mt-1 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 capitalize">
              {userRole}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar móvil */}
        <div className="flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
            aria-label="Abrir menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-sm font-bold text-neutral-900">Panel Admin</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
