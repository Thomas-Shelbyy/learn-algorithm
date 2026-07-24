import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { nQueensGen } from "../lib/algorithms/backtracking";
import { usePlayer } from "../lib/usePlayer";
import { ThemedSelect } from "../components/ThemedSelect";

export const Route = createFileRoute("/nqueens")({
  head: () => ({
    meta: [
      { title: "N-Queens — AlgoViz" },
      {
        name: "description",
        content: "Backtracking N-Queens solver visualization with C++ source.",
      },
    ],
  }),
  component: NQueensPage,
});

const ACCENT = "oklch(0.82 0.18 85)";

function NQueensPage() {
  const [n, setN] = useState(6);
  const [speed, setSpeed] = useState(70);
  const gen = useCallback(() => nQueensGen(n), [n]);
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } = usePlayer(
    gen,
    speed,
  );

  const cols = current?.cols ?? new Array(n).fill(-1);
  const tryingRow = current?.row ?? 0;
  const trying = current?.trying;
  const backtrack = current?.backtrack;

  const cellPx = n <= 6 ? 44 : n <= 8 ? 38 : 30;

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg" style={{ color: ACCENT }}>
                ♛
              </span>
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ letterSpacing: "-0.025em" }}
              >
                N-Queens
              </h1>
            </div>
            <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
              Place {n} queens so none attack each other — solved with classic backtracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="text-[11px] uppercase tracking-wider"
              style={{ color: "oklch(0.50 0.04 255)" }}
            >
              Board
            </label>
            <ThemedSelect
              ariaLabel="Board size"
              value={n}
              onChange={(v) => setN(Number(v))}
              accent={ACCENT}
              widthClass="min-w-[5rem]"
              options={[4, 5, 6, 7, 8].map((v) => ({ value: v, label: `${v}×${v}` }))}
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

        {/* Board */}
        <div
          className="rounded-2xl overflow-hidden p-4 flex justify-center"
          style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <div className="inline-block">
            {Array.from({ length: n }).map((_, r) => (
              <div key={r} className="flex">
                {Array.from({ length: n }).map((_, c) => {
                  const dark = (r + c) % 2 === 1;
                  const hasQueen = cols[r] === c;
                  const isTrying = r === tryingRow && trying === c;
                  const isBack = r === tryingRow && backtrack === c;
                  const isRow = r === tryingRow;
                  const bg = isBack
                    ? "oklch(0.65 0.22 22 / 70%)"
                    : isTrying
                      ? `${ACCENT}80`
                      : isRow
                        ? `${ACCENT}18`
                        : dark
                          ? "oklch(0.18 0.02 265)"
                          : "oklch(0.25 0.02 265)";
                  return (
                    <motion.div
                      key={c}
                      animate={{ backgroundColor: bg }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center"
                      style={{
                        width: cellPx,
                        height: cellPx,
                        border: "1px solid oklch(1 0 0 / 5%)",
                      }}
                    >
                      {hasQueen && (
                        <motion.span
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          style={{
                            fontSize: cellPx * 0.62,
                            color: "oklch(0.95 0.01 60)",
                            textShadow: `0 0 8px ${ACCENT}80`,
                          }}
                        >
                          ♛
                        </motion.span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "oklch(0.50 0.04 255)" }}>
          {[
            { color: ACCENT, label: "Trying" },
            { color: "oklch(0.65 0.22 22)", label: "Backtrack" },
            { color: `${ACCENT}40`, label: "Current row" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
          <span className="ml-auto font-mono">
            Solutions found: <span style={{ color: ACCENT }}>{current?.solutions ?? 0}</span>
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
          algo="N-Queens"
          accentColor={ACCENT}
          activeLines={inferLines("backtracking", "N-Queens", current)}
        />
      </aside>
    </div>
  );
}
