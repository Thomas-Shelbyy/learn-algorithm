import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { PATHFINDERS, type Grid, type PathName } from "../lib/algorithms/pathfinding";
import { usePlayer } from "../lib/usePlayer";

export const Route = createFileRoute("/pathfinding")({
  head: () => ({
    meta: [
      { title: "Pathfinding — AlgoViz" },
      { name: "description", content: "BFS, Dijkstra, and A* on an editable grid." },
    ],
  }),
  component: PathfindingPage,
});

const ROWS = 18;
const COLS = 32;
const k = (r: number, c: number) => `${r},${c}`;

const emptyGrid = (): Grid =>
  Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));

const randomWalls = (g: Grid, density = 0.25): Grid =>
  g.map((row) => row.map(() => (Math.random() < density ? 1 : 0)));

type Tool = "wall" | "start" | "end" | "erase";

const ALGO_COLOR: Record<PathName, string> = {
  BFS: "oklch(0.72 0.19 255)",
  Dijkstra: "oklch(0.82 0.18 85)",
  "A*": "oklch(0.68 0.22 22)",
};

function PathfindingPage() {
  const [algo, setAlgo] = useState<PathName>("A*");
  const [speed, setSpeed] = useState(85);
  const [grid, setGrid] = useState<Grid>(() => emptyGrid());
  const [start, setStart] = useState({ r: 4, c: 4 });
  const [end, setEnd] = useState({ r: 12, c: 26 });
  const [tool, setTool] = useState<Tool>("wall");
  const [drag, setDrag] = useState(false);

  const gen = useCallback(
    () => PATHFINDERS[algo](grid, start, end),
    [algo, grid, start, end],
  );
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } =
    usePlayer(gen, speed);

  const visited = useMemo(() => new Set(current?.visited ?? []), [current]);
  const frontier = useMemo(() => new Set(current?.frontier ?? []), [current]);
  const path = useMemo(() => new Set(current?.path ?? []), [current]);
  const cur = current?.current;

  const apply = (r: number, c: number) => {
    if (tool === "start") return setStart({ r, c });
    if (tool === "end") return setEnd({ r, c });
    setGrid((g) =>
      g.map((row, ri) =>
        ri === r ? row.map((v, ci) => (ci === c ? (tool === "erase" ? 0 : 1) : v)) : row,
      ),
    );
  };

  const accentColor = ALGO_COLOR[algo];

  const toolConfig: { id: Tool; label: string; color: string }[] = [
    { id: "wall", label: "Wall", color: "oklch(0.65 0.04 255)" },
    { id: "erase", label: "Erase", color: "oklch(0.55 0.04 255)" },
    { id: "start", label: "Start", color: "oklch(0.75 0.18 162)" },
    { id: "end", label: "End", color: "oklch(0.68 0.22 22)" },
  ];

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg" style={{ color: accentColor }}>◈</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Pathfinding</h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            Click cells to draw walls. Drag to paint.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PATHFINDERS) as PathName[]).map((name) => (
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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl p-3" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <span className="text-[10px] font-medium uppercase tracking-wider mr-1" style={{ color: "oklch(0.45 0.04 255)" }}>Tool:</span>
        {toolConfig.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tool === t.id ? `${t.color}20` : "oklch(1 0 0 / 4%)",
              color: tool === t.id ? t.color : "oklch(0.55 0.04 255)",
              border: `1px solid ${tool === t.id ? `${t.color}40` : "oklch(1 0 0 / 8%)"}`,
            }}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setGrid(randomWalls(emptyGrid()))}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(0.60 0.04 255)", border: "1px solid oklch(1 0 0 / 8%)" }}
          >
            Random Walls
          </button>
          <button
            onClick={() => setGrid(emptyGrid())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(0.60 0.04 255)", border: "1px solid oklch(1 0 0 / 8%)" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
        onMouseLeave={() => setDrag(false)}
        onMouseUp={() => setDrag(false)}
      >
        <div className="p-2 overflow-x-auto">
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, minWidth: COLS * 18 }}
          >
            {grid.map((row, r) =>
              row.map((v, c) => {
                const key = k(r, c);
                const isStart = start.r === r && start.c === c;
                const isEnd = end.r === r && end.c === c;
                const isWall = v === 1;
                const inPath = path.has(key);
                const isCur = cur === key;
                const isFront = frontier.has(key);
                const isVisited = visited.has(key);

                let bg = "oklch(1 0 0 / 4%)";
                if (isVisited) bg = "oklch(0.72 0.19 255 / 18%)";
                if (isFront) bg = "oklch(0.72 0.19 255 / 38%)";
                if (inPath) bg = "oklch(0.82 0.18 85 / 80%)";
                if (isCur) bg = accentColor;
                if (isWall) bg = "oklch(1 0 0 / 15%)";
                if (isStart) bg = "oklch(0.75 0.18 162)";
                if (isEnd) bg = "oklch(0.68 0.22 22)";

                const reveal = isVisited || isFront || inPath;

                return (
                  <motion.div
                    key={key}
                    initial={false}
                    animate={{
                      backgroundColor: bg,
                      scale: isCur ? 1.18 : inPath ? 1.06 : isWall ? 0.9 : reveal ? 1 : 1,
                      borderRadius: isStart || isEnd ? "5px" : inPath ? "3px" : "2px",
                    }}
                    transition={
                      isCur
                        ? { type: "spring", stiffness: 500, damping: 18 }
                        : inPath
                          ? { type: "spring", stiffness: 420, damping: 20 }
                          : { duration: 0.18 }
                    }
                    onMouseDown={() => { setDrag(true); apply(r, c); }}
                    onMouseEnter={() => drag && apply(r, c)}
                    className="aspect-square cursor-pointer"
                    style={{
                      boxShadow: isCur
                        ? `0 0 10px ${accentColor}`
                        : inPath
                          ? "0 0 8px oklch(0.82 0.18 85 / 60%)"
                          : isFront
                            ? "0 0 5px oklch(0.72 0.19 255 / 45%)"
                            : "none",
                    }}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "oklch(0.50 0.04 255)" }}>
        {[
          { color: "oklch(0.75 0.18 162)", label: "Start" },
          { color: "oklch(0.68 0.22 22)", label: "End" },
          { color: "oklch(1 0 0 / 15%)", label: "Wall" },
          { color: "oklch(0.72 0.19 255 / 40%)", label: "Visited" },
          { color: "oklch(0.72 0.19 255 / 60%)", label: "Frontier" },
          { color: "oklch(0.82 0.18 85 / 70%)", label: "Path" },
          { color: accentColor, label: "Current" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color, border: "1px solid oklch(1 0 0 / 10%)" }} />
            {l.label}
          </span>
        ))}
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
        <PythonCodePanel section="pathfinding" algo={algo} accentColor={ALGO_COLOR[algo]} activeLines={inferLines("pathfinding", algo, current)} />
      </aside>
    </div>
  );
}
