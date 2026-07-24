import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { buildBST, flatten, TRAVERSALS, type TraversalName } from "../lib/algorithms/tree";
import { usePlayer } from "../lib/usePlayer";

export const Route = createFileRoute("/tree")({
  head: () => ({
    meta: [
      { title: "Tree Traversal — AlgoViz" },
      { name: "description", content: "BFS and DFS (in/pre/post) on a binary search tree." },
    ],
  }),
  component: TreePage,
});

const randomVals = (n: number) => {
  const set = new Set<number>();
  while (set.size < n) set.add(Math.floor(Math.random() * 99) + 1);
  return [...set];
};

const ALGO_COLOR: Record<TraversalName, string> = {
  BFS: "oklch(0.72 0.19 255)",
  "DFS-In": "oklch(0.75 0.18 162)",
  "DFS-Pre": "oklch(0.82 0.18 85)",
  "DFS-Post": "oklch(0.75 0.18 310)",
};

function TreePage() {
  const [algo, setAlgo] = useState<TraversalName>("BFS");
  const [speed, setSpeed] = useState(70);
  const [values, setValues] = useState<number[]>(() => [50, 30, 70, 20, 40, 60, 80, 35, 65]);
  const [custom, setCustom] = useState("");

  const root = useMemo(() => buildBST(values), [values]);
  const nodes = useMemo(() => flatten(root), [root]);
  const maxX = Math.max(...nodes.map((n) => n.x), 1);
  const maxY = Math.max(...nodes.map((n) => n.y), 1);

  const gen = useCallback(() => TRAVERSALS[algo](root), [algo, root]);
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } =
    usePlayer(gen, speed);

  const W = 700, H = 340, padX = 32, padY = 36;
  const xOf = (n: { x: number }) => padX + (n.x / Math.max(maxX, 1)) * (W - padX * 2);
  const yOf = (n: { y: number }) => padY + (n.y / Math.max(maxY, 1)) * (H - padY * 2);

  const visited = current?.visited ?? [];
  const visiting = current?.visiting;

  const edges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  const collect = (n?: typeof root) => {
    if (!n) return;
    if (n.left) { edges.push({ x1: xOf(n), y1: yOf(n), x2: xOf(n.left), y2: yOf(n.left), key: `${n.id}-${n.left.id}` }); collect(n.left); }
    if (n.right) { edges.push({ x1: xOf(n), y1: yOf(n), x2: xOf(n.right), y2: yOf(n.right), key: `${n.id}-${n.right.id}` }); collect(n.right); }
  };
  collect(root);

  const applyCustom = () => {
    const parts = custom.split(/[,\s]+/).map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    if (parts.length >= 1) setValues(parts.slice(0, 20));
  };

  const accentColor = ALGO_COLOR[algo];

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg" style={{ color: accentColor }}>⋔</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Tree Traversals</h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>Binary search tree built from your input.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TRAVERSALS) as TraversalName[]).map((name) => (
            <button
              key={name}
              onClick={() => setAlgo(name)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105"
              style={{
                background: algo === name ? ALGO_COLOR[name] : "oklch(1 0 0 / 6%)",
                color: algo === name ? "oklch(0.08 0.02 265)" : "oklch(0.65 0.04 255)",
                border: `1px solid ${algo === name ? ALGO_COLOR[name] : "oklch(1 0 0 / 10%)"}`,
                boxShadow: algo === name ? `0 0 12px ${ALGO_COLOR[name]}40` : "none",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </header>

      {/* Tree viz */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "oklch(0.40 0.04 255)" }}>binary search tree</span>
          <span className="text-[10px] font-mono" style={{ color: "oklch(0.40 0.04 255)" }}>{nodes.length} nodes</span>
        </div>
        <div className="overflow-x-auto p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 380, minWidth: 300 }}>
            {/* Edge lines */}
            {edges.map((e) => (
              <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="oklch(1 0 0 / 10%)" strokeWidth={1.5} />
            ))}
            {/* Nodes */}
            {nodes.map((n) => {
              const isVisited = visited.includes(n.id);
              const isVisiting = visiting === n.id;
              const fill = isVisiting
                ? accentColor
                : isVisited
                ? "oklch(0.75 0.18 162 / 80%)"
                : "oklch(1 0 0 / 7%)";
              const ringColor = isVisiting ? accentColor : isVisited ? "oklch(0.75 0.18 162)" : "oklch(1 0 0 / 15%)";
              const textColor = (isVisiting || isVisited) ? "oklch(0.08 0.02 265)" : "oklch(0.80 0.01 255)";
              return (
                <motion.g
                  key={n.id}
                  animate={{ scale: isVisiting ? 1.2 : 1 }}
                  style={{ originX: `${xOf(n)}px`, originY: `${yOf(n)}px` }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  {isVisiting && (
                    <>
                      <circle cx={xOf(n)} cy={yOf(n)} r={26} fill={`${accentColor}20`} />
                      <motion.circle
                        cx={xOf(n)} cy={yOf(n)}
                        fill="none" stroke={accentColor} strokeWidth={1.5}
                        initial={{ r: 18, opacity: 0.6 }}
                        animate={{ r: 36, opacity: 0 }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
                      />
                    </>
                  )}
                  <circle
                    cx={xOf(n)}
                    cy={yOf(n)}
                    r={18}
                    fill={fill}
                    stroke={ringColor}
                    strokeWidth={1.5}
                    style={{ filter: isVisiting ? `drop-shadow(0 0 8px ${accentColor}60)` : "none" }}
                  />
                  <text
                    x={xOf(n)}
                    y={yOf(n) + 4.5}
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="'JetBrains Mono', monospace"
                    fontWeight="600"
                    fill={textColor}
                  >
                    {n.value}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>
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

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Visit order */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.50 0.04 255)" }}>Visit Order</label>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {visited.length === 0 && (
              <span className="text-xs" style={{ color: "oklch(0.40 0.04 255)" }}>Press play to begin…</span>
            )}
            {visited.map((id, i) => {
              const node = nodes.find((n) => n.id === id);
              return (
                <motion.span
                  key={`${id}-${i}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold"
                  style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}
                >
                  {node?.value}
                </motion.span>
              );
            })}
          </div>
        </div>

        {/* Build tree */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.50 0.04 255)" }}>Build Tree</label>
          <div className="flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="50, 30, 70, 20, 40"
              className="flex-1 h-8 px-3 rounded-lg text-xs font-mono"
              style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.85 0.01 255)" }}
            />
            <button onClick={applyCustom} className="h-8 px-3 rounded-lg text-xs font-medium" style={{ background: "oklch(1 0 0 / 8%)", color: "oklch(0.75 0.04 255)", border: "1px solid oklch(1 0 0 / 12%)" }}>Apply</button>
            <button
              onClick={() => setValues(randomVals(9))}
              className="h-8 px-3 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: accentColor, color: "oklch(0.08 0.02 265)", boxShadow: `0 0 12px ${accentColor}30` }}
            >
              ↻
            </button>
          </div>
        </div>
      </div>
      </div>
      <aside className="min-w-0">
        <PythonCodePanel section="tree" algo={algo} accentColor={ALGO_COLOR[algo]} activeLines={inferLines("tree", algo, current)} />
      </aside>
    </div>
  );
}
