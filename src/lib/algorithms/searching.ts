export type SearchStep = {
  array: number[];
  checking?: number;
  range?: [number, number];
  found?: number;
  eliminated: number[];
  highlight?: number[];
};

export function* linearSearch(arr: number[], target: number): Generator<SearchStep> {
  const eliminated: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    yield { array: arr, checking: i, eliminated: [...eliminated] };
    if (arr[i] === target) { yield { array: arr, found: i, eliminated: [...eliminated] }; return; }
    eliminated.push(i);
  }
  yield { array: arr, eliminated: [...eliminated] };
}

export function* binarySearch(arr: number[], target: number): Generator<SearchStep> {
  const eliminated: number[] = []; let l = 0, r = arr.length - 1;
  while (l <= r) {
    const m = Math.floor((l + r) / 2);
    yield { array: arr, checking: m, range: [l, r], eliminated: [...eliminated] };
    if (arr[m] === target) { yield { array: arr, found: m, eliminated: [...eliminated] }; return; }
    if (arr[m] < target) { for (let i = l; i <= m; i++) eliminated.push(i); l = m + 1; }
    else { for (let i = m; i <= r; i++) eliminated.push(i); r = m - 1; }
  }
  yield { array: arr, eliminated: [...eliminated] };
}

export function* jumpSearch(arr: number[], target: number): Generator<SearchStep> {
  const n = arr.length; const step = Math.floor(Math.sqrt(n));
  const eliminated: number[] = []; let prev = 0;
  let block = Math.min(step, n) - 1;
  while (arr[block] < target && block < n) {
    yield { array: arr, checking: block, range: [prev, block], eliminated: [...eliminated] };
    for (let i = prev; i < block; i++) eliminated.push(i);
    prev = block + 1; block = Math.min(block + step, n - 1);
  }
  for (let i = prev; i <= Math.min(block, n-1); i++) {
    yield { array: arr, checking: i, range: [prev, block], eliminated: [...eliminated] };
    if (arr[i] === target) { yield { array: arr, found: i, eliminated: [...eliminated] }; return; }
    eliminated.push(i);
  }
  yield { array: arr, eliminated: [...eliminated] };
}

export function* interpolationSearch(arr: number[], target: number): Generator<SearchStep> {
  const eliminated: number[] = []; let l = 0, r = arr.length - 1;
  while (l <= r && target >= arr[l] && target <= arr[r]) {
    const range = arr[r] - arr[l]; const pos = range === 0 ? l : l + Math.floor(((target - arr[l]) / range) * (r - l));
    yield { array: arr, checking: pos, range: [l, r], eliminated: [...eliminated] };
    if (arr[pos] === target) { yield { array: arr, found: pos, eliminated: [...eliminated] }; return; }
    if (arr[pos] < target) { for (let i = l; i <= pos; i++) eliminated.push(i); l = pos + 1; }
    else { for (let i = pos; i <= r; i++) eliminated.push(i); r = pos - 1; }
  }
  yield { array: arr, eliminated: [...eliminated] };
}

export function* exponentialSearch(arr: number[], target: number): Generator<SearchStep> {
  const eliminated: number[] = []; const n = arr.length;
  if (arr[0] === target) { yield { array: arr, found: 0, eliminated: [] }; return; }
  let i = 1;
  while (i < n && arr[i] <= target) { yield { array: arr, checking: i, eliminated: [...eliminated] }; i *= 2; }
  const l = Math.floor(i/2), r = Math.min(i, n-1);
  for (let k = 0; k < l; k++) eliminated.push(k);
  let lo = l, hi = r;
  while (lo <= hi) {
    const m = Math.floor((lo+hi)/2);
    yield { array: arr, checking: m, range: [lo, hi], eliminated: [...eliminated] };
    if (arr[m] === target) { yield { array: arr, found: m, eliminated: [...eliminated] }; return; }
    if (arr[m] < target) lo = m+1; else hi = m-1;
  }
  yield { array: arr, eliminated: [...eliminated] };
}

export function* ternarySearch(arr: number[], target: number): Generator<SearchStep> {
  const eliminated: number[] = []; let l = 0, r = arr.length - 1;
  while (l <= r) {
    const m1 = l + Math.floor((r-l)/3);
    const m2 = r - Math.floor((r-l)/3);
    yield { array: arr, checking: m1, range: [l, r], eliminated: [...eliminated], highlight: [m1, m2] };
    if (arr[m1] === target) { yield { array: arr, found: m1, eliminated: [...eliminated] }; return; }
    yield { array: arr, checking: m2, range: [l, r], eliminated: [...eliminated], highlight: [m1, m2] };
    if (arr[m2] === target) { yield { array: arr, found: m2, eliminated: [...eliminated] }; return; }
    if (target < arr[m1]) { for (let i = m1; i <= r; i++) eliminated.push(i); r = m1 - 1; }
    else if (target > arr[m2]) { for (let i = l; i <= m2; i++) eliminated.push(i); l = m2 + 1; }
    else { for (let i = l; i < m1; i++) eliminated.push(i); for (let i = m2+1; i <= r; i++) eliminated.push(i); l = m1+1; r = m2-1; }
  }
  yield { array: arr, eliminated: [...eliminated] };
}

export function* fibonacciSearch(arr: number[], target: number): Generator<SearchStep> {
  const n = arr.length;
  const eliminated: number[] = [];
  let fbK2 = 0; // (k-2)'th Fibonacci
  let fbK1 = 1; // (k-1)'th Fibonacci
  let fbK = fbK2 + fbK1; // k'th Fibonacci
  while (fbK < n) {
    fbK2 = fbK1;
    fbK1 = fbK;
    fbK = fbK2 + fbK1;
  }
  let offset = -1;
  while (fbK > 1) {
    const i = Math.min(offset + fbK2, n - 1);
    yield { array: arr, checking: i, range: [offset + 1, n - 1], eliminated: [...eliminated] };
    if (arr[i] < target) {
      for (let k = offset + 1; k <= i; k++) eliminated.push(k);
      fbK = fbK1;
      fbK1 = fbK2;
      fbK2 = fbK - fbK1;
      offset = i;
    } else if (arr[i] > target) {
      for (let k = i; k < n; k++) eliminated.push(k);
      fbK = fbK2;
      fbK1 = fbK1 - fbK2;
      fbK2 = fbK - fbK1;
    } else {
      yield { array: arr, found: i, eliminated: [...eliminated] };
      return;
    }
  }
  if (fbK1 && offset + 1 < n && arr[offset + 1] === target) {
    yield { array: arr, found: offset + 1, eliminated: [...eliminated] };
    return;
  }
  yield { array: arr, eliminated: [...eliminated] };
}

export const SEARCHERS = {
  Linear: linearSearch, Binary: binarySearch, Jump: jumpSearch,
  Interpolation: interpolationSearch, Exponential: exponentialSearch, Ternary: ternarySearch,
  Fibonacci: fibonacciSearch,
} as const;

export type SearchName = keyof typeof SEARCHERS;
// keep old exports for compat
export { linearSearch as default };
