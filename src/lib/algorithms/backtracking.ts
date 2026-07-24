// Generators for backtracking visualizations: N-Queens, Knight's Tour, Tower of Hanoi.

// ────────────────────────────── N-QUEENS ──────────────────────────────
export type NQueensStep = {
  n: number;
  cols: number[];                 // cols[row] = column of queen, -1 if none
  row: number;                    // current row being processed
  trying?: number;                // column currently being tried
  placed?: number;                // just placed at this column
  backtrack?: number;             // backtracking from this column
  solutions: number;
  found?: boolean;                // a full solution was just found
  done?: boolean;
  message: string;
};

export function* nQueensGen(n = 6): Generator<NQueensStep> {
  const cols: number[] = new Array(n).fill(-1);
  let solutions = 0;

  yield { n, cols: [...cols], row: 0, solutions, message: `Solving ${n}-Queens` };

  const safe = (row: number, col: number) => {
    for (let r = 0; r < row; r++) {
      if (cols[r] === col) return false;
      if (Math.abs(cols[r] - col) === row - r) return false;
    }
    return true;
  };

  function* go(row: number): Generator<NQueensStep> {
    if (row === n) {
      solutions++;
      yield {
        n, cols: [...cols], row, solutions, found: true,
        message: `✓ Found solution #${solutions}`,
      };
      return;
    }
    for (let c = 0; c < n; c++) {
      yield {
        n, cols: [...cols], row, trying: c, solutions,
        message: `Try queen at row ${row}, col ${c}`,
      };
      if (safe(row, c)) {
        cols[row] = c;
        yield {
          n, cols: [...cols], row, placed: c, solutions,
          message: `Place queen at (${row}, ${c})`,
        };
        yield* go(row + 1);
        cols[row] = -1;
        yield {
          n, cols: [...cols], row, backtrack: c, solutions,
          message: `Backtrack from (${row}, ${c})`,
        };
      }
    }
  }

  yield* go(0);
  yield {
    n, cols: [...cols], row: n, solutions, done: true,
    message: `✓ Done — ${solutions} solution(s) found`,
  };
}

// ────────────────────────────── KNIGHT'S TOUR ──────────────────────────────
export type KnightStep = {
  n: number;
  board: number[][];              // 0 = unvisited, k = visited at step k
  pos: [number, number];
  step: number;
  message: string;
  done?: boolean;
  stuck?: boolean;
};

const KMOVES: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

export function* knightTourGen(n = 6): Generator<KnightStep> {
  const board: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  let r = 0, c = 0;
  board[r][c] = 1;
  yield {
    n, board: board.map(row => [...row]), pos: [r, c], step: 1,
    message: `Start at (0, 0)`,
  };

  const onBoard = (rr: number, cc: number) =>
    rr >= 0 && cc >= 0 && rr < n && cc < n;

  for (let step = 2; step <= n * n; step++) {
    let bestDeg = 99, br = -1, bc = -1;
    for (const [dr, dc] of KMOVES) {
      const nr = r + dr, nc = c + dc;
      if (!onBoard(nr, nc) || board[nr][nc]) continue;
      let deg = 0;
      for (const [mr, mc] of KMOVES) {
        const xr = nr + mr, xc = nc + mc;
        if (onBoard(xr, xc) && !board[xr][xc]) deg++;
      }
      if (deg < bestDeg) { bestDeg = deg; br = nr; bc = nc; }
    }
    if (br === -1) {
      yield {
        n, board: board.map(row => [...row]), pos: [r, c], step,
        stuck: true, message: `✗ Stuck at step ${step}`,
      };
      return;
    }
    r = br; c = bc; board[r][c] = step;
    yield {
      n, board: board.map(row => [...row]), pos: [r, c], step,
      message: `Step ${step}: move to (${r}, ${c})`,
    };
  }

  yield {
    n, board: board.map(row => [...row]), pos: [r, c], step: n * n, done: true,
    message: `✓ Completed full tour (${n * n} moves)`,
  };
}

// ────────────────────────────── TOWER OF HANOI ──────────────────────────────
export type HanoiStep = {
  pegs: number[][];               // pegs[0..2] = stack of disk sizes (bottom→top)
  moving?: number;                // disk size being moved
  from?: number;                  // 0/1/2
  to?: number;
  count: number;                  // moves made so far
  total: number;                  // 2^n - 1
  message: string;
  done?: boolean;
};

export function* hanoiGen(n = 4): Generator<HanoiStep> {
  const pegs: number[][] = [[], [], []];
  for (let i = n; i >= 1; i--) pegs[0].push(i);
  const total = (1 << n) - 1;
  let count = 0;
  const name = ["A", "B", "C"];

  yield {
    pegs: pegs.map(p => [...p]), count, total,
    message: `Start: ${n} disks on peg A`,
  };

  function* solve(k: number, from: number, to: number, via: number): Generator<HanoiStep> {
    if (k === 0) return;
    yield* solve(k - 1, from, via, to);
    const disk = pegs[from].pop()!;
    pegs[to].push(disk);
    count++;
    yield {
      pegs: pegs.map(p => [...p]), moving: disk, from, to, count, total,
      message: `Move ${count}/${total}: disk ${disk} ${name[from]} → ${name[to]}`,
    };
    yield* solve(k - 1, via, to, from);
  }

  yield* solve(n, 0, 2, 1);
  yield {
    pegs: pegs.map(p => [...p]), count, total, done: true,
    message: `✓ Solved in ${total} moves (optimal: 2^${n} − 1)`,
  };
}
