import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { DP_ALGOS, type DPAlgoName } from "../lib/algorithms/dp";
import { usePlayer } from "../lib/usePlayer";

export const Route = createFileRoute("/dp")({
  head: () => ({ meta: [{ title: "Dynamic Programming — AlgoViz" }] }),
  component: DPPage,
});

const ALGO_COLOR: Record<DPAlgoName, string> = {
  "Fibonacci": "oklch(0.72 0.19 255)",
  "LCS": "oklch(0.75 0.18 162)",
  "0/1 Knapsack": "oklch(0.82 0.18 85)",
  "Edit Distance": "oklch(0.68 0.22 22)",
  "Coin Change": "oklch(0.75 0.18 310)",
  "LIS": "oklch(0.72 0.22 180)",
  "Subset Sum": "oklch(0.70 0.20 300)",
};

const DESCRIPTIONS: Record<DPAlgoName, string> = {
  "Fibonacci": "fib(n) = fib(n−1) + fib(n−2)",
  "LCS": '"ABCBDAB" vs "BDCAB"',
  "0/1 Knapsack": "Weights [2,3,4,5], Values [3,4,5,6], Cap=8",
  "Edit Distance": '"SUNDAY" → "SATURDAY"',
  "Coin Change": "Coins [1,5,10,25], Amount=41",
  "LIS": "[10,9,2,5,3,7,101,18]",
  "Subset Sum": "Items [3,4,5,2], Target=9",
};

function DPPage() {
  const [algo, setAlgo] = useState<DPAlgoName>("Fibonacci");
  const [speed, setSpeed] = useState(55);

  const gen = useCallback(() => DP_ALGOS[algo](), [algo]);
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } =
    usePlayer(gen, speed);

  const accentColor = ALGO_COLOR[algo];
  const table = current?.table ?? [];
  const hlCell = current?.highlightCell;
  const hlCells = new Set((current?.highlightCells ?? []).map(([r,c]: [number,number]) => `${r},${c}`));
  const traceSet = new Set((current?.traceback ?? []).map(([r,c]: [number,number]) => `${r},${c}`));

  const MAX_COLS = 20;
  const visibleTable = table.map(row => row.slice(0, MAX_COLS));

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg" style={{ color: accentColor }}>⊞</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Dynamic Programming</h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>{DESCRIPTIONS[algo]}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(DP_ALGOS) as DPAlgoName[]).map((name) => (
            <button key={name} onClick={() => setAlgo(name)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105"
              style={{
                background: algo === name ? ALGO_COLOR[name] : "oklch(1 0 0 / 6%)",
                color: algo === name ? "oklch(0.08 0.02 265)" : "oklch(0.65 0.04 255)",
                border: `1px solid ${algo === name ? ALGO_COLOR[name] : "oklch(1 0 0 / 10%)"}`,
                boxShadow: algo === name ? `0 0 12px ${ALGO_COLOR[name]}40` : "none",
              }}>{name}</button>
          ))}
        </div>
      </header>

      {/* Message */}
      {current?.message && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} key={current.message}
          className="rounded-xl px-4 py-2.5 text-sm font-mono"
          style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}25`, color: accentColor }}>
          {current.message}
        </motion.div>
      )}

      {/* DP Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "oklch(0.40 0.04 255)" }}>dp table</span>
          {current?.result !== undefined && (
            <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}35` }}>
              Result: {current.result}
            </motion.span>
          )}
        </div>
        <div className="overflow-x-auto p-3 pb-4">
          {visibleTable.map((row, r) => (
            <div key={r} className="flex gap-[3px] mb-[3px]">
              {row.map((val, c) => {
                const key = `${r},${c}`;
                const isHL = hlCell && hlCell[0] === r && hlCell[1] === c;
                const isDep = hlCells.has(key);
                const isTrace = traceSet.has(key);
                const bg = isHL
                  ? accentColor
                  : isTrace
                  ? "oklch(0.82 0.18 85 / 60%)"
                  : isDep
                  ? `${accentColor}30`
                  : "oklch(1 0 0 / 5%)";
                const textColor = isHL ? "oklch(0.08 0.02 265)" : isTrace ? "oklch(0.08 0.02 265)" : "oklch(0.80 0.01 255)";
                return (
                  <motion.div key={c} animate={{ backgroundColor: bg, scale: isHL ? 1.15 : 1 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center rounded font-mono text-[11px] font-medium"
                    style={{ minWidth: 36, height: 36, color: textColor, border: `1px solid ${isHL ? accentColor : isDep ? `${accentColor}40` : "oklch(1 0 0 / 8%)"}`, boxShadow: isHL ? `0 0 8px ${accentColor}50` : "none" }}>
                    {val === -1 ? "∞" : val}
                  </motion.div>
                );
              })}
              {(table[r]?.length ?? 0) > MAX_COLS && (
                <div className="flex items-center px-2 text-[10px]" style={{ color: "oklch(0.40 0.04 255)" }}>
                  +{table[r].length - MAX_COLS}
                </div>
              )}
            </div>
          ))}
          {table.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "oklch(0.40 0.04 255)" }}>Press Play to start filling the table</p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "oklch(0.50 0.04 255)" }}>
        {[
          { color: accentColor, label: "Current cell" },
          { color: `${accentColor}30`, label: "Dependencies" },
          { color: "oklch(0.82 0.18 85 / 60%)", label: "Traceback path" },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />{l.label}
          </span>
        ))}
      </div>

      <Controls playing={playing} onPlay={play} onPause={pause} onReset={reset}
        onStepBack={stepBack} onStepFwd={stepFwd} speed={speed} setSpeed={setSpeed}
        index={index} total={total} />
      </div>
      <aside className="min-w-0">
        <PythonCodePanel section="dp" algo={algo} accentColor={ALGO_COLOR[algo]} activeLines={inferLines("dp", algo, current)} />
      </aside>
    </div>
  );
}
