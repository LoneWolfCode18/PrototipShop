'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createUser, listUsers, updateUser } from '@/lib/adminClient';
import { ApiError } from '@/lib/apiClient';
import type { AdminUser } from '@/lib/types';

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'vendedor' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal de creación
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'vendedor'>('vendedor');
  const [formPassword, setFormPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    listUsers()
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Error al cargar usuarios');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setCurrentUserId(data.session.user.id);
        supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile?.role) {
              setCurrentUserRole(profile.role as 'admin' | 'vendedor');
            }
          });
      }
    });

    fetchUsers();
  }, [fetchUsers]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (formPassword.length < 8) {
      setModalError('La contraseña temporal debe tener al menos 8 caracteres.');
      return;
    }

    setModalLoading(true);
    try {
      await createUser({
        full_name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        password: formPassword,
      });
      setShowModal(false);
      setFormName('');
      setFormEmail('');
      setFormRole('vendedor');
      setFormPassword('');
      fetchUsers();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Error al crear usuario');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (user.id === currentUserId) {
      alert('No puedes desactivar tu propia cuenta.');
      return;
    }

    setActionLoadingId(user.id);
    setError(null);
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      fetchUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cambiar estado');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeRole = async (user: AdminUser) => {
    if (user.id === currentUserId) {
      alert('No puedes quitarte el rol de administrador a ti mismo.');
      return;
    }

    const newRole: 'admin' | 'vendedor' = user.role === 'admin' ? 'vendedor' : 'admin';
    const confirmMsg =
      user.role === 'admin'
        ? `¿Seguro que deseas cambiar el rol de ${user.full_name || user.email} a Vendedor?`
        : `¿Seguro que deseas otorgar permisos de Administrador a ${user.full_name || user.email}?`;

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(user.id);
    setError(null);
    try {
      await updateUser(user.id, { role: newRole });
      fetchUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cambiar rol');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    const nameMatch = (u.full_name ?? '').toLowerCase().includes(term);
    const emailMatch = u.email.toLowerCase().includes(term);
    return nameMatch || emailMatch;
  });

  const activeAdminCount = users.filter((u) => u.role === 'admin' && u.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-neutral-900">Usuarios</h1>
          <p className="text-xs text-neutral-500">
            Administra los accesos de tu equipo (solo administradores).
          </p>
        </div>
        {currentUserRole === 'admin' && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-700 transition"
          >
            + Nuevo usuario
          </button>
        )}
      </div>

      {/* Buscador */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o correo…"
        className="w-full max-w-sm rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500">
          {search ? 'Sin resultados para esa búsqueda.' : 'No hay usuarios registrados.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {/* Encabezado tabla */}
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] gap-4 border-b border-neutral-100 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 sm:grid">
            <span>Usuario</span>
            <span className="text-center">Rol</span>
            <span className="text-center">Estado</span>
            <span>Registrado</span>
            <span className="text-right">Acciones</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {filtered.map((user) => {
              const isSelf = user.id === currentUserId;
              const isOnlyAdmin = user.role === 'admin' && user.is_active && activeAdminCount <= 1;
              const isActionDisabled = isSelf || actionLoadingId === user.id;

              return (
                <div
                  key={user.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3.5 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] sm:items-center sm:gap-4 hover:bg-neutral-50/50 transition"
                >
                  {/* Nombre y correo */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {user.full_name || 'Sin nombre'}
                      </p>
                      {isSelf && (
                        <span className="rounded bg-neutral-900 px-1.5 py-0.2 text-[10px] font-bold text-white">
                          Tú
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                  </div>

                  {/* Rol */}
                  <div className="text-left sm:text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        user.role === 'admin'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                    </span>
                  </div>

                  {/* Estado */}
                  <div className="text-left sm:text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        user.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Fecha */}
                  <div className="text-xs text-neutral-500">
                    {new Date(user.created_at).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap items-center justify-start gap-1.5 sm:justify-end">
                    {/* Botón Cambiar Rol */}
                    <button
                      type="button"
                      disabled={isActionDisabled || isOnlyAdmin}
                      onClick={() => handleChangeRole(user)}
                      title={
                        isSelf
                          ? 'No puedes cambiar tu propio rol'
                          : isOnlyAdmin
                          ? 'No puedes quitar el rol al único admin activo'
                          : 'Cambiar rol'
                      }
                      className="rounded border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {user.role === 'admin' ? 'Hacer vendedor' : 'Hacer admin'}
                    </button>

                    {/* Botón Activar / Desactivar */}
                    <button
                      type="button"
                      disabled={isActionDisabled || (user.is_active && isOnlyAdmin)}
                      onClick={() => handleToggleActive(user)}
                      title={
                        isSelf
                          ? 'No puedes desactivar tu propia cuenta'
                          : user.is_active && isOnlyAdmin
                          ? 'No puedes desactivar al único admin activo'
                          : user.is_active
                          ? 'Desactivar usuario'
                          : 'Activar usuario'
                      }
                      className={`rounded border px-2 py-1 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        user.is_active
                          ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {user.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal crear usuario */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-neutral-900 mb-1">Crear nuevo usuario</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Crea un acceso para un miembro del equipo. Podrá ingresar de inmediato con su contraseña temporal.
            </p>

            {modalError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Correo electrónico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="juan@ejemplo.com"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Rol <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as 'admin' | 'vendedor')}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Contraseña temporal (mínimo 8 caracteres) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Ej: Temporal123!"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-60 transition"
                >
                  {modalLoading ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
