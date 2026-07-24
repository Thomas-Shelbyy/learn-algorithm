import { motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

export function Controls({
  playing,
  onPlay,
  onPause,
  onReset,
  onStepBack,
  onStepFwd,
  speed,
  setSpeed,
  index,
  total,
  extra,
  enableShortcuts = true,
}: {
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepBack: () => void;
  onStepFwd: () => void;
  speed: number;
  setSpeed: (n: number) => void;
  index: number;
  total: number;
  extra?: ReactNode;
  enableShortcuts?: boolean;
}) {
  const progress = total > 1 ? (index / (total - 1)) * 100 : 0;

  // Keyboard shortcuts: space = play/pause, arrows = step, R = reset.
  useEffect(() => {
    if (!enableShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (playing) onPause();
        else onPlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        onStepBack();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        onStepFwd();
      } else if (e.key === "r" || e.key === "R") {
        onReset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableShortcuts, playing, onPlay, onPause, onStepBack, onStepFwd, onReset]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
    >
      {/* Progress bar with glowing playhead */}
      <div className="relative h-[3px] w-full" style={{ background: "oklch(1 0 0 / 8%)" }}>
        <motion.div
          className="h-full"
          style={{
            background: "linear-gradient(90deg, oklch(0.72 0.19 255), oklch(0.75 0.18 162))",
          }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
        />
        <motion.div
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "#fff", boxShadow: "0 0 8px oklch(0.75 0.18 162)" }}
          animate={{ left: `${progress}%`, opacity: playing ? 1 : 0.6 }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3">
        {/* Step back */}
        <button
          onClick={onStepBack}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105 active:scale-95"
          style={{
            background: "oklch(1 0 0 / 6%)",
            color: "oklch(0.65 0.04 255)",
            border: "1px solid oklch(1 0 0 / 8%)",
          }}
          title="Step back (left arrow)"
        >
          ◀
        </button>

        {/* Play/Pause */}
        {playing ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPause}
            className="h-8 px-4 rounded-lg text-sm font-semibold transition-all hover:scale-105 flex items-center gap-1.5"
            style={{
              background: "oklch(0.72 0.19 255)",
              color: "oklch(0.08 0.02 265)",
              boxShadow: "0 0 16px oklch(0.72 0.19 255 / 25%)",
            }}
            title="Pause (Space)"
          >
            <span className="flex gap-[3px] items-center">
              <span className="block w-[3px] h-[12px] rounded-full bg-current" />
              <span className="block w-[3px] h-[12px] rounded-full bg-current" />
            </span>
            Pause
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPlay}
            className="h-8 px-4 rounded-lg text-sm font-semibold transition-all hover:scale-105 flex items-center gap-1.5"
            style={{
              background: "oklch(0.72 0.19 255)",
              color: "oklch(0.08 0.02 265)",
              boxShadow: "0 0 16px oklch(0.72 0.19 255 / 25%)",
            }}
            title="Play (Space)"
          >
            <span
              className="border-l-[10px] border-y-[6px] border-y-transparent border-l-current"
              style={{ borderLeftColor: "currentColor" }}
            />
            Play
          </motion.button>
        )}

        {/* Step fwd */}
        <button
          onClick={onStepFwd}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105 active:scale-95"
          style={{
            background: "oklch(1 0 0 / 6%)",
            color: "oklch(0.65 0.04 255)",
            border: "1px solid oklch(1 0 0 / 8%)",
          }}
          title="Step forward (right arrow)"
        >
          ▶
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="h-8 px-3 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
          style={{
            background: "oklch(1 0 0 / 6%)",
            color: "oklch(0.65 0.04 255)",
            border: "1px solid oklch(1 0 0 / 8%)",
          }}
          title="Reset (R)"
        >
          ↺ Reset
        </button>

        {/* Speed */}
        <div className="flex items-center gap-2 ml-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "oklch(0.50 0.04 255)" }}
          >
            Speed
          </span>
          <input
            type="range"
            min={1}
            max={100}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-20 sm:w-28"
          />
          <span
            className="text-[10px] font-mono w-5 text-right"
            style={{ color: "oklch(0.65 0.04 255)" }}
          >
            {speed}
          </span>
        </div>

        {/* Step counter */}
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="hidden sm:inline text-[9px] font-mono"
            style={{ color: "oklch(0.38 0.04 255)" }}
            title="Space play/pause · arrows step · R reset"
          >
            space · ◀ ▶ · r
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-md"
            style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(0.55 0.04 255)" }}
          >
            {index + 1} <span style={{ color: "oklch(0.40 0.04 255)" }}>/</span> {total}
          </span>
        </div>

        {extra}
      </div>
    </div>
  );
}
