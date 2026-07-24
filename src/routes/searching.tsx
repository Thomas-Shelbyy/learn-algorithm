import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { SEARCHERS, type SearchName } from "../lib/algorithms/searching";
import { usePlayer } from "../lib/usePlayer";

export const Route = createFileRoute("/searching")({
  head: () => ({ meta: [{ title: "Searching — AlgoViz" }] }),
  component: SearchingPage,
});

const randomArray = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 99) + 1);

const ALGO_COLOR: Record<SearchName, string> = {
  Linear: "oklch(0.72 0.19 255)",
  Binary: "oklch(0.75 0.18 162)",
  Jump: "oklch(0.82 0.18 85)",
  Interpolation: "oklch(0.68 0.22 22)",
  Exponential: "oklch(0.75 0.18 310)",
  Ternary: "oklch(0.72 0.22 180)",
  Fibonacci: "oklch(0.70 0.20 300)",
};

const NEEDS_SORT = new Set(["Binary", "Jump", "Interpolation", "Exponential", "Ternary", "Fibonacci"]);

function SearchingPage() {
  const [algo, setAlgo] = useState<SearchName>("Binary");
  const [size, setSize] = useState(20);
  const [speed, setSpeed] = useState(70);
  const [array, setArray] = useState<number[]>(() => randomArray(20).sort((a,b)=>a-b));
  const [target, setTarget] = useState(() => array[Math.floor(array.length/2)]);
  const [custom, setCustom] = useState("");

  const gen = useCallback(() => SEARCHERS[algo](array, target), [algo, array, target]);
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } = usePlayer(gen, speed);

  const resetData = (n = size, needSort = NEEDS_SORT.has(algo)) => {
    const a = randomArray(n);
    if (needSort) a.sort((x,y)=>x-y);
    setArray(a); setTarget(a[Math.floor(a.length/2)]);
  };

  const applyCustom = () => {
    const parts = custom.split(/[,\s]+/).map(s=>Number(s.trim())).filter(n=>Number.isFinite(n));
    if (parts.length >= 2) {
      const a = NEEDS_SORT.has(algo) ? [...parts].sort((x,y)=>x-y) : parts;
      setArray(a); setSize(a.length);
    }
  };

  const color = ALGO_COLOR[algo];

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg" style={{ color }}>⌕</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Searching</h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            Watch the pointer narrow in on the target.
            {NEEDS_SORT.has(algo) && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full" style={{ background: "oklch(0.82 0.18 85 / 15%)", color: "oklch(0.82 0.18 85)" }}>Requires sorted array</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SEARCHERS) as SearchName[]).map((name) => (
            <button key={name}
              onClick={() => { setAlgo(name); if (NEEDS_SORT.has(name)) setArray(a=>[...a].sort((x,y)=>x-y)); }}
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

      <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "oklch(0.40 0.04 255)" }}>array — target: {target}</span>
          {current?.found !== undefined && (
            <motion.span initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background:"oklch(0.75 0.18 162 / 15%)", color:"oklch(0.75 0.18 162)" }}>
              Found at index {current.found}
            </motion.span>
          )}
        </div>
        <div className="p-3 sm:p-4 overflow-x-auto">
          <div className="flex gap-1.5 min-w-fit pb-1">
            {array.map((v, i) => {
              const isCheck = current?.checking === i;
              const isFound = current?.found === i;
              const isElim = current?.eliminated?.includes(i);
              const inRange = current?.range && i >= current.range[0] && i <= current.range[1];
              const isHL = current?.highlight?.includes(i);
              const bg = isFound ? "oklch(0.75 0.18 162 / 25%)" : isCheck || isHL ? `${color}25` : isElim ? "oklch(1 0 0 / 3%)" : inRange ? "oklch(1 0 0 / 8%)" : "oklch(1 0 0 / 5%)";
              const borderColor = isFound ? "oklch(0.75 0.18 162)" : (isCheck||isHL) ? color : "oklch(1 0 0 / 10%)";
              return (
                <div key={i} className="relative flex flex-col items-center gap-1">
                  <span className="text-[8px] font-mono" style={{ color:"oklch(0.40 0.04 255)" }}>{i}</span>
                  <motion.div
                    animate={{ scale: (isCheck||isFound||isHL) ? 1.12 : inRange ? 1 : 0.94, y: isCheck ? -4 : 0, opacity: isElim ? 0.45 : 1 }}
                    transition={{ type:"spring", stiffness:420, damping:24 }}
                    className="relative flex h-10 w-9 sm:h-12 sm:w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs sm:text-sm font-medium overflow-visible"
                    style={{ background:bg, border:`1px solid ${borderColor}`, color:isElim?"oklch(0.40 0.04 255)":"oklch(0.90 0.01 255)", boxShadow:(isCheck||isFound||isHL)?`0 0 14px ${borderColor}66`:"none" }}>
                    {/* ripple pulse when checked/found */}
                    {(isCheck || isFound) && (
                      <span
                        key={`${i}-${current?.checking}-${current?.found}`}
                        className="viz-ripple pointer-events-none absolute inset-0 rounded-lg"
                        style={{ border: `2px solid ${isFound ? "oklch(0.75 0.18 162)" : color}` }}
                      />
                    )}
                    {v}
                    {isCheck && <span className="absolute -top-4 text-[8px] font-bold" style={{ color }}>↓</span>}
                    {isFound && <span className="absolute -top-4 text-[8px] font-bold" style={{ color:"oklch(0.75 0.18 162)" }}>✓</span>}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px]" style={{ color:"oklch(0.50 0.04 255)" }}>
        {[{color, label:"Checking"},{color:"oklch(0.75 0.18 162)",label:"Found"},{color:"oklch(1 0 0 / 8%)",label:"In Range"},{color:"oklch(1 0 0 / 3%)",label:"Eliminated"}].map(l=>(
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background:l.color, border:"1px solid oklch(1 0 0 / 15%)" }}/>{l.label}
          </span>
        ))}
      </div>

      <Controls playing={playing} onPlay={play} onPause={pause} onReset={reset}
        onStepBack={stepBack} onStepFwd={stepFwd} speed={speed} setSpeed={setSpeed}
        index={index} total={total} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl p-4 space-y-3" style={{ background:"oklch(0.12 0.025 265)",border:"1px solid oklch(1 0 0 / 8%)" }}>
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color:"oklch(0.50 0.04 255)" }}>Size — {size}</label>
          <input type="range" min={5} max={40} value={size} onChange={e=>{const n=Number(e.target.value);setSize(n);resetData(n);}} className="w-full"/>
          <button onClick={()=>resetData()} className="h-8 px-4 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background:color, color:"oklch(0.08 0.02 265)", boxShadow:`0 0 12px ${color}30` }}>↻ New Data</button>
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background:"oklch(0.12 0.025 265)",border:"1px solid oklch(1 0 0 / 8%)" }}>
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color:"oklch(0.50 0.04 255)" }}>Target</label>
          <input type="number" value={target} onChange={e=>setTarget(Number(e.target.value))}
            className="w-full h-8 px-3 rounded-lg text-xs font-mono"
            style={{ background:"oklch(1 0 0 / 5%)",border:"1px solid oklch(1 0 0 / 10%)",color:"oklch(0.85 0.01 255)" }}/>
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background:"oklch(0.12 0.025 265)",border:"1px solid oklch(1 0 0 / 8%)" }}>
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color:"oklch(0.50 0.04 255)" }}>Custom</label>
          <div className="flex gap-2">
            <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="3, 8, 12, 21"
              className="flex-1 h-8 px-3 rounded-lg text-xs font-mono"
              style={{ background:"oklch(1 0 0 / 5%)",border:"1px solid oklch(1 0 0 / 10%)",color:"oklch(0.85 0.01 255)" }}/>
            <button onClick={applyCustom} className="h-8 px-3 rounded-lg text-xs font-medium"
              style={{ background:"oklch(1 0 0 / 8%)",color:"oklch(0.75 0.04 255)",border:"1px solid oklch(1 0 0 / 12%)" }}>Apply</button>
          </div>
        </div>
      </div>
      </div>
      <aside className="min-w-0">
        <PythonCodePanel section="searching" algo={algo} accentColor={ALGO_COLOR[algo]} activeLines={inferLines("searching", algo, current)} />
      </aside>
    </div>
  );
}
