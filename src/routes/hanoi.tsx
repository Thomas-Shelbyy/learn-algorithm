import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { hanoiGen } from "../lib/algorithms/backtracking";
import { usePlayer } from "../lib/usePlayer";
import { ThemedSelect } from "../components/ThemedSelect";

export const Route = createFileRoute("/hanoi")({
  head: () => ({
    meta: [
      { title: "Tower of Hanoi — AlgoViz" },
      { name: "description", content: "Animated recursive Tower of Hanoi solver with C++ source." },
    ],
  }),
  component: HanoiPage,
});

const ACCENT = "oklch(0.75 0.18 310)";
const PEG_COLORS = [
  "oklch(0.72 0.19 255)",
  "oklch(0.75 0.18 162)",
  "oklch(0.82 0.18 85)",
  "oklch(0.68 0.22 22)",
  "oklch(0.75 0.18 310)",
  "oklch(0.72 0.22 180)",
  "oklch(0.80 0.18 45)",
  "oklch(0.73 0.20 140)",
];

function HanoiPage() {
  const [n, setN] = useState(4);
  const [speed, setSpeed] = useState(55);
  const gen = useCallback(() => hanoiGen(n), [n]);
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } = usePlayer(
    gen,
    speed,
  );

  const pegs = current?.pegs ?? [Array.from({ length: n }, (_, i) => n - i), [], []];
  const moving = current?.moving;
  const maxDiskWidth = 120;
  const unit = maxDiskWidth / n;

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg" style={{ color: ACCENT }}>
                ⌬
              </span>
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ letterSpacing: "-0.025em" }}
              >
                Tower of Hanoi
              </h1>
            </div>
            <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
              Move all {n} disks from A to C — optimal solution uses 2<sup>{n}</sup>−1 ={" "}
              {(1 << n) - 1} moves.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="text-[11px] uppercase tracking-wider"
              style={{ color: "oklch(0.50 0.04 255)" }}
            >
              Disks
            </label>
            <ThemedSelect
              ariaLabel="Number of disks"
              value={n}
              onChange={(v) => setN(Number(v))}
              accent={ACCENT}
              options={[3, 4, 5, 6, 7].map((v) => ({ value: v, label: String(v) }))}
            />
          </div>
        </header>

        {current?.message && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            key={current.message}
            className="rounded-xl px-4 py-2.5 text-sm font-mono"
            style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}25`, color: ACCENT }}
          >
            {current.message}
          </motion.div>
        )}

        {/* Towers */}
        <div
          className="rounded-2xl overflow-hidden p-3 sm:p-4"
          style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <div className="grid grid-cols-3 gap-1.5 sm:gap-6 items-end h-[260px] sm:h-[300px]">
            {pegs.map((peg, pi) => (
              <div key={pi} className="flex h-full flex-col items-center justify-end">
                {/* Tower area (rod + base + disks). Label lives BELOW this box so
                    it can never overlap the base/disks. */}
                <div className="relative flex w-full flex-1 flex-col items-center justify-end">
                  {/* Peg rod */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2"
                    style={{
                      width: 4,
                      height: "92%",
                      background: "oklch(0.30 0.03 265)",
                      borderRadius: 2,
                    }}
                  />
                  {/* Base */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2"
                    style={{
                      width: "94%",
                      maxWidth: maxDiskWidth + 40,
                      height: 6,
                      background: "oklch(0.35 0.03 265)",
                      borderRadius: 3,
                    }}
                  />
                  {/* Disks */}
                  <div
                    className="relative flex flex-col-reverse items-center w-full"
                    style={{ paddingBottom: 6 }}
                  >
                    <AnimatePresence>
                      {peg.map((disk, di) => {
                        const w = unit * disk + 16;
                        const isMoving = disk === moving && di === peg.length - 1;
                        const color = PEG_COLORS[(disk - 1) % PEG_COLORS.length];
                        return (
                          <motion.div
                            key={disk}
                            layout
                            layoutId={`disk-${disk}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            className="flex items-center justify-center rounded-md text-[9px] sm:text-[10px] font-mono font-bold"
                            style={{
                              width: w,
                              height: 20,
                              marginTop: 2,
                              maxWidth: "100%",
                              background: color,
                              color: "oklch(0.08 0.02 265)",
                              boxShadow: isMoving
                                ? `0 0 16px ${color}`
                                : `0 1px 3px oklch(0 0 0 / 30%)`,
                              border: isMoving
                                ? `2px solid oklch(0.95 0.01 60)`
                                : "1px solid oklch(0 0 0 / 20%)",
                              zIndex: isMoving ? 10 : 1,
                            }}
                          >
                            {disk}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
                {/* Peg label — its own row, reserved height, never overlaps */}
                <span
                  className="mt-2 h-4 shrink-0 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest"
                  style={{ color: "oklch(0.50 0.04 255)" }}
                >
                  Peg {String.fromCharCode(65 + pi)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex flex-wrap gap-3 text-[11px] items-center"
          style={{ color: "oklch(0.50 0.04 255)" }}
        >
          <span className="font-mono">
            Moves: <span style={{ color: ACCENT }}>{current?.count ?? 0}</span> /{" "}
            {current?.total ?? (1 << n) - 1}
          </span>
        </div>

        <Controls
          playing={playing}
          onPlay={play}
          onPause={pause}
          onReset={reset}
          onStepBack={stepBack}
          onStepFwd={stepFwd}
          speed={speed}
          setSpeed={setSpeed}
          index={index}
          total={total}
        />
      </div>
      <aside className="min-w-0">
        <PythonCodePanel
          section="backtracking"
          algo="Tower of Hanoi"
          accentColor={ACCENT}
          activeLines={inferLines("backtracking", "Tower of Hanoi", current)}
        />
      </aside>
    </div>
  );
}
