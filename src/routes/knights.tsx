import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { knightTourGen } from "../lib/algorithms/backtracking";
import { usePlayer } from "../lib/usePlayer";
import { ThemedSelect } from "../components/ThemedSelect";

export const Route = createFileRoute("/knights")({
  head: () => ({
    meta: [
      { title: "Knight's Tour — AlgoViz" },
      {
        name: "description",
        content:
          "Chess-board Knight's Tour visualization using Warnsdorff's heuristic, with C++ source.",
      },
    ],
  }),
  component: KnightsPage,
});

const ACCENT = "oklch(0.72 0.22 180)";

function KnightsPage() {
  const [n, setN] = useState(6);
  const [speed, setSpeed] = useState(75);
  const gen = useCallback(() => knightTourGen(n), [n]);
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } = usePlayer(
    gen,
    speed,
  );

  const board = current?.board ?? Array.from({ length: n }, () => new Array(n).fill(0));
  const [pr, pc] = current?.pos ?? [0, 0];
  const cellPx = n <= 6 ? 48 : n <= 8 ? 40 : 34;

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg" style={{ color: ACCENT }}>
                ♞
              </span>
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ letterSpacing: "-0.025em" }}
              >
                Knight's Tour
              </h1>
            </div>
            <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
              Visit every square exactly once — Warnsdorff's heuristic on a {n}×{n} chess board.
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
              options={[5, 6, 7, 8].map((v) => ({ value: v, label: `${v}×${v}` }))}
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
            {board.map((row, r) => (
              <div key={r} className="flex">
                {row.map((step, c) => {
                  const dark = (r + c) % 2 === 1;
                  const isCur = r === pr && c === pc;
                  const visited = step > 0;
                  const heat = visited ? Math.min(1, step / (n * n)) : 0;
                  const bg = isCur
                    ? ACCENT
                    : visited
                      ? `oklch(${0.25 + heat * 0.35} 0.16 ${180 + heat * 60} / 90%)`
                      : dark
                        ? "oklch(0.18 0.02 265)"
                        : "oklch(0.25 0.02 265)";
                  return (
                    <motion.div
                      key={c}
                      animate={{ backgroundColor: bg }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center justify-center font-mono"
                      style={{
                        width: cellPx,
                        height: cellPx,
                        border: "1px solid oklch(1 0 0 / 5%)",
                        color: isCur ? "oklch(0.08 0.02 265)" : "oklch(0.92 0.01 255)",
                        fontSize: cellPx * 0.32,
                        fontWeight: isCur ? 700 : 500,
                      }}
                    >
                      {isCur ? "♞" : visited ? step : ""}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "oklch(0.50 0.04 255)" }}>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: ACCENT }} />
            Knight
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: "oklch(0.45 0.16 220 / 90%)" }}
            />
            Visited (number = move order)
          </span>
          <span className="ml-auto font-mono">
            Step <span style={{ color: ACCENT }}>{current?.step ?? 0}</span> / {n * n}
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
          algo="Knight's Tour"
          accentColor={ACCENT}
          activeLines={inferLines("backtracking", "Knight's Tour", current)}
        />
      </aside>
    </div>
  );
}
