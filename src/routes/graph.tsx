import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { GRAPH_ALGOS, SAMPLE_GRAPHS, type GraphAlgoName, type Graph } from "../lib/algorithms/graph";
import { usePlayer } from "../lib/usePlayer";

export const Route = createFileRoute("/graph")({
  head: () => ({ meta: [{ title: "Graph — AlgoViz" }] }),
  component: GraphPage,
});

const ALGO_COLOR: Record<GraphAlgoName, string> = {
  "DFS": "oklch(0.72 0.19 255)",
  "BFS": "oklch(0.75 0.18 162)",
  "Topological Sort": "oklch(0.82 0.18 85)",
  "Cycle Detection": "oklch(0.68 0.22 22)",
  "Dijkstra": "oklch(0.75 0.18 310)",
  "Bellman-Ford": "oklch(0.68 0.22 22)",
  "Floyd-Warshall": "oklch(0.72 0.22 180)",
  "Prim MST": "oklch(0.72 0.22 180)",
  "Kruskal MST": "oklch(0.82 0.22 60)",
};

const W = 620, H = 310;

function GraphPage() {
  const [algo, setAlgo] = useState<GraphAlgoName>("BFS");
  const [speed, setSpeed] = useState(60);
  const [graphKey, setGraphKey] = useState("Tree (5 levels)");
  useEffect(() => {
    if (algo === "BFS" || algo === "DFS") setGraphKey("Tree (5 levels)");
    else if (graphKey === "Tree (5 levels)") setGraphKey("Simple (6 nodes)");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algo]);
  const graph: Graph = SAMPLE_GRAPHS[graphKey];

  const gen = useCallback(() => GRAPH_ALGOS[algo](graph as any), [algo, graph]);
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } =
    usePlayer(gen, speed);

  const visited = new Set(current?.visited ?? []);
  const visiting = current?.visiting;
  const highlighted = new Set((current?.highlight ?? []).map(([a,b]: [number,number]) => `${a}-${b}`));
  const accentColor = ALGO_COLOR[algo];

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg" style={{ color: accentColor }}>⬡</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Graph Algorithms</h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>Traversal, shortest paths, MST and more.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(GRAPH_ALGOS) as GraphAlgoName[]).map((name) => (
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

      {/* Graph selector */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(SAMPLE_GRAPHS).map(k => (
          <button key={k} onClick={() => setGraphKey(k)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: graphKey === k ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
              color: graphKey === k ? "oklch(0.90 0.01 255)" : "oklch(0.55 0.04 255)",
              border: `1px solid ${graphKey === k ? "oklch(1 0 0 / 18%)" : "oklch(1 0 0 / 8%)"}`,
            }}>{k}</button>
        ))}
      </div>

      {/* SVG viz */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "oklch(0.40 0.04 255)" }}>graph</span>
          {current?.message && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={current.message}
              className="text-[11px] font-mono px-3 py-1 rounded-full"
              style={{ background: `${accentColor}18`, color: accentColor, maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {current.message}
            </motion.span>
          )}
        </div>
        <div className="overflow-x-auto p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 340, minWidth: 300 }}>
            {/* Edges */}
            {graph.edges.map((e, i) => {
              const from = graph.nodes.find(n => n.id === e.from)!;
              const to = graph.nodes.find(n => n.id === e.to)!;
              const isHL = highlighted.has(`${e.from}-${e.to}`) || highlighted.has(`${e.to}-${e.from}`);
              const w = e.weight;
              const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
              return (
                <g key={i}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isHL ? "oklch(0.82 0.18 85)" : "oklch(1 0 0 / 12%)"}
                    strokeWidth={isHL ? 2.5 : 1.5}
                    style={{ filter: isHL ? "drop-shadow(0 0 4px oklch(0.82 0.18 85 / 60%))" : "none" }} />
                  {graph.directed && (
                    <polygon points="0,-4 8,0 0,4"
                      fill={isHL ? "oklch(0.82 0.18 85)" : "oklch(1 0 0 / 20%)"}
                      transform={`translate(${to.x},${to.y}) rotate(${Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI}) translate(-20,0)`} />
                  )}
                  {w !== undefined && (
                    <text x={mx} y={my-6} textAnchor="middle" fontSize={9} fill="oklch(0.55 0.04 255)" fontFamily="'JetBrains Mono',monospace">{w}</text>
                  )}
                </g>
              );
            })}
            {/* Nodes */}
            {graph.nodes.map(n => {
              const isVisited = visited.has(n.id);
              const isVisiting = visiting === n.id;
              const fill = isVisiting ? accentColor : isVisited ? "oklch(0.75 0.18 162 / 70%)" : "oklch(1 0 0 / 7%)";
              const ring = isVisiting ? accentColor : isVisited ? "oklch(0.75 0.18 162)" : "oklch(1 0 0 / 18%)";
              return (
                <motion.g key={n.id} animate={{ scale: isVisiting ? 1.2 : 1 }}
                  style={{ originX: `${n.x}px`, originY: `${n.y}px` }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                  {isVisiting && (
                    <>
                      <circle cx={n.x} cy={n.y} r={28} fill={`${accentColor}15`} />
                      <motion.circle
                        cx={n.x} cy={n.y}
                        fill="none" stroke={accentColor} strokeWidth={1.5}
                        initial={{ r: 20, opacity: 0.6 }}
                        animate={{ r: 40, opacity: 0 }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
                      />
                    </>
                  )}
                  <circle cx={n.x} cy={n.y} r={20} fill={fill} stroke={ring} strokeWidth={1.5}
                    style={{ filter: isVisiting ? `drop-shadow(0 0 8px ${accentColor}50)` : "none" }} />
                  <text x={n.x} y={n.y+5} textAnchor="middle" fontSize={13} fontWeight="700"
                    fontFamily="'Space Grotesk',sans-serif"
                    fill={(isVisiting || isVisited) ? "oklch(0.08 0.02 265)" : "oklch(0.80 0.01 255)"}>
                    {n.label}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Visit order */}
      {(current?.order ?? []).length > 0 && (
        <div className="rounded-2xl p-3" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <span className="text-[10px] font-medium uppercase tracking-wider mr-3" style={{ color: "oklch(0.50 0.04 255)" }}>Order</span>
          {(current!.order!).map((id, i) => {
            const node = graph.nodes.find(n => n.id === id);
            return (
              <motion.span key={i} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold mr-1"
                style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                {node?.label ?? id}
              </motion.span>
            );
          })}
        </div>
      )}

      <Controls playing={playing} onPlay={play} onPause={pause} onReset={reset}
        onStepBack={stepBack} onStepFwd={stepFwd} speed={speed} setSpeed={setSpeed}
        index={index} total={total} />
      </div>
      <aside className="min-w-0">
        <PythonCodePanel section="graph" algo={algo} accentColor={ALGO_COLOR[algo]} activeLines={inferLines("graph", algo, current)} />
      </aside>
    </div>
  );
}
