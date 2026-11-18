'use client';

import { useToastStore, type ToastItem } from '@/lib/toast';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </aside>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
          : isError
            ? 'border-rose-200 bg-rose-50/95 text-rose-900'
            : 'border-neutral-200 bg-white/95 text-neutral-900'
      }`}
    >
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isSuccess
            ? 'bg-emerald-200 text-emerald-800'
            : isError
              ? 'bg-rose-200 text-rose-800'
              : 'bg-neutral-200 text-neutral-700'
        }`}
      >
        {isSuccess ? '✓' : isError ? '!' : 'ℹ'}
      </div>

      <div className="flex-1 text-xs font-medium leading-relaxed break-words">
        {toast.message}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className={`-mr-1 -mt-1 p-1 text-sm font-bold opacity-60 hover:opacity-100 transition ${
          isSuccess ? 'text-emerald-800' : isError ? 'text-rose-800' : 'text-neutral-500'
        }`}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
}
