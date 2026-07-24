import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── 2D Hero: Quick Sort + Binary Search ─────────────────────────────────────
// A crisp, physics-driven 2D visualization that replaces the old WebGL hero for
// these two algorithms. Bars/tiles animate with springs; a live pointer tracks
// the probe; the timeline is scrubbable and auto-loops.

export type HeroMode = "Quick Sort" | "Binary Search";

type SortStep =
  | { type: "compare"; i: number; j: number }
  | { type: "swap"; i: number; j: number }
  | { type: "sorted"; i: number };

type SearchStep =
  | { type: "range"; lo: number; hi: number }
  | { type: "probe"; mid: number }
  | { type: "found"; mid: number }
  | { type: "miss" };

// ── Palette (matches site tokens) ──
const C = {
  base: "#5a7cff",
  baseSoft: "#3a52b8",
  compare: "#ffd34d",
  swap: "#ff6b5e",
  sorted: "#3ddc97",
  range: "#5a7cff",
  probe: "#ffd34d",
  found: "#3ddc97",
  dim: "#1a2240",
  text: "#e7ecff",
};

const BAR_COUNT = 18;
const BS_COUNT = 15;

// ── Step generators ──
function genQuickSteps(input: number[]): SortStep[] {
  const a = [...input];
  const steps: SortStep[] = [];
  const cmp = (i: number, j: number) => steps.push({ type: "compare", i, j });
  const swp = (i: number, j: number) => {
    [a[i], a[j]] = [a[j], a[i]];
    steps.push({ type: "swap", i, j });
  };
  const qs = (lo: number, hi: number) => {
    if (lo >= hi) {
      if (lo === hi) steps.push({ type: "sorted", i: lo });
      return;
    }
    const pivot = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      cmp(j, hi);
      if (a[j] <= pivot) {
        i++;
        if (i !== j) swp(i, j);
      }
    }
    if (i + 1 !== hi) swp(i + 1, hi);
    steps.push({ type: "sorted", i: i + 1 });
    qs(lo, i);
    qs(i + 2, hi);
  };
  qs(0, a.length - 1);
  return steps;
}

function genBinarySearchSteps(sorted: number[], target: number): SearchStep[] {
  const steps: SearchStep[] = [];
  let lo = 0,
    hi = sorted.length - 1;
  steps.push({ type: "range", lo, hi });
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    steps.push({ type: "probe", mid });
    if (sorted[mid] === target) {
      steps.push({ type: "found", mid });
      return steps;
    }
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
    steps.push({ type: "range", lo, hi });
  }
  steps.push({ type: "miss" });
  return steps;
}

// ── Materialize a per-step snapshot so we can scrub forward/back ──
interface SortFrame {
  order: number[]; // slot -> bar id
  compare: [number, number] | null; // bar ids
  swapping: [number, number] | null; // bar ids
  sorted: Set<number>; // bar ids
}

function buildSortFrames(values: number[]) {
  const steps = genQuickSteps(values);
  const slotToId = values.map((_, i) => i); // slot -> id, id is the original index
  const sorted = new Set<number>();
  const frames: SortFrame[] = [
    { order: [...slotToId], compare: null, swapping: null, sorted: new Set() },
  ];
  for (const s of steps) {
    if (s.type === "compare") {
      frames.push({
        order: [...slotToId],
        compare: [slotToId[s.i], slotToId[s.j]],
        swapping: null,
        sorted: new Set(sorted),
      });
    } else if (s.type === "swap") {
      const a = slotToId[s.i];
      const b = slotToId[s.j];
      [slotToId[s.i], slotToId[s.j]] = [slotToId[s.j], slotToId[s.i]];
      frames.push({
        order: [...slotToId],
        compare: null,
        swapping: [a, b],
        sorted: new Set(sorted),
      });
    } else {
      sorted.add(slotToId[s.i]);
      frames.push({
        order: [...slotToId],
        compare: null,
        swapping: null,
        sorted: new Set(sorted),
      });
    }
  }
  // final settle frame
  frames.push({
    order: [...slotToId],
    compare: null,
    swapping: null,
    sorted: new Set(slotToId),
  });
  // map: barId -> value
  const valueOf = (id: number) => values[id];
  return { frames, valueOf };
}

interface SearchFrame {
  lo: number;
  hi: number;
  mid: number;
  found: boolean;
  miss: boolean;
}

function buildSearchFrames(values: number[], target: number) {
  const steps = genBinarySearchSteps(values, target);
  let lo = 0,
    hi = values.length - 1,
    mid = -1;
  const frames: SearchFrame[] = [{ lo, hi, mid: -1, found: false, miss: false }];
  for (const s of steps) {
    if (s.type === "range") {
      lo = s.lo;
      hi = s.hi;
      mid = -1;
      frames.push({ lo, hi, mid, found: false, miss: false });
    } else if (s.type === "probe") {
      mid = s.mid;
      frames.push({ lo, hi, mid, found: false, miss: false });
    } else if (s.type === "found") {
      mid = s.mid;
      frames.push({ lo, hi, mid, found: true, miss: false });
    } else {
      frames.push({ lo, hi, mid: -1, found: false, miss: true });
    }
  }
  return frames;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Quick Sort 2D ───────────────────────────────────────────────────────────
function QuickSort2D({ runKey }: { runKey: number }) {
  // Values are heights; ids are stable identities for layout animation.
  // runKey is an intentional dependency: pressing "Restart" reshuffles.
  const values = useMemo(
    () => shuffle(Array.from({ length: BAR_COUNT }, (_, i) => i + 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runKey],
  );
  const maxVal = BAR_COUNT;
  const { frames } = useMemo(() => buildSortFrames(values), [values]);
  const [idx, setIdx] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => setIdx(0), [frames]);

  useEffect(() => {
    if (paused) return;
    const settling = idx >= frames.length - 1;
    const delay = settling ? 1600 : idx === 0 ? 700 : 300;
    const t = setTimeout(() => {
      setIdx((i) => (i >= frames.length - 1 ? 0 : i + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [idx, frames.length, paused]);

  const frame = frames[idx];
  const progress = frames.length > 1 ? idx / (frames.length - 1) : 0;

  return (
    <div className="relative h-full w-full select-none" onPointerLeave={() => setHover(null)}>
      {/* Bars are rendered in SLOT order (frame.order) so the DOM order reflects
          the current arrangement — this is what lets layout animation actually
          move bars into their sorted positions. Each bar is keyed by its stable
          id so Framer Motion can tween it from old slot to new slot. */}
      <div className="absolute inset-x-0 bottom-14 top-[4.5rem] flex items-end justify-center gap-[6px] px-6">
        {frame.order.map((id) => {
          const v = values[id];
          const isCompare = frame.compare?.includes(id);
          const isSwap = frame.swapping?.includes(id);
          const isSorted = frame.sorted.has(id);
          const isHover = hover === id;
          let fill = `linear-gradient(180deg, ${C.base}, ${C.baseSoft})`;
          let glow = "none";
          let labelColor = "#9fb2ff";
          if (isSwap) {
            fill = `linear-gradient(180deg, ${C.swap}, #c43d33)`;
            glow = `0 0 18px ${C.swap}aa`;
            labelColor = C.swap;
          } else if (isCompare) {
            fill = `linear-gradient(180deg, ${C.compare}, #c79a1f)`;
            glow = `0 0 16px ${C.compare}99`;
            labelColor = C.compare;
          } else if (isSorted) {
            fill = `linear-gradient(180deg, ${C.sorted}, #1f9c6a)`;
            glow = `0 0 12px ${C.sorted}77`;
            labelColor = C.sorted;
          }
          if (isHover) glow = `0 0 22px #ffffffaa`;
          return (
            <motion.div
              key={id}
              layout
              onPointerEnter={() => setHover(id)}
              transition={{ type: "spring", stiffness: 500, damping: 34, mass: 0.7 }}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              style={{ maxWidth: 30 }}
            >
              {/* always-visible value label on top of the bar */}
              <motion.span
                layout
                className="mb-1 font-mono text-[9px] font-semibold tabular-nums"
                style={{ color: labelColor }}
                animate={{ scale: isCompare || isSwap ? 1.25 : 1 }}
              >
                {v}
              </motion.span>
              <motion.div
                layout
                className="relative w-full rounded-t-md origin-bottom"
                style={{ boxShadow: glow }}
                animate={{
                  height: `${(0.12 + (v / maxVal) * 0.88) * 100}%`,
                  y: isSwap ? -8 : isCompare ? -3 : 0,
                  scale: isHover ? 1.05 : 1,
                }}
              >
                <div className="absolute inset-0 rounded-t-md" style={{ background: fill }} />
                {/* glossy top */}
                <div
                  className="absolute inset-x-0 top-0 h-1/3 rounded-t-md opacity-40"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.5), transparent)",
                  }}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <StatusChips
        chips={[
          frame.swapping
            ? { c: C.swap, label: "swap" }
            : frame.compare
              ? { c: C.compare, label: "compare" }
              : idx >= frames.length - 1
                ? { c: C.sorted, label: "sorted ✓" }
                : { c: C.base, label: "partition" },
          { c: C.sorted, label: `${frame.sorted.size}/${BAR_COUNT} placed` },
        ]}
      />

      <Legend
        items={[
          { c: C.compare, label: "Compare" },
          { c: C.swap, label: "Swap" },
          { c: C.sorted, label: "Sorted" },
        ]}
      />

      <Timeline
        progress={progress}
        paused={paused}
        onScrub={(p) => {
          setPaused(true);
          setIdx(Math.round(p * (frames.length - 1)));
        }}
        onToggle={() => setPaused((p) => !p)}
      />
    </div>
  );
}

// ─── Binary Search 2D ────────────────────────────────────────────────────────
function BinarySearch2D({ runKey }: { runKey: number }) {
  const values = useMemo(() => Array.from({ length: BS_COUNT }, (_, i) => i + 1), []);
  // runKey is intentional: "Restart" picks a fresh target.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const target = useMemo(() => values[Math.floor(Math.random() * values.length)], [runKey, values]);
  const frames = useMemo(() => buildSearchFrames(values, target), [values, target]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => setIdx(0), [frames]);

  useEffect(() => {
    if (paused) return;
    const last = idx >= frames.length - 1;
    const delay = last ? 1800 : idx === 0 ? 700 : 620;
    const t = setTimeout(() => {
      setIdx((i) => (i >= frames.length - 1 ? 0 : i + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [idx, frames.length, paused]);

  const f = frames[idx];
  const progress = frames.length > 1 ? idx / (frames.length - 1) : 0;
  const targetIdx = values.indexOf(target);

  return (
    <div className="relative h-full w-full select-none" onPointerLeave={() => setHover(null)}>
      {/* tiles */}
      <div className="absolute inset-x-0 top-[46%] -translate-y-1/2 flex items-center justify-center gap-2 px-6">
        {values.map((v, i) => {
          const inRange = i >= f.lo && i <= f.hi;
          const isMid = i === f.mid;
          const isFound = f.found && i === f.mid;
          const isTarget = i === targetIdx;
          const isHover = hover === i;
          let bg = C.dim;
          let bd = "rgba(255,255,255,0.06)";
          let txt = "#56618f";
          let glow = "none";
          if (isFound) {
            bg = `${C.found}33`;
            bd = C.found;
            txt = C.found;
            glow = `0 0 22px ${C.found}cc`;
          } else if (isMid) {
            bg = `${C.probe}26`;
            bd = C.probe;
            txt = C.probe;
            glow = `0 0 20px ${C.probe}aa`;
          } else if (inRange) {
            bg = `${C.range}1f`;
            bd = `${C.range}88`;
            txt = "#c3d0ff";
          }
          if (isTarget && inRange && !isMid && !isFound) {
            bd = "#a0d8ff";
            txt = "#a0d8ff";
          }
          if (isHover) glow = `0 0 18px #ffffff99`;
          return (
            <div key={i} className="relative flex flex-col items-center gap-1">
              {/* mid pointer diamond */}
              <div className="h-5 w-5">
                <AnimatePresence>
                  {isMid && (
                    <motion.div
                      layoutId="bs-pointer"
                      initial={{ opacity: 0, y: -6, scale: 0.5 }}
                      animate={{ opacity: 1, y: [0, -3, 0], scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{
                        layout: { type: "spring", stiffness: 320, damping: 26 },
                        y: { repeat: Infinity, duration: 1.4, ease: "easeInOut" },
                      }}
                      className="h-3 w-3 rotate-45 rounded-[2px]"
                      style={{
                        background: isFound ? C.found : C.probe,
                        boxShadow: `0 0 12px ${isFound ? C.found : C.probe}`,
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
              <motion.div
                onPointerEnter={() => setHover(i)}
                animate={{
                  scale: isFound ? 1.18 : isMid ? 1.12 : isHover ? 1.08 : inRange ? 1 : 0.92,
                  y: isMid || isFound ? -2 : 0,
                  opacity: inRange || isMid || isFound ? 1 : 0.5,
                }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-semibold"
                style={{ background: bg, border: `1.5px solid ${bd}`, color: txt, boxShadow: glow }}
              >
                {v}
              </motion.div>
              <span className="text-[8px] font-mono" style={{ color: "#3a4366" }}>
                {i}
              </span>
            </div>
          );
        })}
      </div>

      {/* lo / hi brackets */}
      <Brackets count={values.length} lo={f.lo} hi={f.hi} />

      <StatusChips
        chips={[
          { c: C.range, label: `lo ${f.lo}` },
          f.mid >= 0
            ? { c: C.probe, label: `mid ${f.mid} → ${values[f.mid]}` }
            : { c: "#56618f", label: "mid —" },
          { c: C.range, label: `hi ${f.hi}` },
          { c: C.found, label: `target ${target}` },
          ...(f.found ? [{ c: C.found, label: "found ✓" }] : []),
          ...(f.miss ? [{ c: C.swap, label: "not found ✗" }] : []),
        ]}
      />

      <Legend
        items={[
          { c: C.range, label: "Search range" },
          { c: C.probe, label: "Probe (mid)" },
          { c: C.found, label: "Found" },
        ]}
      />

      <Timeline
        progress={progress}
        paused={paused}
        onScrub={(p) => {
          setPaused(true);
          setIdx(Math.round(p * (frames.length - 1)));
        }}
        onToggle={() => setPaused((p) => !p)}
      />
    </div>
  );
}

// ── lo/hi range brackets that slide along the row ──
function Brackets({ count, lo, hi }: { count: number; lo: number; hi: number }) {
  // Approximate horizontal position via flex percentages.
  const leftPct = count > 1 ? (lo / (count - 1)) * 100 : 0;
  const rightPct = count > 1 ? (hi / (count - 1)) * 100 : 100;
  const valid = lo <= hi;
  return (
    <div className="pointer-events-none absolute inset-x-6 top-[46%] -translate-y-1/2 h-16">
      <AnimatePresence>
        {valid && (
          <motion.div
            className="absolute inset-y-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: `${leftPct}%`, right: `${100 - rightPct}%` }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            style={{
              borderLeft: `2px solid ${C.range}`,
              borderRight: `2px solid ${C.range}`,
              borderRadius: 6,
              background: `${C.range}0a`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Floating status chips (top) ──
function StatusChips({ chips }: { chips: { c: string; label: string }[] }) {
  return (
    <div className="absolute top-12 left-0 right-0 z-10 flex flex-wrap justify-center gap-2 px-3">
      <AnimatePresence mode="popLayout">
        {chips.map((chip) => (
          <motion.span
            key={chip.label.replace(/\d+/g, "#")}
            layout
            initial={{ opacity: 0, scale: 0.85, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="rounded-md px-2 py-0.5 text-[10px] font-mono"
            style={{
              background: "rgba(6,8,20,0.82)",
              color: chip.c,
              border: `1px solid ${chip.c}40`,
            }}
          >
            {chip.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Mode-aware legend (bottom) ──
function Legend({ items }: { items: { c: string; label: string }[] }) {
  return (
    <div className="absolute bottom-2.5 left-0 right-0 z-10 flex flex-wrap justify-center gap-x-4 gap-y-1 px-3 pointer-events-none">
      {items.map((it) => (
        <span
          key={it.label}
          className="flex items-center gap-1.5 font-mono text-[10px]"
          style={{ color: "oklch(0.55 0.04 255)" }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: it.c, boxShadow: `0 0 6px ${it.c}99` }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ── Scrubbable timeline + play/pause ──
function Timeline({
  progress,
  paused,
  onScrub,
  onToggle,
}: {
  progress: number;
  paused: boolean;
  onScrub: (p: number) => void;
  onToggle: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef(false);

  const handle = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      onScrub(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
    },
    [onScrub],
  );

  return (
    <div className="absolute bottom-9 left-4 right-4 z-10 flex items-center gap-2">
      <button
        onClick={onToggle}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] transition-transform hover:scale-110"
        style={{
          background: "rgba(255,255,255,0.06)",
          color: C.text,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        aria-label={paused ? "Play" : "Pause"}
      >
        {paused ? "▶" : "❚❚"}
      </button>
      <div
        ref={trackRef}
        className="group relative h-3 flex-1 cursor-pointer"
        onPointerDown={(e) => {
          drag.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          handle(e.clientX);
        }}
        onPointerMove={(e) => drag.current && handle(e.clientX)}
        onPointerUp={(e) => {
          drag.current = false;
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
      >
        <div
          className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />
        <motion.div
          className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${C.base}, ${C.sorted})`,
          }}
        />
        <motion.div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${progress * 100}%`, background: "#fff", boxShadow: `0 0 8px ${C.base}` }}
        />
      </div>
    </div>
  );
}

// ─── Public component ────────────────────────────────────────────────────────
export function HeroViz2D() {
  const [mode, setMode] = useState<HeroMode>("Quick Sort");
  const [runKey, setRunKey] = useState(0);

  return (
    <div className="relative h-full w-full">
      {/* ambient grid floor */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(90,124,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(90,124,255,0.08) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 75% 60% at 50% 55%, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 60% at 50% 55%, #000 30%, transparent 80%)",
        }}
      />

      {/* mode picker */}
      <div className="absolute top-3 left-0 right-0 z-20 flex flex-wrap justify-center gap-1.5 px-3">
        {(["Quick Sort", "Binary Search"] as HeroMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-full px-3 py-1 font-mono text-[11px] transition-all hover:scale-105"
            style={{
              background: m === mode ? "oklch(0.72 0.19 255 / 22%)" : "oklch(1 0 0 / 5%)",
              color: m === mode ? "oklch(0.85 0.15 255)" : "oklch(0.55 0.04 255)",
              border: `1px solid ${m === mode ? "oklch(0.72 0.19 255 / 50%)" : "oklch(1 0 0 / 10%)"}`,
            }}
          >
            {m}
          </button>
        ))}
        <button
          onClick={() => setRunKey((k) => k + 1)}
          className="rounded-full px-3 py-1 font-mono text-[11px] transition-all hover:scale-105"
          style={{
            background: "oklch(0.75 0.18 162 / 14%)",
            color: "oklch(0.75 0.18 162)",
            border: "1px solid oklch(0.75 0.18 162 / 35%)",
          }}
        >
          ⤨ Restart
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          {mode === "Quick Sort" ? (
            <QuickSort2D runKey={runKey} />
          ) : (
            <BinarySearch2D runKey={runKey} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
