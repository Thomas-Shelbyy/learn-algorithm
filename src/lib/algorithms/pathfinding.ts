export type Cell = { r: number; c: number };
export type Grid = number[][]; // 0 empty, 1 wall
export type PathStep = {
  visited: string[];
  frontier: string[];
  path?: string[];
  current?: string;
};

const key = (r: number, c: number) => `${r},${c}`;
const neighbors = (g: Grid, r: number, c: number): Cell[] => {
  const out: Cell[] = [];
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nc >= 0 && nr < g.length && nc < g[0].length && g[nr][nc] !== 1) {
      out.push({ r: nr, c: nc });
    }
  }
  return out;
};

function reconstruct(parent: Map<string, string>, end: string): string[] {
  const path: string[] = [];
  let cur: string | undefined = end;
  while (cur) {
    path.unshift(cur);
    cur = parent.get(cur);
  }
  return path;
}

export function* bfsPath(g: Grid, s: Cell, e: Cell): Generator<PathStep> {
  const start = key(s.r, s.c), end = key(e.r, e.c);
  const q: Cell[] = [s];
  const visited = new Set<string>([start]);
  const parent = new Map<string, string>();
  while (q.length) {
    const cur = q.shift()!;
    const ck = key(cur.r, cur.c);
    yield { visited: [...visited], frontier: q.map(c => key(c.r, c.c)), current: ck };
    if (ck === end) {
      yield { visited: [...visited], frontier: [], path: reconstruct(parent, end) };
      return;
    }
    for (const n of neighbors(g, cur.r, cur.c)) {
      const nk = key(n.r, n.c);
      if (!visited.has(nk)) {
        visited.add(nk);
        parent.set(nk, ck);
        q.push(n);
      }
    }
  }
  yield { visited: [...visited], frontier: [] };
}

// Dijkstra with uniform weights (effectively BFS, but uses PQ semantics)
export function* dijkstra(g: Grid, s: Cell, e: Cell): Generator<PathStep> {
  const start = key(s.r, s.c), end = key(e.r, e.c);
  const dist = new Map<string, number>([[start, 0]]);
  const parent = new Map<string, string>();
  const visited = new Set<string>();
  const open = new Set<string>([start]);
  while (open.size) {
    let curK: string | null = null;
    let best = Infinity;
    for (const k of open) {
      const d = dist.get(k) ?? Infinity;
      if (d < best) { best = d; curK = k; }
    }
    if (!curK) break;
    open.delete(curK);
    visited.add(curK);
    yield { visited: [...visited], frontier: [...open], current: curK };
    if (curK === end) {
      yield { visited: [...visited], frontier: [], path: reconstruct(parent, end) };
      return;
    }
    const [r, c] = curK.split(",").map(Number);
    for (const n of neighbors(g, r, c)) {
      const nk = key(n.r, n.c);
      if (visited.has(nk)) continue;
      const alt = (dist.get(curK) ?? 0) + 1;
      if (alt < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, alt);
        parent.set(nk, curK);
        open.add(nk);
      }
    }
  }
  yield { visited: [...visited], frontier: [] };
}

export function* aStar(g: Grid, s: Cell, e: Cell): Generator<PathStep> {
  const start = key(s.r, s.c), end = key(e.r, e.c);
  const h = (r: number, c: number) => Math.abs(r - e.r) + Math.abs(c - e.c);
  const gScore = new Map<string, number>([[start, 0]]);
  const fScore = new Map<string, number>([[start, h(s.r, s.c)]]);
  const parent = new Map<string, string>();
  const open = new Set<string>([start]);
  const visited = new Set<string>();
  while (open.size) {
    let curK: string | null = null;
    let best = Infinity;
    for (const k of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < best) { best = f; curK = k; }
    }
    if (!curK) break;
    open.delete(curK);
    visited.add(curK);
    yield { visited: [...visited], frontier: [...open], current: curK };
    if (curK === end) {
      yield { visited: [...visited], frontier: [], path: reconstruct(parent, end) };
      return;
    }
    const [r, c] = curK.split(",").map(Number);
    for (const n of neighbors(g, r, c)) {
      const nk = key(n.r, n.c);
      const tentative = (gScore.get(curK) ?? 0) + 1;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        parent.set(nk, curK);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + h(n.r, n.c));
        if (!visited.has(nk)) open.add(nk);
      }
    }
  }
  yield { visited: [...visited], frontier: [] };
}

export const PATHFINDERS = { BFS: bfsPath, Dijkstra: dijkstra, "A*": aStar } as const;
export type PathName = keyof typeof PATHFINDERS;