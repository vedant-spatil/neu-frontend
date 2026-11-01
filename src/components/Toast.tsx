import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Toasts for the outcome of an action. Use `useToast()` and call success, info or error with a message. Each toast shows a
 * coloured strip that empties over its duration, then disappears. Green is success, yellow is info, red is error.
 */

type Tone = "success" | "info" | "error";
type Item = { id: number; tone: Tone; message: string; duration: number };
export type Toaster = { success: (message: string) => void; info: (message: string) => void; error: (message: string) => void };

const STRIP: Record<Tone, string> = { success: "bg-ok-600", info: "bg-warn-600", error: "bg-brand-600" };
const DURATION_MS: Record<Tone, number> = { success: 4000, info: 4000, error: 6000 };
const MAX_VISIBLE = 4;

// Without a provider the calls do nothing, so a component can be rendered alone in tests.
const ToastContext = createContext<Toaster>({ success: () => {}, info: () => {}, error: () => {} });

export function useToast(): Toaster {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), []);

  const push = useCallback((tone: Tone, message: string) => {
    const id = nextId.current++;
    setItems((cur) => [...cur.slice(-(MAX_VISIBLE - 1)), { id, tone, message, duration: DURATION_MS[tone] }]);
  }, []);

  const toaster = useMemo<Toaster>(() => ({
    success: (m) => push("success", m),
    info: (m) => push("info", m),
    error: (m) => push("error", m),
  }), [push]);

  return (
    <ToastContext.Provider value={toaster}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3">
        {items.map((item) => <ToastCard key={item.id} item={item} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: Item; onDismiss: (id: number) => void }) {
  const [emptied, setEmptied] = useState(false);

  // The strip starts full and empties over the toast's duration. The timer is set once per toast; re-renders of the
  // provider do not restart it.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEmptied(true));
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [item.id, item.duration, onDismiss]);

  return (
    <div className="pointer-events-auto overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-line">
      <div className="flex items-start gap-3 px-4 py-3">
        <p className="flex-1 text-sm text-ink-900">{item.message}</p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => onDismiss(item.id)}
          className="text-lg leading-none text-ink-400 hover:text-ink-900"
        >
          ×
        </button>
      </div>
      <div
        className={`h-1 ${STRIP[item.tone]}`}
        style={{ width: emptied ? "0%" : "100%", transition: `width ${item.duration}ms linear` }}
      />
    </div>
  );
}
