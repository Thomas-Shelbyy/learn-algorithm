// Dynamic Programming algorithms — step-by-step table-filling generators
export type DPStep = {
  table: number[][];
  highlightCell?: [number, number];
  highlightCells?: [number, number][];
  result?: number | string;
  message?: string;
  traceback?: [number, number][];
  chosenItems?: number[];
};

export function* fibonacciDP(n: number): Generator<DPStep> {
  const table = [[0, 1, ...new Array(Math.max(0, n - 1)).fill(0)]];
  yield {
    table: table.map((r) => [...r]),
    message: "Initialize: fib(0)=0, fib(1)=1",
    highlightCell: [0, 0],
  };
  for (let i = 2; i <= n; i++) {
    table[0][i] = table[0][i - 1] + table[0][i - 2];
    yield {
      table: table.map((r) => [...r]),
      highlightCell: [0, i],
      highlightCells: [
        [0, i - 1],
        [0, i - 2],
      ],
      message: `fib(${i}) = fib(${i - 1}) + fib(${i - 2}) = ${table[0][i - 1]} + ${table[0][i - 2]} = ${table[0][i]}`,
    };
  }
  yield {
    table: table.map((r) => [...r]),
    result: table[0][n],
    message: `fib(${n}) = ${table[0][n]}`,
  };
}

export function* longestCommonSubsequence(s1: string, s2: string): Generator<DPStep> {
  const m = s1.length,
    n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  yield { table: dp.map((r) => [...r]), message: "Initialize LCS table with zeros" };
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        yield {
          table: dp.map((r) => [...r]),
          highlightCell: [i, j],
          highlightCells: [[i - 1, j - 1]],
          message: `'${s1[i - 1]}'='${s2[j - 1]}' → dp[${i}][${j}] = dp[${i - 1}][${j - 1}]+1 = ${dp[i][j]}`,
        };
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        yield {
          table: dp.map((r) => [...r]),
          highlightCell: [i, j],
          highlightCells: [
            [i - 1, j],
            [i, j - 1],
          ],
          message: `'${s1[i - 1]}'≠'${s2[j - 1]}' → max(${dp[i - 1][j]},${dp[i][j - 1]}) = ${dp[i][j]}`,
        };
      }
    }
  }
  yield { table: dp.map((r) => [...r]), result: dp[m][n], message: `LCS length = ${dp[m][n]}` };
}

export function* knapsack01(
  weights: number[],
  values: number[],
  capacity: number,
): Generator<DPStep> {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  yield { table: dp.map((r) => [...r]), message: "Initialize knapsack table" };
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
        yield {
          table: dp.map((r) => [...r]),
          highlightCell: [i, w],
          message: `Item ${i}(w=${weights[i - 1]},v=${values[i - 1]}), cap=${w}: max(${dp[i - 1][w]}, ${dp[i - 1][w - weights[i - 1]] + values[i - 1]})=${dp[i][w]}`,
        };
      } else {
        dp[i][w] = dp[i - 1][w];
        yield {
          table: dp.map((r) => [...r]),
          highlightCell: [i, w],
          message: `Item ${i} too heavy for cap=${w}, skip`,
        };
      }
    }
  }
  // Traceback
  const traceback: [number, number][] = [];
  let w = capacity;
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      traceback.push([i, w]);
      w -= weights[i - 1];
    }
  }
  yield {
    table: dp.map((r) => [...r]),
    result: dp[n][capacity],
    traceback,
    message: `Max value = ${dp[n][capacity]}`,
  };
}

export function* editDistance(s1: string, s2: string): Generator<DPStep> {
  const m = s1.length,
    n = s2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  yield { table: dp.map((r) => [...r]), message: "Initialize: base cases (empty string costs)" };
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
        yield {
          table: dp.map((r) => [...r]),
          highlightCell: [i, j],
          message: `'${s1[i - 1]}'='${s2[j - 1]}' → no cost, dp[${i}][${j}]=${dp[i][j]}`,
        };
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        yield {
          table: dp.map((r) => [...r]),
          highlightCell: [i, j],
          message: `'${s1[i - 1]}'≠'${s2[j - 1]}' → 1+min(del,ins,rep)=${dp[i][j]}`,
        };
      }
    }
  }
  yield { table: dp.map((r) => [...r]), result: dp[m][n], message: `Edit distance = ${dp[m][n]}` };
}

export function* coinChange(coins: number[], amount: number): Generator<DPStep> {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  const table = [dp.map((v) => (v === Infinity ? -1 : v))];
  yield { table: [...table], message: "dp[0]=0, rest=∞" };
  for (let i = 1; i <= amount; i++) {
    for (const c of coins) {
      if (c <= i && dp[i - c] + 1 < dp[i]) {
        dp[i] = dp[i - c] + 1;
        const row = dp.map((v) => (v === Infinity ? -1 : v));
        yield {
          table: [row],
          highlightCell: [0, i],
          message: `dp[${i}] = dp[${i - c}]+1 = ${dp[i]} (coin ${c})`,
        };
      }
    }
    if (dp[i] === Infinity)
      yield {
        table: [[...dp.map((v) => (v === Infinity ? -1 : v))]],
        highlightCell: [0, i],
        message: `dp[${i}] = ∞ (unreachable)`,
      };
  }
  yield {
    table: [[...dp.map((v) => (v === Infinity ? -1 : v))]],
    result: dp[amount] === Infinity ? -1 : dp[amount],
    message: dp[amount] === Infinity ? "No solution" : `Min coins = ${dp[amount]}`,
  };
}

export function* longestIncreasingSubsequence(arr: number[]): Generator<DPStep> {
  const n = arr.length;
  const dp = new Array(n).fill(1);
  const parent = new Array(n).fill(-1);
  yield { table: [arr, [...dp]], message: "Init: each element is LIS of length 1" };
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        parent[i] = j;
        yield {
          table: [arr, [...dp]],
          highlightCell: [1, i],
          highlightCells: [[1, j]],
          message: `arr[${i}]=${arr[i]} > arr[${j}]=${arr[j]}: dp[${i}]=${dp[i]}`,
        };
      }
    }
  }
  const maxLen = Math.max(...dp);
  let idx = dp.indexOf(maxLen);
  const seq: number[] = [];
  while (idx !== -1) {
    seq.unshift(arr[idx]);
    idx = parent[idx];
  }
  yield {
    table: [arr, [...dp]],
    result: maxLen,
    message: `LIS length=${maxLen}: [${seq.join(",")}]`,
  };
}

export function* subsetSum(nums: number[], target: number): Generator<DPStep> {
  const n = nums.length;
  // dp[i][s] = 1 if some subset of first i items sums to s, else 0.
  const dp = Array.from({ length: n + 1 }, () => new Array(target + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = 1; // empty subset sums to 0
  yield {
    table: dp.map((r) => [...r]),
    message: "Initialize: empty subset reaches sum 0 (column 0 = 1)",
    highlightCell: [0, 0],
  };
  for (let i = 1; i <= n; i++) {
    for (let s = 1; s <= target; s++) {
      const without = dp[i - 1][s];
      const withItem = s - nums[i - 1] >= 0 ? dp[i - 1][s - nums[i - 1]] : 0;
      dp[i][s] = without || withItem ? 1 : 0;
      yield {
        table: dp.map((r) => [...r]),
        highlightCell: [i, s],
        highlightCells:
          s - nums[i - 1] >= 0
            ? [[i - 1, s], [i - 1, s - nums[i - 1]]]
            : [[i - 1, s]],
        message: `Item ${nums[i - 1]}, sum ${s}: ${dp[i][s] ? "reachable" : "not reachable"}`,
      };
    }
  }
  // Traceback one valid subset if the target is reachable.
  const traceback: [number, number][] = [];
  const chosenItems: number[] = [];
  if (dp[n][target]) {
    let s = target;
    for (let i = n; i > 0 && s > 0; i--) {
      if (dp[i - 1][s] === 0 && s - nums[i - 1] >= 0 && dp[i - 1][s - nums[i - 1]]) {
        traceback.push([i, s]);
        chosenItems.push(i - 1);
        s -= nums[i - 1];
      }
    }
  }
  yield {
    table: dp.map((r) => [...r]),
    result: dp[n][target] ? "Yes" : "No",
    traceback,
    chosenItems,
    message: dp[n][target]
      ? `Target ${target} reachable with items {${chosenItems.map((i) => nums[i]).join(", ")}}`
      : `Target ${target} is not reachable`,
  };
}

export const DP_ALGOS = {
  Fibonacci: () => fibonacciDP(10),
  LCS: () => longestCommonSubsequence("ABCBDAB", "BDCAB"),
  "0/1 Knapsack": () => knapsack01([2, 3, 4, 5], [3, 4, 5, 6], 8),
  "Edit Distance": () => editDistance("SUNDAY", "SATURDAY"),
  "Coin Change": () => coinChange([1, 5, 10, 25], 41),
  LIS: () => longestIncreasingSubsequence([10, 9, 2, 5, 3, 7, 101, 18]),
  "Subset Sum": () => subsetSum([3, 4, 5, 2], 9),
} as const;
export type DPAlgoName = keyof typeof DP_ALGOS;
