// String algorithms — step-by-step generators
export type StringStep = {
  text: string;
  pattern?: string;
  i?: number;       // current text pointer
  j?: number;       // current pattern pointer
  matches: number[]; // start indices of all matches found
  highlight?: number[];
  table?: number[];
  message?: string;
};

export function* naiveSearch(text: string, pattern: string): Generator<StringStep> {
  const n = text.length, m = pattern.length;
  const matches: number[] = [];
  for (let i = 0; i <= n - m; i++) {
    yield { text, pattern, i, j: 0, matches: [...matches], highlight: [i], message: `Window at ${i}` };
    let j = 0;
    while (j < m && text[i+j] === pattern[j]) {
      yield { text, pattern, i, j, matches: [...matches], highlight: Array.from({length:j+1},(_,k)=>i+k), message: `Match: '${pattern[j]}' at ${i+j}` };
      j++;
    }
    if (j === m) { matches.push(i); yield { text, pattern, i, matches: [...matches], message: `✓ Match at index ${i}` }; }
    else yield { text, pattern, i, j, matches: [...matches], message: `Mismatch at pos ${i+j}` };
  }
  yield { text, pattern, matches, message: matches.length ? `Found ${matches.length} match(es) at: [${matches.join(",")}]` : "No matches found" };
}

export function* kmpSearch(text: string, pattern: string): Generator<StringStep> {
  const n = text.length, m = pattern.length;
  // Build failure function
  const fail = new Array(m).fill(0);
  let k = 0;
  for (let i = 1; i < m; i++) {
    while (k > 0 && pattern[k] !== pattern[i]) k = fail[k-1];
    if (pattern[k] === pattern[i]) k++;
    fail[i] = k;
  }
  yield { text, pattern, table: [...fail], matches: [], message: `Failure table: [${fail.join(",")}]` };
  const matches: number[] = [];
  let q = 0;
  for (let i = 0; i < n; i++) {
    while (q > 0 && pattern[q] !== text[i]) { q = fail[q-1]; }
    if (pattern[q] === text[i]) q++;
    yield { text, pattern, i, j: q, matches: [...matches], highlight: Array.from({length:q},(_,k)=>i-q+1+k), message: `i=${i} q=${q}: '${text[i]}'${pattern[q-1]===text[i]?'=':'≠'}'${pattern[q-1]}'` };
    if (q === m) { matches.push(i-m+1); yield { text, pattern, i, matches: [...matches], message: `✓ Match at ${i-m+1}` }; q = fail[q-1]; }
  }
  yield { text, pattern, matches, message: matches.length ? `KMP: ${matches.length} match(es) at [${matches.join(",")}]` : "KMP: No matches" };
}

export function* rabinKarp(text: string, pattern: string): Generator<StringStep> {
  const n = text.length, m = pattern.length; const BASE = 31, MOD = 1e9+9;
  const matches: number[] = [];
  let pH = 0, tH = 0, power = 1;
  for (let i = 0; i < m; i++) { pH = (pH*BASE + pattern.charCodeAt(i)) % MOD; tH = (tH*BASE + text.charCodeAt(i)) % MOD; if (i) power = (power*BASE) % MOD; }
  yield { text, pattern, matches: [], message: `Pattern hash: ${pH}` };
  for (let i = 0; i <= n-m; i++) {
    yield { text, pattern, i, matches: [...matches], highlight: Array.from({length:m},(_,k)=>i+k), message: `Window hash: ${tH} ${tH===pH?'= MATCH!':'≠ pattern hash'}` };
    if (tH === pH) {
      if (text.slice(i, i+m) === pattern) { matches.push(i); yield { text, pattern, i, matches: [...matches], message: `✓ Confirmed match at ${i}` }; }
      else yield { text, pattern, i, matches: [...matches], message: `Hash collision at ${i} — strings differ` };
    }
    if (i < n-m) tH = ((tH - text.charCodeAt(i)*power % MOD + MOD) * BASE + text.charCodeAt(i+m)) % MOD;
  }
  yield { text, pattern, matches, message: matches.length ? `Rabin-Karp: matches at [${matches.join(",")}]` : "No matches" };
}

export function* zAlgorithm(text: string, pattern: string): Generator<StringStep> {
  const s = pattern + "$" + text; const n = s.length; const z = new Array(n).fill(0);
  let l = 0, r = 0; const matches: number[] = [];
  for (let i = 1; i < n; i++) {
    if (i < r) z[i] = Math.min(r-i, z[i-l]);
    while (i+z[i] < n && s[z[i]] === s[i+z[i]]) z[i]++;
    if (i+z[i] > r) { l = i; r = i+z[i]; }
    if (z[i] === pattern.length) {
      const idx = i - pattern.length - 1;
      matches.push(idx);
      yield { text, pattern, i: idx, matches: [...matches], table: z.slice(pattern.length+1), message: `Z[${i}]=${z[i]} → match at text[${idx}]` };
    } else {
      yield { text, pattern, table: z.slice(pattern.length+1), matches: [...matches], message: `Z[${i}]=${z[i]}` };
    }
  }
  yield { text, pattern, matches, table: z.slice(pattern.length+1), message: matches.length ? `Z-algo: matches at [${matches.join(",")}]` : "No matches" };
}

export function* boyerMoore(text: string, pattern: string): Generator<StringStep> {
  const n = text.length, m = pattern.length;
  // Bad character table
  const bad: Record<string, number> = {};
  for (let i = 0; i < m; i++) bad[pattern[i]] = i;
  const matches: number[] = [];
  let s = 0;
  while (s <= n - m) {
    let j = m - 1;
    while (j >= 0 && pattern[j] === text[s+j]) j--;
    yield { text, pattern, i: s+j, j, matches: [...matches], highlight: Array.from({length:m},(_,k)=>s+k), message: `Align at ${s}, checking from right` };
    if (j < 0) {
      matches.push(s);
      yield { text, pattern, i: s, matches: [...matches], message: `✓ Match at ${s}` };
      s += (s+m < n) ? m - (bad[text[s+m]] ?? -1) : 1;
    } else {
      const skip = Math.max(1, j - (bad[text[s+j]] ?? -1));
      yield { text, pattern, i: s+j, matches: [...matches], message: `Mismatch '${text[s+j]}': skip ${skip}` };
      s += skip;
    }
  }
  yield { text, pattern, matches, message: matches.length ? `BM: matches at [${matches.join(",")}]` : "No matches" };
}

export function* longestPalindrome(text: string): Generator<StringStep> {
  const n = text.length;
  let bestL = 0, bestR = 0;
  const expand = function* (l: number, r: number): Generator<StringStep> {
    while (l >= 0 && r < n && text[l] === text[r]) {
      yield {
        text,
        i: l,
        j: r,
        matches: [],
        highlight: Array.from({ length: r - l + 1 }, (_, k) => l + k),
        message: `Palindrome '${text.slice(l, r + 1)}' (len ${r - l + 1})`,
      };
      if (r - l > bestR - bestL) { bestL = l; bestR = r; }
      l--; r++;
    }
  };
  for (let c = 0; c < n; c++) {
    yield { text, i: c, j: c, matches: [], highlight: [c], message: `Center at index ${c}` };
    yield* expand(c, c);       // odd-length center
    yield* expand(c, c + 1);   // even-length center
  }
  yield {
    text,
    matches: [bestL],
    highlight: Array.from({ length: bestR - bestL + 1 }, (_, k) => bestL + k),
    message: `Longest: '${text.slice(bestL, bestR + 1)}' at index ${bestL}`,
  };
}

export const STRING_ALGOS = {
  "Naive": (t: string, p: string) => naiveSearch(t, p),
  "KMP": (t: string, p: string) => kmpSearch(t, p),
  "Rabin-Karp": (t: string, p: string) => rabinKarp(t, p),
  "Z-Algorithm": (t: string, p: string) => zAlgorithm(t, p),
  "Boyer-Moore": (t: string, p: string) => boyerMoore(t, p),
  "Longest Palindrome": (t: string, _p: string) => longestPalindrome(t),
} as const;
export type StringAlgoName = keyof typeof STRING_ALGOS;
