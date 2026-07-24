import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controls } from "../components/viz/Controls";

export const Route = createFileRoute("/gametheory")({
  head: () => ({
    meta: [
      { title: "Game Theory — AlgoViz" },
      {
        name: "description",
        content:
          "Animated game-theory algorithms: Nash equilibrium, minimax, prisoner's dilemma tournament, fictitious play, Tit-for-Tat, and the El Farol bar — each with code & explanation.",
      },
    ],
  }),
  component: GameTheoryPage,
});

type Algo =
  | "Nash Equilibrium"
  | "Minimax"
  | "Iterated Dilemma"
  | "Fictitious Play"
  | "Tit-for-Tat"
  | "El Farol Bar";

const COLOR: Record<Algo, string> = {
  "Nash Equilibrium": "oklch(0.72 0.19 255)",
  Minimax: "oklch(0.68 0.22 22)",
  "Iterated Dilemma": "oklch(0.75 0.18 162)",
  "Fictitious Play": "oklch(0.82 0.18 85)",
  "Tit-for-Tat": "oklch(0.75 0.18 310)",
  "El Farol Bar": "oklch(0.72 0.22 180)",
};

const DESC: Record<Algo, string> = {
  "Nash Equilibrium": "Scan a 2×2 payoff matrix and flag every mutual best-response cell.",
  Minimax: "Back up a zero-sum game tree, alternating max & min players.",
  "Iterated Dilemma": "Round-robin tournament of classic strategies in the Prisoner's Dilemma.",
  "Fictitious Play": "Each player best-responds to the empirical frequency of the opponent.",
  "Tit-for-Tat": "Replay one match: cooperate first, then mirror the opponent.",
  "El Farol Bar": "Agents predict attendance and decide whether to go out.",
};

function useSteps<T>(steps: T[], speed: number) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, Math.max(60, 1100 - speed * 9));
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, speed, steps.length]);

  const onPlay = useCallback(() => {
    setIndex((i) => (i >= steps.length - 1 ? 0 : i));
    setPlaying(true);
  }, [steps.length]);
  const onPause = useCallback(() => setPlaying(false), []);
  const onReset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);
  const onStepFwd = useCallback(() => setIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);
  const onStepBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  return { index, current: steps[index], playing, onPlay, onPause, onReset, onStepFwd, onStepBack, total: steps.length };
}

const panel: React.CSSProperties = { background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" };

/* 1. NASH */
type Cell = { a: number; b: number };
type NashStep = { scan: [number, number] | null; bestA: boolean[][]; bestB: boolean[][]; equilibria: [number, number][]; note: string };
const clone = (m: boolean[][]) => m.map((r) => [...r]);
function buildNash(M: Cell[][]): NashStep[] {
  const steps: NashStep[] = [];
  const bestA = [[false, false], [false, false]];
  const bestB = [[false, false], [false, false]];
  const eq: [number, number][] = [];
  steps.push({ scan: null, bestA: clone(bestA), bestB: clone(bestB), equilibria: [], note: "Start: find each player's best response." });
  for (let col = 0; col < 2; col++) {
    const top = M[0][col].b, bot = M[1][col].b, best = top >= bot ? 0 : 1;
    bestB[best][col] = true;
    if (top === bot) { bestB[0][col] = true; bestB[1][col] = true; }
    steps.push({ scan: [best, col], bestA: clone(bestA), bestB: clone(bestB), equilibria: [], note: `B's best reply when A picks column ${col === 0 ? "L" : "R"}.` });
  }
  for (let row = 0; row < 2; row++) {
    const left = M[row][0].a, right = M[row][1].a, best = left >= right ? 0 : 1;
    bestA[row][best] = true;
    if (left === right) { bestA[row][0] = true; bestA[row][1] = true; }
    steps.push({ scan: [row, best], bestA: clone(bestA), bestB: clone(bestB), equilibria: [], note: `A's best reply when B picks row ${row === 0 ? "T" : "B"}.` });
  }
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) if (bestA[r][c] && bestB[r][c]) { eq.push([r, c]); steps.push({ scan: [r, c], bestA: clone(bestA), bestB: clone(bestB), equilibria: [...eq], note: `Mutual best response → Nash equilibrium at (${r},${c}).` }); }
  steps.push({ scan: null, bestA, bestB, equilibria: eq, note: eq.length === 0 ? "No pure-strategy Nash equilibrium." : `${eq.length} pure Nash equilibri${eq.length > 1 ? "a" : "um"} found.` });
  return steps;
}
function NashViz({ speed, accent }: { speed: number; accent: string }) {
  const M: Cell[][] = useMemo(() => [[{ a: 3, b: 3 }, { a: 0, b: 5 }], [{ a: 5, b: 0 }, { a: 1, b: 1 }]], []);
  const steps = useMemo(() => buildNash(M), [M]);
  const p = useSteps(steps, speed);
  const s = p.current;
  const rowLabels = ["A: Silent", "A: Confess"], colLabels = ["B: Silent", "B: Confess"];
  return (
    <div className="space-y-4">
      <VizFrame>
        <div className="grid place-items-center py-6">
          <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
            <div />
            {colLabels.map((c) => <div key={c} className="text-center text-xs font-medium pb-1" style={{ color: "oklch(0.6 0.04 255)" }}>{c}</div>)}
            {[0, 1].map((r) => (
              <Row key={r}>
                <div className="flex items-center text-xs font-medium pr-2" style={{ color: "oklch(0.6 0.04 255)" }}>{rowLabels[r]}</div>
                {[0, 1].map((c) => {
                  const scanning = s?.scan?.[0] === r && s?.scan?.[1] === c;
                  const isEq = s?.equilibria?.some(([er, ec]) => er === r && ec === c);
                  const ba = s?.bestA?.[r]?.[c], bb = s?.bestB?.[r]?.[c];
                  return (
                    <motion.div key={c} animate={{ scale: scanning ? 1.05 : 1 }} className="relative rounded-xl p-4 sm:p-6 min-w-[120px]" style={{ background: isEq ? `${accent}26` : scanning ? "oklch(1 0 0 / 8%)" : "oklch(1 0 0 / 4%)", border: `2px solid ${isEq ? accent : scanning ? "oklch(1 0 0 / 25%)" : "oklch(1 0 0 / 8%)"}`, boxShadow: isEq ? `0 0 18px ${accent}55` : "none" }}>
                      <div className="flex justify-between text-lg font-mono font-bold"><span style={{ color: ba ? "var(--accent)" : "oklch(0.5 0.05 255)" }}>{M[r][c].a}</span><span style={{ color: bb ? "var(--warn)" : "oklch(0.5 0.05 255)" }}>{M[r][c].b}</span></div>
                      {isEq && <span className="absolute -top-2 -right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: accent, color: "oklch(0.08 0.02 265)" }}>NE</span>}
                    </motion.div>
                  );
                })}
              </Row>
            ))}
          </div>
        </div>
      </VizFrame>
      <NoteBar note={s?.note} accent={accent} />
      <Legend items={[{ color: "var(--accent)", label: "A best response" }, { color: "var(--warn)", label: "B best response" }, { color: accent, label: "Nash equilibrium" }]} />
      <Controls {...p} speed={speed} setSpeed={() => {}} />
    </div>
  );
}
const Row = ({ children }: { children: React.ReactNode }) => <>{children}</>;

/* 2. MINIMAX */
type TNode = { id: number; depth: number; x: number; children: number[]; leaf?: number; value?: number };
type MmStep = { visiting: number; values: Record<number, number>; note: string };
function buildTree() {
  const leafVals = [3, 12, 8, 2, 14, 5, 2, 17];
  const nodes: Record<number, TNode> = {};
  let id = 0;
  const make = (depth: number, x: number): number => { const myId = id++; nodes[myId] = { id: myId, depth, x, children: [] }; return myId; };
  const r = make(0, 4);
  const lvl1 = [make(1, 2), make(1, 6)];
  nodes[r].children = lvl1;
  let li = 0;
  lvl1.forEach((pNode, pi) => {
    const lvl2 = [make(2, pi * 4 + 1), make(2, pi * 4 + 3)];
    nodes[pNode].children = lvl2;
    lvl2.forEach((q, qi) => {
      const lvl3 = [make(3, pi * 4 + qi * 2 + 0.4), make(3, pi * 4 + qi * 2 + 1.4)];
      nodes[q].children = lvl3;
      lvl3.forEach((leaf) => { nodes[leaf].leaf = leafVals[li++]; nodes[leaf].value = nodes[leaf].leaf; });
    });
  });
  return { nodes, root: r };
}
function buildMinimax() {
  const tree = buildTree();
  const { nodes, root } = tree;
  const steps: MmStep[] = [];
  const values: Record<number, number> = {};
  Object.values(nodes).forEach((n) => { if (n.leaf !== undefined) values[n.id] = n.leaf; });
  const mm = (id: number, maxing: boolean): number => {
    const n = nodes[id];
    if (n.leaf !== undefined) { steps.push({ visiting: id, values: { ...values }, note: `Leaf value ${n.leaf}.` }); return n.leaf; }
    let best = maxing ? -Infinity : Infinity;
    for (const c of n.children) { const v = mm(c, !maxing); best = maxing ? Math.max(best, v) : Math.min(best, v); }
    values[id] = best;
    steps.push({ visiting: id, values: { ...values }, note: `${maxing ? "MAX" : "MIN"} node → takes ${maxing ? "max" : "min"} = ${best}.` });
    return best;
  };
  mm(root, true);
  steps.push({ visiting: root, values: { ...values }, note: `Optimal value for MAX = ${values[root]}.` });
  return { steps, tree };
}
function MinimaxViz({ speed, accent }: { speed: number; accent: string }) {
  const { steps, tree } = useMemo(buildMinimax, []);
  const p = useSteps(steps, speed);
  const s = p.current;
  const W = 720, H = 360, colW = W / 8, rowH = H / 4;
  const pos = (n: TNode) => ({ x: n.x * colW + colW / 2, y: n.depth * rowH + 36 });
  return (
    <div className="space-y-4">
      <VizFrame>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 340 }}>
          {Object.values(tree.nodes).map((n) => n.children.map((c) => { const a = pos(n), b = pos(tree.nodes[c]); return <line key={`${n.id}-${c}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="oklch(1 0 0 / 12%)" strokeWidth={1.5} />; }))}
          {Object.values(tree.nodes).map((n) => {
            const { x, y } = pos(n);
            const visiting = s?.visiting === n.id, val = s?.values?.[n.id], isLeaf = n.leaf !== undefined, maxing = n.depth % 2 === 0;
            return (
              <g key={n.id}>
                <motion.circle cx={x} cy={y} animate={{ r: visiting ? 19 : 15 }} fill={visiting ? accent : isLeaf ? "oklch(0.30 0.06 265)" : maxing ? "oklch(0.30 0.10 255)" : "oklch(0.30 0.10 22)"} stroke={visiting ? "#fff" : maxing ? "var(--accent)" : "var(--danger)"} strokeWidth={visiting ? 2.5 : 1.5} style={{ filter: visiting ? `drop-shadow(0 0 8px ${accent})` : "none" }} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill={val !== undefined ? "#fff" : "oklch(0.5 0.05 255)"}>{val !== undefined ? val : "?"}</text>
                {!isLeaf && <text x={x} y={y - 22} textAnchor="middle" fontSize="9" fill="oklch(0.55 0.04 255)">{maxing ? "MAX" : "MIN"}</text>}
              </g>
            );
          })}
        </svg>
      </VizFrame>
      <NoteBar note={s?.note} accent={accent} />
      <Legend items={[{ color: "var(--accent)", label: "MAX node" }, { color: "var(--danger)", label: "MIN node" }, { color: accent, label: "Visiting" }]} />
      <Controls {...p} speed={speed} setSpeed={() => {}} />
    </div>
  );
}

/* 3. IPD */
type Move = "C" | "D";
type Strat = { name: string; fn: (own: Move[], opp: Move[]) => Move };
const STRATS: Strat[] = [
  { name: "Tit-for-Tat", fn: (_o, opp) => (opp.length ? opp[opp.length - 1] : "C") },
  { name: "Always Coop", fn: () => "C" },
  { name: "Always Defect", fn: () => "D" },
  { name: "Grudger", fn: (_o, opp) => (opp.includes("D") ? "D" : "C") },
  { name: "Random", fn: () => (Math.random() < 0.5 ? "C" : "D") },
];
function pay(a: Move, b: Move): number { if (a === "C" && b === "C") return 3; if (a === "C" && b === "D") return 0; if (a === "D" && b === "C") return 5; return 1; }
type IpdStep = { scores: number[]; matchA: number; matchB: number; lastMoves?: [Move, Move]; note: string };
function buildIPD(rounds = 8): IpdStep[] {
  const n = STRATS.length, scores = new Array(n).fill(0), steps: IpdStep[] = [];
  steps.push({ scores: [...scores], matchA: -1, matchB: -1, note: "Round-robin tournament begins." });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const oi: Move[] = [], oj: Move[] = [];
    for (let r = 0; r < rounds; r++) {
      const mi = STRATS[i].fn(oi, oj), mj = STRATS[j].fn(oj, oi);
      oi.push(mi); oj.push(mj); scores[i] += pay(mi, mj); scores[j] += pay(mj, mi);
      steps.push({ scores: [...scores], matchA: i, matchB: j, lastMoves: [mi, mj], note: `${STRATS[i].name} (${mi}) vs ${STRATS[j].name} (${mj}) — round ${r + 1}.` });
    }
  }
  const winner = scores.indexOf(Math.max(...scores));
  steps.push({ scores: [...scores], matchA: winner, matchB: winner, note: `Tournament winner: ${STRATS[winner].name} with ${scores[winner]} points.` });
  return steps;
}
function IpdViz({ speed, accent }: { speed: number; accent: string }) {
  const steps = useMemo(() => buildIPD(8), []);
  const p = useSteps(steps, speed);
  const s = p.current;
  const max = Math.max(...(s?.scores ?? [1]), 1);
  return (
    <div className="space-y-4">
      <VizFrame>
        <div className="space-y-2.5 py-4 px-2">
          {STRATS.map((st, i) => {
            const active = s?.matchA === i || s?.matchB === i, score = s?.scores?.[i] ?? 0;
            return (
              <div key={st.name} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium shrink-0 text-right" style={{ color: active ? "#fff" : "oklch(0.6 0.04 255)" }}>{st.name}</span>
                <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "oklch(1 0 0 / 5%)" }}>
                  <motion.div className="h-full rounded-md flex items-center justify-end pr-2" animate={{ width: `${(score / max) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} style={{ background: active ? `linear-gradient(90deg, ${accent}, oklch(0.75 0.18 162))` : "linear-gradient(90deg, oklch(0.45 0.10 265), oklch(0.35 0.08 265))", boxShadow: active ? `0 0 12px ${accent}66` : "none" }}>
                    <span className="text-[10px] font-mono font-bold text-white">{score}</span>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
        {s?.lastMoves && (
          <div className="flex justify-center gap-6 pb-4">
            {[s.matchA, s.matchB].map((idx, k) => (
              <div key={k} className="flex items-center gap-2 text-xs"><span style={{ color: "oklch(0.6 0.04 255)" }}>{STRATS[idx]?.name}</span><span className="font-mono font-bold px-2 py-0.5 rounded" style={{ background: s.lastMoves![k] === "C" ? "var(--accent)" : "var(--danger)", color: "oklch(0.08 0.02 265)" }}>{s.lastMoves![k] === "C" ? "Cooperate" : "Defect"}</span></div>
            ))}
          </div>
        )}
      </VizFrame>
      <NoteBar note={s?.note} accent={accent} />
      <Legend items={[{ color: "var(--accent)", label: "Cooperate" }, { color: "var(--danger)", label: "Defect" }]} />
      <Controls {...p} speed={speed} setSpeed={() => {}} />
    </div>
  );
}

/* 4. FICTITIOUS PLAY */
type FpStep = { iter: number; freqA: number; freqB: number; note: string };
function buildFP(iters = 24): FpStep[] {
  const A = [[2, -1], [-1, 1]];
  const countsA: [number, number] = [1, 0], countsB: [number, number] = [0, 1], steps: FpStep[] = [];
  for (let t = 0; t < iters; t++) {
    const freqB = countsB[0] / (countsB[0] + countsB[1]);
    const moveA = (A[0][0] * freqB + A[0][1] * (1 - freqB)) >= (A[1][0] * freqB + A[1][1] * (1 - freqB)) ? 0 : 1;
    const freqA = countsA[0] / (countsA[0] + countsA[1]);
    const moveB = (A[0][0] * freqA + A[1][0] * (1 - freqA)) <= (A[0][1] * freqA + A[1][1] * (1 - freqA)) ? 0 : 1;
    countsA[moveA]++; countsB[moveB]++;
    steps.push({ iter: t + 1, freqA: countsA[0] / (countsA[0] + countsA[1]), freqB: countsB[0] / (countsB[0] + countsB[1]), note: `Iter ${t + 1}: A→${moveA === 0 ? "Top" : "Bottom"}, B→${moveB === 0 ? "Left" : "Right"} (best replies to history).` });
  }
  steps.push({ iter: iters, freqA: countsA[0] / (countsA[0] + countsA[1]), freqB: countsB[0] / (countsB[0] + countsB[1]), note: "Empirical play converges toward the mixed equilibrium." });
  return steps;
}
function FpViz({ speed, accent }: { speed: number; accent: string }) {
  const steps = useMemo(() => buildFP(24), []);
  const p = useSteps(steps, speed);
  const history = steps.slice(0, p.index + 1);
  const W = 720, H = 260;
  const path = (key: "freqA" | "freqB") => history.map((st, i) => { const x = (i / Math.max(1, steps.length - 1)) * W; const y = H - st[key] * H; return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
  const s = p.current;
  return (
    <div className="space-y-4">
      <VizFrame>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 250 }}>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} y1={H - g * H} x2={W} y2={H - g * H} stroke="oklch(1 0 0 / 6%)" strokeWidth={1} />)}
          <path d={path("freqA")} fill="none" stroke={accent} strokeWidth={2.5} />
          <path d={path("freqB")} fill="none" stroke="var(--warn)" strokeWidth={2.5} />
          {history.length > 0 && (<><circle cx={((history.length - 1) / Math.max(1, steps.length - 1)) * W} cy={H - (s?.freqA ?? 0) * H} r={5} fill={accent} style={{ filter: `drop-shadow(0 0 6px ${accent})` }} /><circle cx={((history.length - 1) / Math.max(1, steps.length - 1)) * W} cy={H - (s?.freqB ?? 0) * H} r={5} fill="var(--warn)" /></>)}
        </svg>
        <div className="flex justify-center gap-8 pb-3 text-xs font-mono"><span style={{ color: accent }}>P(A plays Top) = {(s?.freqA ?? 0).toFixed(2)}</span><span style={{ color: "var(--warn)" }}>P(B plays Left) = {(s?.freqB ?? 0).toFixed(2)}</span></div>
      </VizFrame>
      <NoteBar note={s?.note} accent={accent} />
      <Legend items={[{ color: accent, label: "Player A frequency" }, { color: "var(--warn)", label: "Player B frequency" }]} />
      <Controls {...p} speed={speed} setSpeed={() => {}} />
    </div>
  );
}

/* 5. TFT */
type TftStep = { meMoves: Move[]; oppMoves: Move[]; scoreMe: number; scoreOpp: number; note: string };
function buildTFT(rounds = 12): TftStep[] {
  const oppScript: Move[] = ["C", "C", "D", "C", "D", "D", "C", "C", "C", "D", "C", "C"];
  const me: Move[] = [], opp: Move[] = [];
  let sMe = 0, sOpp = 0;
  const steps: TftStep[] = [];
  steps.push({ meMoves: [], oppMoves: [], scoreMe: 0, scoreOpp: 0, note: "Tit-for-Tat starts by cooperating." });
  for (let r = 0; r < rounds; r++) {
    const myMove: Move = r === 0 ? "C" : opp[r - 1], oppMove = oppScript[r % oppScript.length];
    me.push(myMove); opp.push(oppMove); sMe += pay(myMove, oppMove); sOpp += pay(oppMove, myMove);
    steps.push({ meMoves: [...me], oppMoves: [...opp], scoreMe: sMe, scoreOpp: sOpp, note: r === 0 ? "Round 1: I cooperate (default)." : `Round ${r + 1}: I mirror opponent's last move (${opp[r - 1]}).` });
  }
  steps.push({ meMoves: me, oppMoves: opp, scoreMe: sMe, scoreOpp: sOpp, note: `Final — TFT ${sMe} vs Opponent ${sOpp}. Nice, retaliatory, forgiving.` });
  return steps;
}
function TftViz({ speed, accent }: { speed: number; accent: string }) {
  const steps = useMemo(() => buildTFT(12), []);
  const p = useSteps(steps, speed);
  const s = p.current;
  const rows: [string, Move[]][] = [["Tit-for-Tat", s?.meMoves ?? []], ["Opponent", s?.oppMoves ?? []]];
  return (
    <div className="space-y-4">
      <VizFrame>
        <div className="space-y-4 py-5 px-3">
          {rows.map(([label, moves]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium shrink-0" style={{ color: "oklch(0.65 0.04 255)" }}>{label}</span>
              <div className="flex gap-1.5 flex-wrap"><AnimatePresence>{moves.map((m, i) => <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-8 w-8 rounded-lg grid place-items-center text-xs font-mono font-bold" style={{ background: m === "C" ? "var(--accent)" : "var(--danger)", color: "oklch(0.08 0.02 265)" }}>{m}</motion.div>)}</AnimatePresence></div>
            </div>
          ))}
          <div className="flex gap-6 pt-2 text-sm font-mono"><span style={{ color: accent }}>TFT: {s?.scoreMe ?? 0}</span><span style={{ color: "var(--warn)" }}>Opp: {s?.scoreOpp ?? 0}</span></div>
        </div>
      </VizFrame>
      <NoteBar note={s?.note} accent={accent} />
      <Legend items={[{ color: "var(--accent)", label: "Cooperate (C)" }, { color: "var(--danger)", label: "Defect (D)" }]} />
      <Controls {...p} speed={speed} setSpeed={() => {}} />
    </div>
  );
}

/* 6. EL FAROL */
type ElStep = { attendance: number; going: boolean[]; history: number[]; note: string };
function buildElFarol(agents = 60, weeks = 30, cap = 0.6): ElStep[] {
  const threshold = Math.floor(agents * cap);
  const weight = Array.from({ length: agents }, () => 0.3 + Math.random() * 1.2);
  const history: number[] = [Math.floor(agents * 0.5)];
  const steps: ElStep[] = [];
  for (let w = 0; w < weeks; w++) {
    const last = history[history.length - 1], going: boolean[] = [];
    for (let a = 0; a < agents; a++) going.push(Math.min(agents, last * weight[a]) < threshold);
    const attendance = going.filter(Boolean).length;
    history.push(attendance);
    steps.push({ attendance, going: [...going], history: [...history], note: `Week ${w + 1}: ${attendance} went (threshold ${threshold}). ${attendance <= threshold ? "Comfortable night 🍺" : "Too crowded 😣"}` });
  }
  steps.push({ attendance: history[history.length - 1], going: [], history, note: `Attendance self-organizes around the ${Math.round(cap * 100)}% comfort threshold.` });
  return steps;
}
function ElFarolViz({ speed, accent }: { speed: number; accent: string }) {
  const AGENTS = 60, THRESH = Math.floor(AGENTS * 0.6);
  const steps = useMemo(() => buildElFarol(AGENTS, 30, 0.6), []);
  const p = useSteps(steps, speed);
  const s = p.current;
  const W = 720, H = 140, maxA = AGENTS;
  return (
    <div className="space-y-4">
      <VizFrame>
        <div className="grid grid-cols-12 gap-1.5 p-4 place-items-center">
          {Array.from({ length: AGENTS }).map((_, i) => { const going = s?.going?.[i]; return <motion.div key={i} animate={{ scale: going ? 1 : 0.7 }} className="h-3.5 w-3.5 rounded-full" style={{ background: going ? accent : "oklch(0.30 0.04 265)", boxShadow: going ? `0 0 6px ${accent}aa` : "none" }} />; })}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
          <line x1={0} y1={H - (THRESH / maxA) * H} x2={W} y2={H - (THRESH / maxA) * H} stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="5 5" />
          <path d={(s?.history ?? []).map((v, i, arr) => { const x = (i / Math.max(1, arr.length - 1)) * W; const y = H - (v / maxA) * H; return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ")} fill="none" stroke={accent} strokeWidth={2.5} />
        </svg>
        <div className="flex justify-center gap-6 pb-3 text-xs font-mono"><span style={{ color: accent }}>Attendance: {s?.attendance ?? 0}/{AGENTS}</span><span style={{ color: "var(--warn)" }}>Threshold: {THRESH}</span></div>
      </VizFrame>
      <NoteBar note={s?.note} accent={accent} />
      <Legend items={[{ color: accent, label: "Going out" }, { color: "oklch(0.30 0.04 265)", label: "Staying home" }, { color: "var(--warn)", label: "Comfort threshold" }]} />
      <Controls {...p} speed={speed} setSpeed={() => {}} />
    </div>
  );
}

/* shared UI */
function VizFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      <div className="px-3 pt-3 pb-1 flex items-center justify-between"><span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "oklch(0.40 0.04 255)" }}>visualization</span></div>
      {children}
    </div>
  );
}
function NoteBar({ note, accent }: { note?: string; accent: string }) {
  return (
    <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: `${accent}14`, border: `1px solid ${accent}33`, color: "oklch(0.85 0.02 255)" }}>
      <AnimatePresence mode="wait"><motion.span key={note} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>{note ?? ""}</motion.span></AnimatePresence>
    </div>
  );
}
function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (<div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "oklch(0.50 0.04 255)" }}>{items.map((l) => <span key={l.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />{l.label}</span>)}</div>);
}

/* code + explanation */
const COMPLEXITY: Record<Algo, { time: string; space: string }> = {
  "Nash Equilibrium": { time: "O(n·mᵏ)", space: "O(nm)" },
  Minimax: { time: "O(bᵈ)", space: "O(d)" },
  "Iterated Dilemma": { time: "O(s²·r)", space: "O(s)" },
  "Fictitious Play": { time: "O(t·n²)", space: "O(n)" },
  "Tit-for-Tat": { time: "O(r)", space: "O(1)" },
  "El Farol Bar": { time: "O(weeks·agents)", space: "O(agents)" },
};
const EXPLAIN: Record<Algo, { idea: string; how: string[]; real: string }> = {
  "Nash Equilibrium": { idea: "A cell is a Nash equilibrium when neither player can gain by unilaterally switching. We mark each player's best response, then look for cells both marked.", how: ["For each of B's choices, mark A's payoff-maximizing row.", "For each of A's choices, mark B's payoff-maximizing column.", "Any cell marked by BOTH is a pure-strategy Nash equilibrium.", "In the Prisoner's Dilemma the only NE is (Confess, Confess)."], real: "Pricing wars: two shops each cut prices because undercutting is each one's best response — even though both staying high would be better." },
  Minimax: { idea: "In a zero-sum game one player maximizes the score while the other minimizes it. Minimax backs values up a game tree: MAX layers take the max, MIN layers the min.", how: ["Recurse to the leaves (final game outcomes).", "At a MAX node return the largest child value.", "At a MIN node return the smallest child value.", "The root value is the outcome under perfect play."], real: "Chess / tic-tac-toe engines: assume the opponent plays optimally and pick the best worst-case move." },
  "Iterated Dilemma": { idea: "Strategies meet repeatedly in the Prisoner's Dilemma. A round-robin tournament reveals which long-run strategy scores most (Axelrod's experiment).", how: ["Each pair of strategies plays many rounds.", "Each round, both pick Cooperate or Defect from history.", "Payoffs: T=5 > R=3 > P=1 > S=0.", "Sum scores across all matchups; highest total wins."], real: "Cooperation in nature, trade deals, and online reputation systems where repeated interaction rewards being 'nice but retaliatory'." },
  "Fictitious Play": { idea: "A learning dynamic: each player assumes the opponent plays per the historical frequency of past moves, and best-responds. Often converges to equilibrium.", how: ["Track how often each opponent action occurred.", "Estimate the opponent's mixed strategy from counts.", "Play the best response to that estimate.", "Update counts; frequencies converge over time."], real: "Markets and adaptive agents that learn rivals' tendencies from observed behavior rather than knowing them in advance." },
  "Tit-for-Tat": { idea: "A single repeated match. Tit-for-Tat cooperates first, then copies the opponent's last move — nice, retaliatory, forgiving, clear.", how: ["Round 1: cooperate.", "Round n: replay opponent's move from round n-1.", "Punishes a defection immediately, once.", "Forgives as soon as the opponent cooperates again."], real: "Trust-building in negotiations and arms control: mirror good faith, answer betrayal proportionally, then reset." },
  "El Farol Bar": { idea: "A bounded-rationality congestion game. Agents independently decide whether to visit a bar that's only fun if under-crowded. No single rule fits all, yet attendance self-organizes.", how: ["Each agent predicts attendance from recent weeks.", "Go only if predicted crowd is below the threshold.", "Actual attendance feeds back into predictions.", "The crowd hovers near the threshold without coordination."], real: "Traffic routing, network congestion, and choosing off-peak times — decentralized agents balancing a shared resource." },
};
const CODE: Record<Algo, string> = {
  "Nash Equilibrium": `# Find pure-strategy Nash equilibria of a 2-player game
def nash_equilibria(A, B):          # A,B = payoff matrices
    rows, cols = len(A), len(A[0])
    bestA = [[False]*cols for _ in range(rows)]
    bestB = [[False]*cols for _ in range(rows)]

    for c in range(cols):           # A's best reply per column
        best = max(range(rows), key=lambda r: A[r][c])
        for r in range(rows):
            if A[r][c] == A[best][c]:
                bestA[r][c] = True

    for r in range(rows):           # B's best reply per row
        best = max(range(cols), key=lambda c: B[r][c])
        for c in range(cols):
            if B[r][c] == B[r][best]:
                bestB[r][c] = True

    return [(r, c) for r in range(rows) for c in range(cols)
            if bestA[r][c] and bestB[r][c]]`,
  Minimax: `# Minimax + alpha-beta pruning for a zero-sum game tree
def minimax(node, maximizing):
    if node.is_leaf():
        return node.value
    if maximizing:
        return max(minimax(c, False) for c in node.children)
    return min(minimax(c, True) for c in node.children)

def alphabeta(node, a, b, maximizing):
    if node.is_leaf():
        return node.value
    if maximizing:
        v = -float("inf")
        for c in node.children:
            v = max(v, alphabeta(c, a, b, False))
            a = max(a, v)
            if a >= b: break          # beta cut-off
        return v
    v = float("inf")
    for c in node.children:
        v = min(v, alphabeta(c, a, b, True))
        b = min(b, v)
        if a >= b: break              # alpha cut-off
    return v`,
  "Iterated Dilemma": `# Round-robin Iterated Prisoner's Dilemma tournament
PAYOFF = {("C","C"):(3,3), ("C","D"):(0,5),
          ("D","C"):(5,0), ("D","D"):(1,1)}

def play(stratA, stratB, rounds=200):
    a, b, sa, sb = [], [], 0, 0
    for _ in range(rounds):
        ma, mb = stratA(a, b), stratB(b, a)
        pa, pb = PAYOFF[(ma, mb)]
        sa += pa; sb += pb
        a.append(ma); b.append(mb)
    return sa, sb

def tournament(strategies):
    scores = {n: 0 for n in strategies}
    names = list(strategies)
    for i in range(len(names)):
        for j in range(i+1, len(names)):
            sa, sb = play(strategies[names[i]], strategies[names[j]])
            scores[names[i]] += sa
            scores[names[j]] += sb
    return scores`,
  "Fictitious Play": `# Fictitious play: best-respond to empirical frequency
def fictitious_play(A, iters=1000):
    n, m = len(A), len(A[0])
    cA = [1] + [0]*(n-1)
    cB = [1] + [0]*(m-1)
    for _ in range(iters):
        fB = [c/sum(cB) for c in cB]
        eu = [sum(A[i][j]*fB[j] for j in range(m)) for i in range(n)]
        i = max(range(n), key=lambda i: eu[i])
        fA = [c/sum(cA) for c in cA]
        ec = [sum(A[i][j]*fA[i] for i in range(n)) for j in range(m)]
        j = min(range(m), key=lambda j: ec[j])
        cA[i] += 1; cB[j] += 1
    return cA, cB`,
  "Tit-for-Tat": `# Tit-for-Tat and friends
def tit_for_tat(my, opp):
    if not opp:                # first round
        return "C"             # start by cooperating
    return opp[-1]             # then copy opponent's last move

def tit_for_two_tats(my, opp):
    return "D" if opp[-2:] == ["D", "D"] else "C"

def generous_tft(my, opp, forgive=0.1):
    import random
    if not opp: return "C"
    if opp[-1] == "D" and random.random() < forgive:
        return "C"             # occasionally forgive
    return opp[-1]`,
  "El Farol Bar": `# El Farol Bar problem (Arthur, 1994)
import random

def el_farol(agents=100, weeks=100, capacity=0.6):
    threshold = int(agents * capacity)
    weight = [0.3 + random.random()*1.2 for _ in range(agents)]
    history = [agents // 2]
    for _ in range(weeks):
        last, going = history[-1], 0
        for a in range(agents):
            if min(agents, last*weight[a]) < threshold:
                going += 1      # expect it won't be crowded
        history.append(going)
    return history              # oscillates around the threshold`,
};

function InfoPanel({ algo, accent }: { algo: Algo; accent: string }) {
  const [tab, setTab] = useState<"explain" | "code">("explain");
  const ex = EXPLAIN[algo], cx = COMPLEXITY[algo];
  return (
    <div className="rounded-2xl overflow-hidden" style={panel}>
      <div className="flex items-center gap-1 px-3 pt-3">
        {(["explain", "code"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: tab === t ? accent : "oklch(1 0 0 / 6%)", color: tab === t ? "oklch(0.08 0.02 265)" : "oklch(0.65 0.04 255)", border: `1px solid ${tab === t ? accent : "oklch(1 0 0 / 10%)"}` }}>{t === "explain" ? "Explanation" : "Python code"}</button>
        ))}
        <span className="ml-auto flex gap-2 text-[10px] font-mono" style={{ color: "oklch(0.5 0.04 255)" }}><span>⏱ {cx.time}</span><span>▢ {cx.space}</span></span>
      </div>
      <div className="p-4">
        {tab === "explain" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "oklch(0.82 0.02 255)" }}>{ex.idea}</p>
              <div className="rounded-xl px-3 py-2.5 text-sm" style={{ background: `${accent}10`, border: `1px solid ${accent}26`, color: "oklch(0.78 0.03 255)" }}><span className="font-semibold" style={{ color: accent }}>Real-life: </span>{ex.real}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "oklch(0.5 0.04 255)" }}>How it works</div>
              <ol className="space-y-1.5">{ex.how.map((h, i) => <li key={i} className="flex gap-2.5 text-sm" style={{ color: "oklch(0.72 0.03 255)" }}><span className="shrink-0 h-5 w-5 rounded-md grid place-items-center text-[10px] font-bold" style={{ background: `${accent}22`, color: accent }}>{i + 1}</span><span>{h}</span></li>)}</ol>
            </div>
          </div>
        ) : (
          <pre className="overflow-x-auto rounded-xl p-3.5 text-[12px] leading-relaxed font-mono" style={{ background: "oklch(0.07 0.015 265)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(0.82 0.03 255)" }}><code>{CODE[algo]}</code></pre>
        )}
      </div>
    </div>
  );
}

const ALGOS: Algo[] = ["Nash Equilibrium", "Minimax", "Iterated Dilemma", "Fictitious Play", "Tit-for-Tat", "El Farol Bar"];

function GameTheoryPage() {
  const [algo, setAlgo] = useState<Algo>("Nash Equilibrium");
  const [speed, setSpeed] = useState(60);
  const accent = COLOR[algo];
  return (
    <div className="space-y-4 py-2">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><span className="text-lg" style={{ color: accent }}>♟</span><h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Game Theory</h1></div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>{DESC[algo]}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALGOS.map((name) => (
            <button key={name} onClick={() => setAlgo(name)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105" style={{ background: algo === name ? COLOR[name] : "oklch(1 0 0 / 6%)", color: algo === name ? "oklch(0.08 0.02 265)" : "oklch(0.65 0.04 255)", border: `1px solid ${algo === name ? COLOR[name] : "oklch(1 0 0 / 10%)"}`, boxShadow: algo === name ? `0 0 12px ${COLOR[name]}40` : "none" }}>{name}</button>
          ))}
        </div>
      </header>
      <div className="rounded-2xl p-4 flex items-center gap-3" style={panel}>
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.50 0.04 255)" }}>Animation Speed — {speed}</label>
        <input type="range" min={1} max={100} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-40" />
      </div>
      <div key={algo}>
        {algo === "Nash Equilibrium" && <NashViz speed={speed} accent={accent} />}
        {algo === "Minimax" && <MinimaxViz speed={speed} accent={accent} />}
        {algo === "Iterated Dilemma" && <IpdViz speed={speed} accent={accent} />}
        {algo === "Fictitious Play" && <FpViz speed={speed} accent={accent} />}
        {algo === "Tit-for-Tat" && <TftViz speed={speed} accent={accent} />}
        {algo === "El Farol Bar" && <ElFarolViz speed={speed} accent={accent} />}
      </div>
      <InfoPanel algo={algo} accent={accent} />
    </div>
  );
}
