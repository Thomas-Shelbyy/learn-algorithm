import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export interface ThemedSelectOption {
  value: number | string;
  label: string;
}

/**
 * A fully theme-styled dropdown that replaces the native <select>, whose option
 * list cannot be colored on most browsers (it renders OS-white). This keeps the
 * popup on-brand (dark, accent-tinted) across the whole app.
 */
export function ThemedSelect({
  value,
  onChange,
  options,
  accent = "oklch(0.72 0.19 255)",
  ariaLabel,
  className = "",
  widthClass = "min-w-[4.5rem]",
}: {
  value: number | string;
  onChange: (v: number | string) => void;
  options: ThemedSelectOption[];
  accent?: string;
  ariaLabel?: string;
  className?: string;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${widthClass} ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-xs font-mono transition-colors"
        style={{
          background: open
            ? `color-mix(in oklch, ${accent} 14%, transparent)`
            : "oklch(1 0 0 / 6%)",
          border: `1px solid ${open ? `color-mix(in oklch, ${accent} 45%, transparent)` : "oklch(1 0 0 / 12%)"}`,
          color: "oklch(0.88 0.01 255)",
        }}
      >
        <span>{selected?.label ?? value}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="text-[9px]"
          style={{ color: accent }}
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute right-0 z-50 mt-1.5 max-h-56 w-full min-w-max overflow-auto rounded-xl p-1 shadow-2xl"
            style={{
              background: "oklch(0.12 0.022 265 / 98%)",
              border: "1px solid oklch(1 0 0 / 12%)",
              backdropFilter: "blur(20px)",
            }}
          >
            {options.map((o) => {
              const isSel = o.value === value;
              return (
                <li key={String(o.value)} role="option" aria-selected={isSel}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors"
                    style={{
                      background: isSel
                        ? `color-mix(in oklch, ${accent} 18%, transparent)`
                        : "transparent",
                      color: isSel ? accent : "oklch(0.78 0.02 255)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSel)
                        (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSel) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span>{o.label}</span>
                    {isSel && (
                      <span className="text-[10px]" style={{ color: accent }}>
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
