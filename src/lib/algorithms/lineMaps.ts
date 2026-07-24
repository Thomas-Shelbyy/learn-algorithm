// Maps a runtime visualizer step to highlighted C++ source lines.
// Line numbers are 1-indexed relative to each snippet in `python.ts`.
// Every algorithm now resolves to at least one line while it is running,
// so the "executing line" indicator works on every page.

import type { PySection } from "./python";

type StepFn = (step: any) => number[];

const has = (s: any, k: string) => s && Object.prototype.hasOwnProperty.call(s, k);
const m = (s: any) => (s?.message ?? "") as string;

// ────────────────────────────── SORTING (C++ STL) ──────────────────────────────
const SORTING: Record<string, StepFn> = {
  Bubble: (s) => {
    if (s?.swap) return [11];                       // swap(a[j], a[j+1])
    if (s?.compare) return [10];                    // if (a[j] > a[j+1])
    if (s?.sorted?.length === (s?.array?.length ?? 0)) return [15];
    return [];
  },
  Selection: (s) => {
    if (s?.swap) return [11];                       // swap(a[i], a[mn])
    if (s?.compare) return [9, 10];                 // for + if (a[j] < a[mn])
    return [];
  },
  Insertion: (s) => {
    if (s?.swap) return [9, 10];                    // while shift loop
    if (s?.compare) return [9];                     // a[j] > key
    return [];
  },
  Merge: (s) => {
    if (s?.compare) return [7, 8];                  // merge compare
    if (s?.swap) return [11];                       // write back a[l+k] = tmp[k]
    return [];
  },
  Quick: (s) => {
    if (s?.swap && has(s, "pivot")) return [8];     // swap(a[++i], a[j])
    if (s?.swap) return [9];                        // place pivot
    if (s?.compare) return [7, 8];
    if (has(s, "pivot")) return [6];                // pivot = a[hi]
    return [];
  },
  Heap: (s) => {
    if (s?.swap) return [7];                        // sort_heap pops repeatedly
    if (s?.compare) return [6];                     // make_heap sift compares
    return [];
  },
  Shell: (s) => {
    if (s?.swap) return [10, 11];
    if (s?.compare) return [10];
    return [];
  },
  Counting: (s) => {
    if (s?.swap) return [13];                       // write back a[idx++] = v + lo
    if (s?.compare || s?.highlight?.length) return [10]; // cnt[x - lo]++
    return [];
  },
  Radix: (s) => {
    if (s?.swap) return [13, 14];                   // out[...] = a[i]; a = out
    if (s?.compare || s?.highlight?.length) return [10]; // count digits
    return [];
  },
  Cocktail: (s) => {
    if (s?.swap) return [11, 15];
    if (s?.compare) return [10, 14];
    return [];
  },
  Gnome: (s) => {
    if (s?.swap) return [9];
    if (s?.compare) return [8];
    return [];
  },
  Comb: (s) => {
    if (s?.swap) return [12];
    if (s?.compare) return [11, 12];
    return [];
  },
  Cycle: (s) => {
    if (s?.swap) return [13, 19];                   // swap(a[pos], item)
    if (s?.compare) return [9, 10];                 // count smaller elements
    return [];
  },
  Pancake: (s) => {
    if (s?.swap) return [7];                         // flip swaps inside flip()
    if (s?.compare) return [15, 16];                // find max in prefix
    return [];
  },
  "Odd-Even": (s) => {
    if (s?.swap) return [10, 13];                    // swap on odd/even phase
    if (s?.compare) return [10, 13];                // compare adjacent
    return [];
  },
};

// ────────────────────────────── SEARCHING (C++ STL) ──────────────────────────────
const SEARCHING: Record<string, StepFn> = {
  Linear: (s) => {
    if (has(s, "found")) return [5, 6];
    if (has(s, "checking")) return [5];
    return [];
  },
  Binary: (s) => {
    if (has(s, "found")) return [9];
    if (has(s, "checking")) return [8, 10, 11];
    return [];
  },
  Jump: (s) => {
    if (has(s, "found")) return [12, 13];
    if (has(s, "checking")) return [7, 12];
    return [];
  },
  Exponential: (s) => {
    if (has(s, "found")) return [9, 14];
    if (has(s, "checking")) return [11, 13];
    return [];
  },
  Ternary: (s) => {
    if (has(s, "found")) return [9, 10];
    if (has(s, "checking")) return [7, 8];
    return [];
  },
  Interpolation: (s) => {
    if (has(s, "found")) return [9];
    if (has(s, "checking")) return [9];
    return [];
  },
  Fibonacci: (s) => {
    if (has(s, "found")) return [16];               // return i
    if (has(s, "checking")) return [13, 14, 15];    // probe + narrow range
    return [];
  },
};

// ────────────────────────────── TREE ──────────────────────────────
const TREE: Record<string, StepFn> = {
  BFS: (s) => (has(s, "visiting") ? [10, 11] : []),
  "DFS-In": (s) => (has(s, "visiting") ? [9, 10] : []),
  "DFS-Pre": (s) => (has(s, "visiting") ? [10, 11] : []),
  "DFS-Post": (s) => (has(s, "visiting") ? [10, 11] : []),
};

// ────────────────────────────── GRAPH ──────────────────────────────
const GRAPH: Record<string, StepFn> = {
  BFS: (s) => {
    if (has(s, "visiting")) return [9, 10];
    if (s?.highlight?.length) return [11];
    return [];
  },
  DFS: (s) => {
    if (has(s, "visiting")) return [9, 10];
    if (s?.highlight?.length) return [11, 12];
    return [];
  },
  Dijkstra: (s) => {
    if (has(s, "visiting")) return [13, 14];
    if (s?.highlight?.length) return [15, 16, 17];
    return [];
  },
  "Topological Sort": (s) => {
    if (has(s, "visiting")) return [12, 13];
    return [];
  },
  "Cycle Detection": (s) => {
    const msg = m(s);
    if (msg.includes("cycle") || msg.includes("back")) return [6];
    if (has(s, "visiting")) return [8, 9];
    return [];
  },
  "Prim MST": (s) => {
    if (has(s, "visiting")) return [10, 11];
    if (s?.highlight?.length) return [12, 13];
    return [];
  },
};

// ────────────────────────────── PATHFINDING ──────────────────────────────
const PATHFINDING: Record<string, StepFn> = {
  BFS: (s) => {
    if (s?.path?.length) return [20, 21];
    if (s?.current) return [12, 13];
    return [];
  },
  Dijkstra: (s) => {
    if (s?.path?.length) return [25, 26];
    if (s?.current) return [16, 17];
    return [];
  },
  "A*": (s) => {
    if (s?.path?.length) return [29, 30];
    if (s?.current) return [19, 20];
    return [];
  },
};

// ────────────────────────────── DP ──────────────────────────────
const DP: Record<string, StepFn> = {
  Fibonacci: (s) => {
    const msg = m(s);
    if (msg.startsWith("Initialize")) return [6, 7];
    if (msg.startsWith("fib(")) return [9];
    if (has(s, "result")) return [10];
    return [];
  },
  LCS: (s) => {
    const msg = m(s);
    if (msg.startsWith("Initialize")) return [6];
    if (has(s, "result")) return [11];
    if (msg.includes("=") && msg.includes("match")) return [9];
    if (has(s, "table")) return [9, 10];
    return [];
  },
  "0/1 Knapsack": (s) => {
    const msg = m(s);
    if (msg.startsWith("Initialize")) return [6];
    if (has(s, "result")) return [13];
    if (has(s, "table")) return [9, 10, 11];
    return [];
  },
  "Edit Distance": (s) => {
    const msg = m(s);
    if (msg.startsWith("Initialize")) return [7, 8];
    if (has(s, "result")) return [15];
    if (has(s, "table")) return [11, 12];
    return [];
  },
  "Coin Change": (s) => {
    const msg = m(s);
    if (msg.includes("∞") || msg.startsWith("dp[0]")) return [6, 7];
    if (has(s, "result")) return [12];
    if (has(s, "table")) return [10, 11];
    return [];
  },
  LIS: (s) => {
    const msg = m(s);
    if (msg.startsWith("Init")) return [5];
    if (has(s, "result")) return [11];
    if (has(s, "table")) return [7, 8, 9];
    return [];
  },
  "Subset Sum": (s) => {
    const msg = m(s);
    if (msg.startsWith("Initialize")) return [6, 7];
    if (has(s, "result")) return [16];
    if (has(s, "table")) return [12, 13, 14];
    return [];
  },
};

// ────────────────────────────── STRINGS ──────────────────────────────
const STRINGS: Record<string, StepFn> = {
  Naive: (s) => {
    const msg = m(s);
    if (msg.startsWith("✓")) return [9, 10];
    if (msg.startsWith("Match")) return [9];
    if (msg.startsWith("Mismatch")) return [11];
    if (has(s, "i")) return [7, 8];
    return [];
  },
  KMP: (s) => {
    const msg = m(s);
    if (msg.startsWith("Failure")) return [7, 8];
    if (msg.startsWith("✓")) return [20];
    if (has(s, "i")) return [18, 19];
    if (has(s, "matches")) return [18];
    return [];
  },
  "Rabin-Karp": (s) => {
    const msg = m(s);
    if (msg.startsWith("Pattern hash")) return [12, 13];
    if (msg.startsWith("✓")) return [17];
    if (msg.includes("collision")) return [17];
    if (msg.startsWith("Window hash")) return [16, 17];
    if (has(s, "matches")) return [19];
    return [];
  },
  "Z-Algorithm": (s) => {
    const msg = m(s);
    if (msg.includes("match at")) return [16, 17];
    if (msg.startsWith("Z[")) return [10, 11];
    if (has(s, "table")) return [9];
    return [];
  },
  "Boyer-Moore": (s) => {
    const msg = m(s);
    if (msg.toLowerCase().includes("match")) return [12];
    if (msg.toLowerCase().includes("mismatch")) return [13, 14];
    if (has(s, "i")) return [11, 12];
    return [];
  },
  "Longest Palindrome": (s) => {
    const msg = m(s);
    if (msg.startsWith("Longest")) return [16];        // return substr
    if (msg.startsWith("Palindrome")) return [9, 10];  // expand while equal
    if (msg.startsWith("Center")) return [13, 14];     // try each center
    return [];
  },
};

// ────────────────────────────── BACKTRACKING ──────────────────────────────
const BACKTRACKING: Record<string, StepFn> = {
  "N-Queens": (s) => {
    const msg = m(s);
    if (s?.backtrack) return [20];                  // cols[row] = -1 (backtrack)
    if (has(s, "trying") && s?.trying !== undefined) return [17, 18];
    if (msg.toLowerCase().includes("solution")) return [15];
    if (has(s, "row")) return [16];
    return [];
  },
  "Knight's Tour": (s) => {
    const msg = m(s);
    if (msg.toLowerCase().includes("complete") || msg.toLowerCase().includes("done")) return [32];
    if (msg.toLowerCase().includes("stuck") || msg.toLowerCase().includes("fail")) return [29];
    if (has(s, "pos")) return [26, 27, 30];         // pick best degree + move
    return [];
  },
  "Tower of Hanoi": (s) => {
    const msg = m(s);
    if (s?.moving) return [10, 11];                 // record/perform the move
    if (msg.toLowerCase().includes("solved") || has(s, "total")) return [17];
    if (has(s, "pegs")) return [9, 12];             // recursive calls
    return [];
  },
};

const SECTIONS: Record<PySection, Record<string, StepFn>> = {
  sorting: SORTING,
  searching: SEARCHING,
  strings: STRINGS,
  tree: TREE,
  graph: GRAPH,
  pathfinding: PATHFINDING,
  dp: DP,
  backtracking: BACKTRACKING,
  library: {}, // static catalogue page — no live step detection
};

export function inferLines(
  section: PySection,
  algo: string,
  step: any,
): number[] {
  const det = SECTIONS[section]?.[algo];
  if (!det || !step) return [];
  try {
    return det(step) ?? [];
  } catch {
    return [];
  }
}
