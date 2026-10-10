import { CheckCircle2, Info, X } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { ToastContext, type ToastKind } from './toast-context';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((list) => list.filter((i) => i.id !== id)), []);
  const notify = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId++;
      setItems((list) => [...list.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:items-end">
        {items.map((i) => (
          <div key={i.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg bg-navy-900 px-3.5 py-2.5 text-sm text-white shadow-pop">
            {i.kind === 'success' ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-green-300" /> : <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-sky-300" />}
            <span className="flex-1">{i.message}</span>
            <button type="button" onClick={() => dismiss(i.id)} className="rounded p-0.5 text-white/70 hover:text-white" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
