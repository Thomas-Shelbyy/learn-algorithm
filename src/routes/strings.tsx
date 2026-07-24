import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { inferLines } from "../lib/algorithms/lineMaps";
import { STRING_ALGOS, type StringAlgoName } from "../lib/algorithms/strings";
import { usePlayer } from "../lib/usePlayer";

export const Route = createFileRoute("/strings")({
  head: () => ({ meta: [{ title: "String Algorithms — AlgoViz" }] }),
  component: StringsPage,
});

const ALGO_COLOR: Record<StringAlgoName, string> = {
  "Naive": "oklch(0.72 0.19 255)",
  "KMP": "oklch(0.75 0.18 162)",
  "Rabin-Karp": "oklch(0.82 0.18 85)",
  "Z-Algorithm": "oklch(0.68 0.22 22)",
  "Boyer-Moore": "oklch(0.75 0.18 310)",
  "Longest Palindrome": "oklch(0.72 0.20 30)",
};

const PRESETS = [
  { text: "AABAACAADAABAABA", pattern: "AABA" },
  { text: "ABCABCABCABC", pattern: "ABCABC" },
  { text: "HELLO WORLD", pattern: "WORLD" },
  { text: "ATATATATAT", pattern: "ATAT" },
];

function StringsPage() {
  const [algo, setAlgo] = useState<StringAlgoName>("KMP");
  const [speed, setSpeed] = useState(55);
  const [text, setText] = useState("AABAACAADAABAABA");
  const [pattern, setPattern] = useState("AABA");

  const gen = useCallback(() => STRING_ALGOS[algo](text, pattern), [algo, text, pattern]);
  const { current, index, total, play, pause, reset, stepFwd, stepBack, playing } =
    usePlayer(gen, speed);

  const accentColor = ALGO_COLOR[algo];
  const checking = current?.i;
  const matches = new Set(current?.matches ?? []);
  const highlight = new Set(current?.highlight ?? []);

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-4 min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg" style={{ color: accentColor }}>Σ</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>String Algorithms</h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>Pattern matching — visualize how each algorithm scans the text.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(STRING_ALGOS) as StringAlgoName[]).map((name) => (
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
          className="rounded-xl px-4 py-2.5 text-sm font-mono truncate"
          style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}25`, color: accentColor }}>
          {current.message}
        </motion.div>
      )}

      {/* Text viz */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "oklch(0.40 0.04 255)" }}>text</span>
        </div>
        <div className="overflow-x-auto p-3">
          <div className="flex gap-[3px] min-w-fit pb-1">
            {text.split("").map((ch, i) => {
              // find if i is start of a match
              const isMatch = [...matches].some(start => i >= start && i < start + pattern.length);
              const isActive = highlight.has(i) || checking === i;
              const bg = isMatch
                ? "oklch(0.75 0.18 162 / 40%)"
                : isActive
                ? `${accentColor}35`
                : "oklch(1 0 0 / 5%)";
              const border = isMatch
                ? "oklch(0.75 0.18 162)"
                : isActive
                ? accentColor
                : "oklch(1 0 0 / 10%)";
              return (
                <motion.div key={i} animate={{ backgroundColor: bg, scale: isActive ? 1.1 : 1 }}
                  transition={{ duration: 0.12 }}
                  className="relative flex flex-col items-center gap-0.5">
                  <span className="text-[8px] font-mono" style={{ color: "oklch(0.38 0.04 255)" }}>{i}</span>
                  <div className="flex h-9 w-8 items-center justify-center rounded-lg font-mono text-sm font-semibold"
                    style={{ border: `1px solid ${border}`, color: isMatch ? "oklch(0.08 0.02 265)" : "oklch(0.88 0.01 255)", boxShadow: isActive ? `0 0 8px ${accentColor}50` : "none" }}>
                    {ch}
                  </div>
                  {isMatch && <span className="absolute -bottom-1 h-[2px] w-full rounded-full" style={{ background: "oklch(0.75 0.18 162)" }} />}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Pattern row */}
        <div className="px-4 pb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest mb-2 block" style={{ color: "oklch(0.40 0.04 255)" }}>pattern</span>
          <div className="flex gap-[3px]">
            {pattern.split("").map((ch, j) => {
              const isJ = current?.j !== undefined && j === current.j;
              return (
                <div key={j}
                  className="flex h-9 w-8 items-center justify-center rounded-lg font-mono text-sm font-semibold"
                  style={{
                    background: isJ ? `${accentColor}30` : "oklch(1 0 0 / 7%)",
                    border: `1px solid ${isJ ? accentColor : "oklch(1 0 0 / 12%)"}`,
                    color: "oklch(0.88 0.01 255)",
                  }}>{ch}</div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Failure table (KMP / Z) */}
      {current?.table && current.table.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <span className="text-[10px] font-medium uppercase tracking-wider block mb-2" style={{ color: "oklch(0.50 0.04 255)" }}>
            {algo === "KMP" ? "Failure Table" : "Z-Array"}
          </span>
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {current.table.slice(0, 40).map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[8px] font-mono" style={{ color: "oklch(0.38 0.04 255)" }}>{i}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded font-mono text-xs font-semibold"
                  style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.80 0.01 255)" }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches */}
      {matches.size > 0 && (
        <div className="rounded-2xl p-3" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <span className="text-[10px] font-medium uppercase tracking-wider mr-3" style={{ color: "oklch(0.50 0.04 255)" }}>
            Matches ({matches.size})
          </span>
          {[...matches].map((start, i) => (
            <motion.span key={i} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold mr-1"
              style={{ background: "oklch(0.75 0.18 162 / 18%)", color: "oklch(0.75 0.18 162)", border: "1px solid oklch(0.75 0.18 162 / 30%)" }}>
              @{start}
            </motion.span>
          ))}
        </div>
      )}

      <Controls playing={playing} onPlay={play} onPause={pause} onReset={reset}
        onStepBack={stepBack} onStepFwd={stepFwd} speed={speed} setSpeed={setSpeed}
        index={index} total={total} />

      {/* Input */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl p-4 space-y-2" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.50 0.04 255)" }}>Text</label>
          <input value={text} onChange={e => setText(e.target.value.toUpperCase())} maxLength={60}
            className="w-full h-9 px-3 rounded-lg text-xs font-mono"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.85 0.01 255)" }} />
        </div>
        <div className="rounded-2xl p-4 space-y-2" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.50 0.04 255)" }}>Pattern</label>
          <input value={pattern} onChange={e => setPattern(e.target.value.toUpperCase())} maxLength={20}
            className="w-full h-9 px-3 rounded-lg text-xs font-mono"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.85 0.01 255)" }} />
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <span className="text-xs self-center" style={{ color: "oklch(0.50 0.04 255)" }}>Presets:</span>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => { setText(p.text); setPattern(p.pattern); }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(0.60 0.04 255)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              {p.pattern}
            </button>
          ))}
        </div>
      </div>
      </div>
      <aside className="min-w-0">
        <PythonCodePanel section="strings" algo={algo} accentColor={ALGO_COLOR[algo]} activeLines={inferLines("strings", algo, current)} />
      </aside>
    </div>
  );
}
