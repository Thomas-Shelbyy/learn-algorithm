export type SortStep = {
  array: number[];
  compare?: [number, number];
  swap?: [number, number];
  sorted: number[];
  pivot?: number;
  highlight?: number[];
};

export type SortGen = Generator<SortStep, void, unknown>;

export function* bubbleSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length; const sorted: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      yield { array: [...arr], compare: [j, j + 1], sorted: [...sorted] };
      if (arr[j] > arr[j + 1]) { [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]; yield { array: [...arr], swap: [j, j + 1], sorted: [...sorted] }; }
    }
    sorted.unshift(n - 1 - i);
  }
  sorted.unshift(0);
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* selectionSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length; const sorted: number[] = [];
  for (let i = 0; i < n; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) { yield { array: [...arr], compare: [min, j], sorted: [...sorted] }; if (arr[j] < arr[min]) min = j; }
    if (min !== i) { [arr[i], arr[min]] = [arr[min], arr[i]]; yield { array: [...arr], swap: [i, min], sorted: [...sorted] }; }
    sorted.push(i);
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* insertionSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length;
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      yield { array: [...arr], compare: [j - 1, j], sorted: [] };
      if (arr[j - 1] > arr[j]) { [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]]; yield { array: [...arr], swap: [j - 1, j], sorted: [] }; j--; } else break;
    }
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* mergeSort(a: number[]): SortGen {
  const arr = [...a];
  function* sort(l: number, r: number): SortGen {
    if (r - l < 1) return;
    const m = Math.floor((l + r) / 2);
    yield* sort(l, m); yield* sort(m + 1, r);
    const tmp: number[] = []; let i = l, j = m + 1;
    while (i <= m && j <= r) { yield { array: [...arr], compare: [i, j], sorted: [] }; if (arr[i] <= arr[j]) tmp.push(arr[i++]); else tmp.push(arr[j++]); }
    while (i <= m) tmp.push(arr[i++]);
    while (j <= r) tmp.push(arr[j++]);
    for (let k = 0; k < tmp.length; k++) { arr[l + k] = tmp[k]; yield { array: [...arr], swap: [l + k, l + k], sorted: [] }; }
  }
  yield* sort(0, arr.length - 1);
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* quickSort(a: number[]): SortGen {
  const arr = [...a];
  function* qs(l: number, r: number): SortGen {
    if (l >= r) return;
    const pivot = arr[r]; let i = l;
    for (let j = l; j < r; j++) {
      yield { array: [...arr], compare: [j, r], pivot: r, sorted: [] };
      if (arr[j] < pivot) { [arr[i], arr[j]] = [arr[j], arr[i]]; yield { array: [...arr], swap: [i, j], pivot: r, sorted: [] }; i++; }
    }
    [arr[i], arr[r]] = [arr[r], arr[i]];
    yield { array: [...arr], swap: [i, r], sorted: [] };
    yield* qs(l, i - 1); yield* qs(i + 1, r);
  }
  yield* qs(0, arr.length - 1);
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* heapSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length;
  function* heapify(size: number, i: number): SortGen {
    let largest = i, l = 2*i+1, r = 2*i+2;
    if (l < size) { yield { array: [...arr], compare: [largest, l], sorted: [] }; if (arr[l] > arr[largest]) largest = l; }
    if (r < size) { yield { array: [...arr], compare: [largest, r], sorted: [] }; if (arr[r] > arr[largest]) largest = r; }
    if (largest !== i) { [arr[i], arr[largest]] = [arr[largest], arr[i]]; yield { array: [...arr], swap: [i, largest], sorted: [] }; yield* heapify(size, largest); }
  }
  for (let i = Math.floor(n/2)-1; i >= 0; i--) yield* heapify(n, i);
  const sorted: number[] = [];
  for (let i = n-1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]]; sorted.unshift(i);
    yield { array: [...arr], swap: [0, i], sorted: [...sorted] };
    yield* heapify(i, 0);
  }
  sorted.unshift(0);
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* shellSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length;
  let gap = Math.floor(n/2);
  while (gap > 0) {
    for (let i = gap; i < n; i++) {
      let j = i;
      while (j >= gap) {
        yield { array: [...arr], compare: [j-gap, j], sorted: [], highlight: [j] };
        if (arr[j-gap] > arr[j]) { [arr[j-gap], arr[j]] = [arr[j], arr[j-gap]]; yield { array: [...arr], swap: [j-gap, j], sorted: [] }; j -= gap; } else break;
      }
    }
    gap = Math.floor(gap/2);
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* countingSort(a: number[]): SortGen {
  const arr = [...a]; const max = Math.max(...arr); const min = Math.min(...arr);
  const range = max - min + 1;
  const count = new Array(range).fill(0);
  for (let i = 0; i < arr.length; i++) { count[arr[i]-min]++; yield { array: [...arr], compare: [i, i], sorted: [], highlight: [i] }; }
  let idx = 0;
  for (let i = 0; i < range; i++) {
    while (count[i]-- > 0) { arr[idx] = i + min; yield { array: [...arr], swap: [idx, idx], sorted: [] }; idx++; }
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* radixSort(a: number[]): SortGen {
  const arr = [...a]; const max = Math.max(...arr);
  for (let exp = 1; Math.floor(max/exp) > 0; exp *= 10) {
    const output = new Array(arr.length).fill(0);
    const count = new Array(10).fill(0);
    for (let i = 0; i < arr.length; i++) { count[Math.floor(arr[i]/exp)%10]++; yield { array: [...arr], compare: [i, i], sorted: [], highlight: [i] }; }
    for (let i = 1; i < 10; i++) count[i] += count[i-1];
    for (let i = arr.length-1; i >= 0; i--) { output[count[Math.floor(arr[i]/exp)%10]-1] = arr[i]; count[Math.floor(arr[i]/exp)%10]--; }
    for (let i = 0; i < arr.length; i++) { arr[i] = output[i]; yield { array: [...arr], swap: [i, i], sorted: [] }; }
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* cocktailSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length; const sorted: number[] = [];
  let lo = 0, hi = n-1;
  while (lo < hi) {
    for (let i = lo; i < hi; i++) { yield { array: [...arr], compare: [i, i+1], sorted: [...sorted] }; if (arr[i] > arr[i+1]) { [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; yield { array: [...arr], swap: [i, i+1], sorted: [...sorted] }; } }
    sorted.unshift(hi--);
    for (let i = hi; i > lo; i--) { yield { array: [...arr], compare: [i-1, i], sorted: [...sorted] }; if (arr[i] < arr[i-1]) { [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; yield { array: [...arr], swap: [i-1, i], sorted: [...sorted] }; } }
    sorted.push(lo++);
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* gnomeSort(a: number[]): SortGen {
  const arr = [...a]; let i = 0;
  while (i < arr.length) {
    if (i === 0 || arr[i] >= arr[i-1]) { yield { array: [...arr], compare: [i, Math.max(0,i-1)], sorted: [], highlight: [i] }; i++; }
    else { yield { array: [...arr], compare: [i-1, i], sorted: [] }; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; yield { array: [...arr], swap: [i-1, i], sorted: [] }; i--; }
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* combSort(a: number[]): SortGen {
  const arr = [...a]; let gap = arr.length; const shrink = 1.3; let sorted = false;
  while (!sorted) {
    gap = Math.max(1, Math.floor(gap/shrink)); sorted = gap === 1;
    for (let i = 0; i+gap < arr.length; i++) {
      yield { array: [...arr], compare: [i, i+gap], sorted: [] };
      if (arr[i] > arr[i+gap]) { [arr[i], arr[i+gap]] = [arr[i+gap], arr[i]]; yield { array: [...arr], swap: [i, i+gap], sorted: [] }; sorted = false; }
    }
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* cycleSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length;
  for (let start = 0; start < n-1; start++) {
    let item = arr[start], pos = start;
    for (let i = start+1; i < n; i++) { yield { array: [...arr], compare: [start, i], sorted: [] }; if (arr[i] < item) pos++; }
    if (pos === start) continue;
    while (item === arr[pos]) pos++;
    [arr[pos], item] = [item, arr[pos]];
    yield { array: [...arr], swap: [start, pos], sorted: [] };
    while (pos !== start) {
      pos = start;
      for (let i = start+1; i < n; i++) { yield { array: [...arr], compare: [start, i], sorted: [] }; if (arr[i] < item) pos++; }
      while (item === arr[pos]) pos++;
      [arr[pos], item] = [item, arr[pos]];
      yield { array: [...arr], swap: [start, pos], sorted: [] };
    }
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* pancakeSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length; const sorted: number[] = [];
  const flip = function* (k: number): SortGen {
    let i = 0, j = k;
    while (i < j) {
      yield { array: [...arr], swap: [i, j], sorted: [...sorted] };
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++; j--;
    }
  };
  for (let size = n; size > 1; size--) {
    let maxIdx = 0;
    for (let i = 1; i < size; i++) {
      yield { array: [...arr], compare: [maxIdx, i], sorted: [...sorted] };
      if (arr[i] > arr[maxIdx]) maxIdx = i;
    }
    if (maxIdx !== size - 1) {
      if (maxIdx !== 0) yield* flip(maxIdx);        // bring max to front
      yield* flip(size - 1);                         // flip it to its place
    }
    sorted.unshift(size - 1);
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export function* oddEvenSort(a: number[]): SortGen {
  const arr = [...a]; const n = arr.length;
  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let i = 1; i < n - 1; i += 2) {            // odd phase
      yield { array: [...arr], compare: [i, i + 1], sorted: [] };
      if (arr[i] > arr[i + 1]) { [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; swapped = true; yield { array: [...arr], swap: [i, i + 1], sorted: [] }; }
    }
    for (let i = 0; i < n - 1; i += 2) {            // even phase
      yield { array: [...arr], compare: [i, i + 1], sorted: [] };
      if (arr[i] > arr[i + 1]) { [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; swapped = true; yield { array: [...arr], swap: [i, i + 1], sorted: [] }; }
    }
  }
  yield { array: [...arr], sorted: arr.map((_, i) => i) };
}

export const SORTERS = {
  Bubble: bubbleSort, Selection: selectionSort, Insertion: insertionSort,
  Merge: mergeSort, Quick: quickSort, Heap: heapSort, Shell: shellSort,
  Counting: countingSort, Radix: radixSort, Cocktail: cocktailSort,
  Gnome: gnomeSort, Comb: combSort, Cycle: cycleSort,
  Pancake: pancakeSort, "Odd-Even": oddEvenSort,
} as const;

export type SortName = keyof typeof SORTERS;
