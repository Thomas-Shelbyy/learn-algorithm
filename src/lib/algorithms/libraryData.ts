// Library data: 50+ classic algorithms, each with a concise C++ STL
// implementation, complexity, category, and an explanation block consumed by
// the Library page. Kept in one file so contributors can add an entry in a
// single place.
//
// Why a separate module (not python.ts)? The original `python.ts > library`
// section ships only 15 entries and is referenced by other surfaces; we keep
// it as-is for back-compat and surface the richer catalogue here.

import type { PySnippet } from "./python";

export interface LibraryExplanation {
  /** Plain-language walkthrough of the idea. */
  howItWorks: string;
  /** Bullet list of common use cases. */
  whenToUse: string[];
  /** Complexity recap (also shown by the code panel). */
  time: string;
  space: string;
  /** A short, concrete walked example (input → output → reasoning). */
  example: string;
}

export interface LibraryEntry {
  category: string;
  snippet: PySnippet;
  explanation: LibraryExplanation;
}

const s = (str: string) => str.replace(/^\n/, "").replace(/\n[\t ]*$/, "");

// Helper to compress the verbosity of defining 50+ entries below.
function entry(
  category: string,
  time: string,
  space: string,
  code: string,
  ex: Omit<LibraryExplanation, "time" | "space">,
): LibraryEntry {
  return {
    category,
    snippet: { code: s(code), time, space },
    explanation: { time, space, ...ex },
  };
}

export const LIBRARY_DATA: Record<string, LibraryEntry> = {
  // ─────────────────────────── Strings ───────────────────────────
  "Boyer-Moore": entry(
    "Strings",
    "O(n/m) avg, O(nm) worst",
    "O(σ)",
    `
#include <bits/stdc++.h>
using namespace std;

// Bad-character heuristic. Returns first match index, or -1.
int boyerMoore(const string& text, const string& pat) {
    int n = text.size(), m = pat.size();
    if (m == 0) return 0;
    vector<int> bad(256, -1);
    for (int i = 0; i < m; ++i) bad[(unsigned char)pat[i]] = i;
    int s = 0;
    while (s <= n - m) {
        int j = m - 1;
        while (j >= 0 && pat[j] == text[s + j]) --j;
        if (j < 0) return s;
        s += max(1, j - bad[(unsigned char)text[s + j]]);
    }
    return -1;
}`,
    {
      howItWorks:
        "Scans the pattern right-to-left at each text position. On a mismatch, the bad-character table tells us how far we can safely shift the pattern based on the offending text character — often skipping many positions at once.",
      whenToUse: [
        "Searching long texts for a fixed pattern (grep-style tools).",
        "Pattern matching where the alphabet is large (ASCII / UTF-8 bytes).",
        "Cases where you want sub-linear average time without preprocessing the text.",
      ],
      example:
        'text = "HERE IS A SIMPLE EXAMPLE", pat = "EXAMPLE" → returns 17. After comparing "EXAMPLE" against "SIMPLE_" and mismatching on the space, the shift table jumps the pattern past the mismatch in one step.',
    },
  ),

  "Manacher": entry(
    "Strings",
    "O(n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

// Longest palindromic substring in linear time.
string manacher(const string& s) {
    string t = "^"; for (char c : s) { t += '#'; t += c; } t += "#$";
    int n = t.size(); vector<int> p(n, 0);
    int c = 0, r = 0;
    for (int i = 1; i < n - 1; ++i) {
        if (i < r) p[i] = min(r - i, p[2 * c - i]);
        while (t[i + p[i] + 1] == t[i - p[i] - 1]) ++p[i];
        if (i + p[i] > r) { c = i; r = i + p[i]; }
    }
    int len = 0, ctr = 0;
    for (int i = 1; i < n - 1; ++i)
        if (p[i] > len) { len = p[i]; ctr = i; }
    return s.substr((ctr - len) / 2, len);
}`,
    {
      howItWorks:
        "Inserts sentinels between characters so every palindrome has odd length, then sweeps a centre/radius pair across the string and reuses mirror information from already-known palindromes to avoid redundant comparisons.",
      whenToUse: [
        "Finding the longest palindromic substring.",
        "Counting all palindromic substrings (sum of radii).",
        "Preprocessing for problems that ask about palindromic structure.",
      ],
      example:
        '"babad" → "bab" (or "aba"). The algorithm grows a palindrome around each centre and reuses the radius from its mirror centre when safe.',
    },
  ),

  "KMP": entry(
    "Strings",
    "O(n + m)",
    "O(m)",
    `
#include <bits/stdc++.h>
using namespace std;

// Knuth-Morris-Pratt — finds all occurrences of pat in text.
vector<int> kmp(const string& text, const string& pat) {
    int n = text.size(), m = pat.size();
    vector<int> lps(m, 0), out;
    for (int i = 1, k = 0; i < m; ++i) {
        while (k && pat[k] != pat[i]) k = lps[k - 1];
        if (pat[k] == pat[i]) ++k;
        lps[i] = k;
    }
    for (int i = 0, k = 0; i < n; ++i) {
        while (k && pat[k] != text[i]) k = lps[k - 1];
        if (pat[k] == text[i]) ++k;
        if (k == m) { out.push_back(i - m + 1); k = lps[k - 1]; }
    }
    return out;
}`,
    {
      howItWorks:
        "Precomputes the longest proper prefix of the pattern that is also a suffix (LPS array). When a mismatch occurs during scanning, the LPS tells us how many characters we can keep instead of restarting.",
      whenToUse: [
        "Exact pattern matching with worst-case linear time.",
        "Counting occurrences of a substring.",
        "Building blocks for KMP-automaton DP problems.",
      ],
      example:
        'pat="abab" → lps=[0,0,1,2]. Scanning "ababcabab" emits positions [0,5].',
    },
  ),

  "Aho-Corasick": entry(
    "Strings",
    "O(Σ|patterns| + n + matches)",
    "O(Σ|patterns|)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Aho {
    struct Node { int next[26]; int fail = 0; vector<int> out; Node(){ fill(next, next+26, 0);} };
    vector<Node> t{1};
    void add(const string& p, int id) {
        int v = 0;
        for (char ch : p) {
            int c = ch - 'a';
            if (!t[v].next[c]) { t.push_back({}); t[v].next[c] = (int)t.size() - 1; }
            v = t[v].next[c];
        }
        t[v].out.push_back(id);
    }
    void build() {
        queue<int> q;
        for (int c = 0; c < 26; ++c) if (t[0].next[c]) q.push(t[0].next[c]);
        while (!q.empty()) {
            int v = q.front(); q.pop();
            for (int c = 0; c < 26; ++c) {
                int u = t[v].next[c];
                if (u) { t[u].fail = t[t[v].fail].next[c]; q.push(u); }
                else t[v].next[c] = t[t[v].fail].next[c];
            }
            for (int id : t[t[v].fail].out) t[v].out.push_back(id);
        }
    }
};`,
    {
      howItWorks:
        "Builds a trie of all patterns, then adds 'failure links' BFS-style so a single linear scan of the text reports every occurrence of every pattern.",
      whenToUse: [
        "Multi-pattern search (virus signatures, dictionary filtering, autocomplete).",
        "Streaming text scans where patterns are fixed but the corpus is huge.",
      ],
      example:
        'patterns = ["he","she","his","hers"], text = "ushers" → matches "she" at 1, "he" at 2, "hers" at 2.',
    },
  ),

  "Rabin-Karp": entry(
    "Strings",
    "O(n + m) avg",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

// Rolling-hash substring search. Returns first match index, or -1.
int rabinKarp(const string& t, const string& p) {
    const long long B = 131, M = 1000000007;
    int n = t.size(), m = p.size();
    if (m > n) return -1;
    long long hp = 0, ht = 0, pw = 1;
    for (int i = 0; i < m; ++i) {
        hp = (hp * B + p[i]) % M;
        ht = (ht * B + t[i]) % M;
        if (i) pw = pw * B % M;
    }
    for (int i = 0; i + m <= n; ++i) {
        if (hp == ht && t.compare(i, m, p) == 0) return i;
        if (i + m < n)
            ht = ((ht - t[i] * pw) % M * B % M + t[i + m] + M * M) % M;
    }
    return -1;
}`,
    {
      howItWorks:
        "Computes a polynomial hash of the pattern and slides a same-size window across the text, updating the window hash in O(1) per shift. Confirms candidates with a direct compare to avoid false positives.",
      whenToUse: [
        "Multiple-pattern search with the same length (compare hashes only).",
        "Plagiarism / fingerprinting (chunked rolling hashes).",
        "Problems that need substring equality checks in O(1) after preprocessing.",
      ],
      example:
        'pat="abc", text="xxabcyy". Hash slides: "xxa","xab","abc"← match.',
    },
  ),

  "Z-Algorithm": entry(
    "Strings",
    "O(n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

// z[i] = length of the longest substring starting at i that matches s.
vector<int> zFunction(const string& s) {
    int n = s.size();
    vector<int> z(n, 0);
    int l = 0, r = 0;
    for (int i = 1; i < n; ++i) {
        if (i < r) z[i] = min(r - i, z[i - l]);
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) ++z[i];
        if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
}`,
    {
      howItWorks:
        "Maintains a window [l, r) — the rightmost matched prefix — and reuses values from inside that window to skip comparisons, recomputing only when necessary.",
      whenToUse: [
        "Pattern matching via z(p + '#' + t).",
        "Finding all occurrences of a prefix inside a string.",
        "Periodicity and border computations.",
      ],
      example: "s = \"aabxaayaab\" → z = [0,1,0,0,2,1,0,3,1,0].",
    },
  ),

  "Suffix Array (n log²n)": entry(
    "Strings",
    "O(n log² n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

vector<int> suffixArray(const string& s) {
    int n = s.size();
    vector<int> sa(n), rk(n), tmp(n);
    for (int i = 0; i < n; ++i) { sa[i] = i; rk[i] = s[i]; }
    for (int k = 1;; k <<= 1) {
        auto cmp = [&](int a, int b) {
            if (rk[a] != rk[b]) return rk[a] < rk[b];
            int ra = a + k < n ? rk[a + k] : -1;
            int rb = b + k < n ? rk[b + k] : -1;
            return ra < rb;
        };
        sort(sa.begin(), sa.end(), cmp);
        tmp[sa[0]] = 0;
        for (int i = 1; i < n; ++i)
            tmp[sa[i]] = tmp[sa[i - 1]] + (cmp(sa[i - 1], sa[i]) ? 1 : 0);
        rk = tmp;
        if (rk[sa[n - 1]] == n - 1) break;
    }
    return sa;
}`,
    {
      howItWorks:
        "Sorts all suffixes by repeatedly doubling the comparison prefix length, ranking suffixes by pairs of prior ranks. Each doubling halves the work needed to distinguish suffixes.",
      whenToUse: [
        "Substring search after O(n log² n) preprocessing.",
        "Building blocks for LCP-array problems (longest repeated substring, distinct substrings).",
        "Compression / bioinformatics indexing.",
      ],
      example:
        "s = \"banana\" → sa = [5,3,1,0,4,2] (suffixes in lexicographic order: a, ana, anana, banana, na, nana).",
    },
  ),

  "Trie Insert/Search": entry(
    "Strings",
    "O(L) per op",
    "O(Σ × nodes)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Trie {
    struct Node { int next[26]; bool end = false; Node(){ fill(next,next+26,-1);} };
    vector<Node> t{ Node() };
    void insert(const string& w) {
        int v = 0;
        for (char ch : w) {
            int c = ch - 'a';
            if (t[v].next[c] == -1) { t.push_back({}); t[v].next[c] = (int)t.size() - 1; }
            v = t[v].next[c];
        }
        t[v].end = true;
    }
    bool contains(const string& w) {
        int v = 0;
        for (char ch : w) { int c = ch - 'a'; if (t[v].next[c] == -1) return false; v = t[v].next[c]; }
        return t[v].end;
    }
};`,
    {
      howItWorks:
        "Each node has a child pointer per alphabet letter, so inserting or searching a word walks one node per character — exact-match and prefix queries are O(L).",
      whenToUse: [
        "Autocomplete and spell-check.",
        "IP routing (with binary children).",
        "Dictionary prefix counts and longest-common-prefix queries.",
      ],
      example:
        'Insert ["car","cart","cat"], then contains("car") → true, contains("ca") → false (not marked as end).',
    },
  ),

  // ─────────────────────────── Math ───────────────────────────
  "Sieve of Eratosthenes": entry(
    "Math",
    "O(n log log n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

vector<int> sieve(int n) {
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (long long i = 2; i * i <= n; ++i)
        if (isPrime[i])
            for (long long j = i * i; j <= n; j += i) isPrime[j] = false;
    vector<int> primes;
    for (int i = 2; i <= n; ++i) if (isPrime[i]) primes.push_back(i);
    return primes;
}`,
    {
      howItWorks:
        "Starts with all numbers marked prime, then for each found prime p it crosses out p², p²+p, p²+2p … because smaller multiples were already crossed by smaller primes.",
      whenToUse: [
        "Precomputing all primes up to ~10⁷.",
        "Counting / iterating primes for number-theory problems.",
        "Base step for linear sieve / smallest prime factor tables.",
      ],
      example:
        "n=20 → 2,3,5,7,11,13,17,19. After processing 2 we cross 4,6,8,…; after 3 we cross 9,15; 5 crosses nothing new because 5×5=25>20.",
    },
  ),

  "Linear Sieve (SPF)": entry(
    "Math",
    "O(n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

// Smallest prime factor of every number up to n in linear time.
vector<int> linearSieve(int n) {
    vector<int> spf(n + 1, 0), primes;
    for (int i = 2; i <= n; ++i) {
        if (!spf[i]) { spf[i] = i; primes.push_back(i); }
        for (int p : primes) {
            if ((long long)p * i > n || p > spf[i]) break;
            spf[p * i] = p;
        }
    }
    return spf;
}`,
    {
      howItWorks:
        "Each composite is crossed out exactly once by its smallest prime factor — we stop the inner loop as soon as p divides i, guaranteeing one visit per number.",
      whenToUse: [
        "Fast factorisation of many numbers (divide by spf[x] repeatedly).",
        "Number-theoretic precomputation (multiplicative functions, Möbius).",
      ],
      example:
        "spf[12]=2, spf[15]=3, spf[49]=7. Factoring 84: 84/2=42, 42/2=21, 21/3=7, 7/7=1 → 2·2·3·7.",
    },
  ),

  "Euclidean GCD": entry(
    "Math",
    "O(log min(a,b))",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

long long gcd(long long a, long long b) {
    while (b) { a %= b; swap(a, b); }
    return a;
}

// Extended: ax + by = gcd(a, b).
long long extgcd(long long a, long long b, long long& x, long long& y) {
    if (!b) { x = 1; y = 0; return a; }
    long long x1, y1;
    long long g = extgcd(b, a % b, x1, y1);
    x = y1; y = x1 - (a / b) * y1;
    return g;
}`,
    {
      howItWorks:
        "Repeatedly replaces (a,b) with (b, a mod b). The remainder shrinks at least geometrically (Lamé bound), giving log-time termination. Extended GCD additionally tracks Bézout coefficients.",
      whenToUse: [
        "Reducing fractions, computing LCM = a/gcd(a,b)*b.",
        "Modular inverses via extended GCD when modulus is not prime.",
        "Solving linear Diophantine equations.",
      ],
      example:
        "gcd(48,18): 48%18=12, gcd(18,12) → 18%12=6, gcd(12,6) → 12%6=0 → 6.",
    },
  ),

  "Fast Modular Exponentiation": entry(
    "Math",
    "O(log e)",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

long long powmod(long long base, long long exp, long long m) {
    long long result = 1 % m;
    base %= m;
    while (exp > 0) {
        if (exp & 1) result = result * base % m;
        base = base * base % m;
        exp >>= 1;
    }
    return result;
}`,
    {
      howItWorks:
        "Reads the exponent bit-by-bit. Squaring `base` each step gives base^(2^k); multiplying into the result whenever the bit is set composes the answer in log₂ e steps.",
      whenToUse: [
        "Modular exponentiation for cryptography / number theory.",
        "Computing modular inverses by Fermat's little theorem when m is prime.",
        "Polynomial / matrix exponentiation (same skeleton).",
      ],
      example: "powmod(3,13,7): 13=1101₂ → 3·3⁴·3⁸ mod 7 = 3·4·2 mod 7 = 24 mod 7 = 3.",
    },
  ),

  "Miller-Rabin Primality": entry(
    "Math",
    "O(k log³ n)",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

using u128 = __uint128_t;
long long mulmod(long long a, long long b, long long m) { return (u128)a * b % m; }
long long powmod(long long a, long long e, long long m) {
    long long r = 1 % m; a %= m;
    while (e) { if (e & 1) r = mulmod(r, a, m); a = mulmod(a, a, m); e >>= 1; }
    return r;
}
bool millerRabin(long long n) {
    if (n < 2) return false;
    for (long long p : {2,3,5,7,11,13,17,19,23,29,31,37}) {
        if (n == p) return true;
        if (n % p == 0) return false;
    }
    long long d = n - 1; int r = 0;
    while (!(d & 1)) { d >>= 1; ++r; }
    for (long long a : {2,3,5,7,11,13,17,19,23,29,31,37}) {
        long long x = powmod(a, d, n);
        if (x == 1 || x == n - 1) continue;
        bool composite = true;
        for (int i = 0; i < r - 1; ++i) { x = mulmod(x, x, n); if (x == n - 1) { composite = false; break; } }
        if (composite) return false;
    }
    return true;
}`,
    {
      howItWorks:
        "Writes n-1 = 2^r · d and, for each witness `a`, checks whether a^d or successive squarings hit ±1 mod n. With the deterministic witness set shown, the test is exact for all n < 3.3·10²⁴.",
      whenToUse: [
        "Primality testing of 64-bit integers.",
        "Building Pollard-Rho factorisation.",
      ],
      example: "n=561 (Carmichael) is correctly reported composite because witness 2 fails the squaring chain.",
    },
  ),

  "Pollard's Rho Factorisation": entry(
    "Math",
    "O(n^{1/4})",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;
using u128 = __uint128_t;
long long mulmod(long long a,long long b,long long m){ return (u128)a*b%m; }
long long pollardRho(long long n) {
    if (n % 2 == 0) return 2;
    long long x = rand() % (n - 2) + 2, y = x, c = rand() % (n - 1) + 1, d = 1;
    while (d == 1) {
        x = (mulmod(x, x, n) + c) % n;
        y = (mulmod(y, y, n) + c) % n; y = (mulmod(y, y, n) + c) % n;
        d = __gcd(llabs(x - y), n);
    }
    return d == n ? 0 : d;
}`,
    {
      howItWorks:
        "Generates a pseudo-random sequence x_{k+1}=x_k²+c mod n; Floyd's cycle detection finds two values whose difference shares a factor with n.",
      whenToUse: [
        "Factoring 64-bit numbers when trial division is too slow.",
        "Combine with Miller-Rabin to recurse on factors.",
      ],
      example: "n=8051 → rho often returns 97 within a few iterations; 8051 = 97·83.",
    },
  ),

  "Matrix Exponentiation": entry(
    "Math",
    "O(k³ log n)",
    "O(k²)",
    `
#include <bits/stdc++.h>
using namespace std;
using Mat = vector<vector<long long>>;
const long long MOD = 1e9 + 7;

Mat mul(const Mat& a, const Mat& b) {
    int n = a.size();
    Mat c(n, vector<long long>(n, 0));
    for (int i = 0; i < n; ++i)
        for (int k = 0; k < n; ++k) if (a[i][k])
            for (int j = 0; j < n; ++j)
                c[i][j] = (c[i][j] + a[i][k] * b[k][j]) % MOD;
    return c;
}
Mat matpow(Mat a, long long e) {
    int n = a.size();
    Mat r(n, vector<long long>(n, 0));
    for (int i = 0; i < n; ++i) r[i][i] = 1;
    while (e) { if (e & 1) r = mul(r, a); a = mul(a, a); e >>= 1; }
    return r;
}`,
    {
      howItWorks:
        "Identical pattern to fast modular exponentiation but applied to k×k matrices — works for any linear recurrence that can be packed into a transition matrix.",
      whenToUse: [
        "Computing Fibonacci-like recurrences in log n.",
        "DP problems with linear transitions over very long horizons.",
        "Counting walks of fixed length in a graph (A^n).",
      ],
      example:
        "fib(n) = [[1,1],[1,0]]^n · [1,0]ᵀ. Computing F(10⁹) in ~60 matrix multiplications.",
    },
  ),

  "Sieve of Linear Phi": entry(
    "Math",
    "O(n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

// Euler's totient for all i ≤ n in linear time.
vector<int> totientSieve(int n) {
    vector<int> phi(n + 1), primes;
    for (int i = 0; i <= n; ++i) phi[i] = i;
    for (int i = 2; i <= n; ++i)
        if (phi[i] == i)  // i is prime
            for (int j = i; j <= n; j += i) phi[j] -= phi[j] / i;
    return phi;
}`,
    {
      howItWorks:
        "Initialises phi[i]=i, then for each prime p subtracts phi[j]/p from every multiple of p — applying the product formula φ(p^a · q^b …) = n·∏(1-1/p) one prime at a time.",
      whenToUse: [
        "Counting integers coprime to i (φ(i)) for many i.",
        "Number-theoretic transforms and Möbius-style summations.",
      ],
      example: "φ(1)=1, φ(2)=1, φ(6)=2 (the coprime residues are 1,5).",
    },
  ),

  "Combinations nCr (Pascal)": entry(
    "Math",
    "O(n²) prep, O(1) query",
    "O(n²)",
    `
#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1e9 + 7;

vector<vector<long long>> pascal(int n) {
    vector<vector<long long>> C(n + 1, vector<long long>(n + 1, 0));
    for (int i = 0; i <= n; ++i) {
        C[i][0] = 1;
        for (int j = 1; j <= i; ++j) C[i][j] = (C[i-1][j-1] + C[i-1][j]) % MOD;
    }
    return C;
}`,
    {
      howItWorks:
        "Builds Pascal's triangle bottom-up using C(i,j) = C(i-1,j-1) + C(i-1,j). All values fit in a 2-D table, queries are constant time after.",
      whenToUse: [
        "Combinatorial DP with small n (≤ 5000).",
        "Avoids modular inverses when MOD is general.",
      ],
      example: "C(5,2) = 10. Pascal row 5: 1 5 10 10 5 1.",
    },
  ),

  // ─────────────────────────── DP ───────────────────────────
  "Matrix Chain Multiplication": entry(
    "DP",
    "O(n³)",
    "O(n²)",
    `
#include <bits/stdc++.h>
using namespace std;

long long matrixChain(const vector<int>& p) {
    int n = p.size() - 1;
    vector<vector<long long>> m(n, vector<long long>(n, 0));
    for (int L = 2; L <= n; ++L)
        for (int i = 0; i + L <= n; ++i) {
            int j = i + L - 1;
            m[i][j] = LLONG_MAX;
            for (int k = i; k < j; ++k) {
                long long q = m[i][k] + m[k+1][j] + 1LL*p[i]*p[k+1]*p[j+1];
                if (q < m[i][j]) m[i][j] = q;
            }
        }
    return m[0][n-1];
}`,
    {
      howItWorks:
        "Interval DP: m[i][j] is the minimum cost to multiply matrices i..j. Try every split point k and combine the two sub-products plus the cost of the final multiplication.",
      whenToUse: [
        "Optimising chained matrix multiplications.",
        "Template for other interval DPs (palindrome partitioning, optimal BST).",
      ],
      example:
        "Dimensions [10,30,5,60] → optimal parenthesisation ((A·B)·C) with cost 4500 instead of 27000.",
    },
  ),

  "Rod Cutting": entry(
    "DP",
    "O(n²)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

int rodCutting(const vector<int>& price, int n) {
    vector<int> dp(n + 1, 0);
    for (int i = 1; i <= n; ++i)
        for (int j = 0; j < i; ++j)
            dp[i] = max(dp[i], price[j] + dp[i - j - 1]);
    return dp[n];
}`,
    {
      howItWorks:
        "dp[i] = max revenue from a rod of length i. For each length i, try every first cut j+1 and add the optimal revenue from the remaining rod.",
      whenToUse: [
        "Unbounded-knapsack style problems where items have value by 'length'.",
        "Pricing / partitioning decisions with overlapping subproblems.",
      ],
      example:
        "price=[1,5,8,9,10,17,17,20], n=8 → 22 (cut 2+6).",
    },
  ),

  "Subset Sum": entry(
    "DP",
    "O(n·S)",
    "O(S)",
    `
#include <bits/stdc++.h>
using namespace std;

bool subsetSum(const vector<int>& nums, int target) {
    vector<bool> dp(target + 1, false);
    dp[0] = true;
    for (int x : nums)
        for (int s = target; s >= x; --s) dp[s] = dp[s] || dp[s - x];
    return dp[target];
}`,
    {
      howItWorks:
        "Pseudo-polynomial knapsack: dp[s] becomes true once some subset of the items processed so far sums to s. Iterating s from target down avoids reusing the same item twice in one round.",
      whenToUse: [
        "Partition / equal-sum problems.",
        "Feasibility questions with small sum bound.",
      ],
      example: "nums=[3,34,4,12,5,2], target=9 → true (4+5).",
    },
  ),

  "0/1 Knapsack": entry(
    "DP",
    "O(n·W)",
    "O(W)",
    `
#include <bits/stdc++.h>
using namespace std;

int knapsack01(const vector<int>& w, const vector<int>& v, int W) {
    int n = w.size();
    vector<int> dp(W + 1, 0);
    for (int i = 0; i < n; ++i)
        for (int c = W; c >= w[i]; --c)
            dp[c] = max(dp[c], dp[c - w[i]] + v[i]);
    return dp[W];
}`,
    {
      howItWorks:
        "Maintain dp[c] = best value achievable with capacity ≤ c. For each item, sweep capacities from W down to w[i] so each item contributes at most once.",
      whenToUse: [
        "Allocation problems with hard capacity and indivisible items.",
        "Build on it for bounded / 0-1 multi-dimensional variants.",
      ],
      example:
        "weights=[1,3,4,5], values=[1,4,5,7], W=7 → 9 (items of weight 3 and 4).",
    },
  ),

  "Unbounded Knapsack": entry(
    "DP",
    "O(n·W)",
    "O(W)",
    `
#include <bits/stdc++.h>
using namespace std;

int knapsackUnbounded(const vector<int>& w, const vector<int>& v, int W) {
    int n = w.size();
    vector<int> dp(W + 1, 0);
    for (int c = 0; c <= W; ++c)
        for (int i = 0; i < n; ++i)
            if (w[i] <= c) dp[c] = max(dp[c], dp[c - w[i]] + v[i]);
    return dp[W];
}`,
    {
      howItWorks:
        "Same DP as 0/1 knapsack but sweeping capacities ascending so each item can be picked any number of times.",
      whenToUse: [
        "Coin change (max coins) / rod cutting variants.",
        "Resource allocation with unlimited supply per item type.",
      ],
      example: "w=[2,3,4], v=[4,5,6], W=8 → 16 (four items of weight 2).",
    },
  ),

  "Longest Common Subsequence": entry(
    "DP",
    "O(n·m)",
    "O(n·m)",
    `
#include <bits/stdc++.h>
using namespace std;

int lcs(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; ++i)
        for (int j = 1; j <= m; ++j)
            dp[i][j] = (a[i-1] == b[j-1]) ? dp[i-1][j-1] + 1
                                          : max(dp[i-1][j], dp[i][j-1]);
    return dp[n][m];
}`,
    {
      howItWorks:
        "dp[i][j] is the LCS length of a[..i] and b[..j]. If endpoints match it extends the diagonal; otherwise it carries the better of dropping one character from either side.",
      whenToUse: [
        "Diff tools and version control.",
        "Bioinformatics sequence comparison.",
        "Backbone for edit distance and shortest common supersequence.",
      ],
      example: '"AGCAT","GAC" → 2 (e.g. "GA" or "AC").',
    },
  ),

  "Longest Increasing Subsequence": entry(
    "DP",
    "O(n log n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

int lis(const vector<int>& a) {
    vector<int> tails;
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return tails.size();
}`,
    {
      howItWorks:
        "`tails[i]` holds the smallest possible tail of an increasing subsequence of length i+1. Binary search keeps the array sorted; replacing instead of inserting keeps tails minimal, leaving room for longer extensions.",
      whenToUse: [
        "Longest increasing / non-decreasing subsequence in O(n log n).",
        "Patience sorting framework problems (Russian dolls, box stacking).",
      ],
      example: "[10,9,2,5,3,7,101,18] → 4 (e.g. 2,3,7,18).",
    },
  ),

  "Edit Distance": entry(
    "DP",
    "O(n·m)",
    "O(n·m)",
    `
#include <bits/stdc++.h>
using namespace std;

int editDistance(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1));
    for (int i = 0; i <= n; ++i) dp[i][0] = i;
    for (int j = 0; j <= m; ++j) dp[0][j] = j;
    for (int i = 1; i <= n; ++i)
        for (int j = 1; j <= m; ++j)
            dp[i][j] = (a[i-1] == b[j-1])
                ? dp[i-1][j-1]
                : 1 + min({ dp[i-1][j], dp[i][j-1], dp[i-1][j-1] });
    return dp[n][m];
}`,
    {
      howItWorks:
        "dp[i][j] is the minimum number of single-character insert/delete/replace operations to turn a[..i] into b[..j]. The transition picks the cheapest of the three operations.",
      whenToUse: [
        "Spell-check suggestions (closest dictionary word).",
        "Fuzzy matching and bioinformatics alignment.",
      ],
      example: '"kitten" → "sitting" = 3 (k→s, e→i, +g).',
    },
  ),

  "Coin Change (count)": entry(
    "DP",
    "O(n·amount)",
    "O(amount)",
    `
#include <bits/stdc++.h>
using namespace std;

int coinChangeMin(const vector<int>& coins, int amount) {
    const int INF = 1e9;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int a = 1; a <= amount; ++a)
        for (int c : coins) if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
    return dp[amount] == INF ? -1 : dp[amount];
}`,
    {
      howItWorks:
        "dp[a] = fewest coins summing to a. For every amount, try every coin denomination and take the best transition.",
      whenToUse: [
        "Cash-register / change-making problems with arbitrary denominations.",
        "Pathfinding-style cost minimisation on integer states.",
      ],
      example: "coins=[1,2,5], amount=11 → 3 (5+5+1).",
    },
  ),

  "Catalan Numbers DP": entry(
    "DP",
    "O(n²)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

long long catalan(int n) {
    vector<long long> C(n + 1, 0);
    C[0] = 1;
    for (int i = 1; i <= n; ++i)
        for (int j = 0; j < i; ++j) C[i] += C[j] * C[i - 1 - j];
    return C[n];
}`,
    {
      howItWorks:
        "Uses the recurrence C(n)=Σ C(i)·C(n-1-i). Each term counts a way to split a structure (matched parentheses, BST, polygon triangulation) into two smaller ones.",
      whenToUse: [
        "Counting balanced bracket strings.",
        "Counting binary tree / triangulation structures.",
      ],
      example: "C(4) = 14 (number of valid bracket strings of length 8).",
    },
  ),

  "Kadane's Maximum Subarray": entry(
    "DP",
    "O(n)",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

long long kadane(const vector<int>& a) {
    long long best = LLONG_MIN, cur = 0;
    for (int x : a) {
        cur = max((long long)x, cur + x);
        best = max(best, cur);
    }
    return best;
}`,
    {
      howItWorks:
        "Decides at each index whether to extend the running subarray or restart at the current element. The local optimum is the global candidate; track the maximum across all positions.",
      whenToUse: [
        "Maximum contiguous sum, profit windows, max-energy paths.",
        "Building block for 2-D maximum sub-rectangle.",
      ],
      example: "[-2,1,-3,4,-1,2,1,-5,4] → 6 (subarray [4,-1,2,1]).",
    },
  ),

  // ─────────────────────────── Data Structures ───────────────────────────
  "Union-Find (DSU)": entry(
    "Data Structures",
    "O(α(n))",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct DSU {
    vector<int> parent, rank_;
    DSU(int n) : parent(n), rank_(n, 0) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (rank_[a] < rank_[b]) swap(a, b);
        parent[b] = a;
        if (rank_[a] == rank_[b]) ++rank_[a];
        return true;
    }
};`,
    {
      howItWorks:
        "Each set is represented as a tree, the root is the canonical id. Path compression flattens trees during find; union by rank attaches the shorter tree under the taller, keeping operations near O(1) amortised.",
      whenToUse: [
        "Kruskal MST and dynamic connectivity.",
        "Offline equivalence queries (network outages, percolation).",
      ],
      example:
        "Edges {(0,1),(1,2),(3,4)} → after unite calls, find(0)=find(2) but find(0)≠find(3).",
    },
  ),

  "Fenwick Tree (BIT)": entry(
    "Data Structures",
    "O(log n) per op",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Fenwick {
    vector<long long> bit;
    Fenwick(int n) : bit(n + 1, 0) {}
    void update(int i, long long v) {
        for (; i < (int)bit.size(); i += i & -i) bit[i] += v;
    }
    long long query(int i) {
        long long s = 0;
        for (; i > 0; i -= i & -i) s += bit[i];
        return s;
    }
    long long range(int l, int r) { return query(r) - query(l - 1); }
};`,
    {
      howItWorks:
        "Stores partial sums indexed by binary representation. The trick `i & -i` isolates the lowest set bit, walking up/down the implicit tree in log steps to update or accumulate.",
      whenToUse: [
        "Prefix-sum queries with point updates.",
        "Counting inversions while iterating.",
        "Order-statistic counting (with coordinate compression).",
      ],
      example:
        "Array [0,0,0,0,0]; update(1,3), update(3,2), query(3)=5, range(2,3)=2.",
    },
  ),

  "Segment Tree": entry(
    "Data Structures",
    "O(log n) per op",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct SegTree {
    int n; vector<long long> t;
    SegTree(int n) : n(n), t(4 * n, 0) {}
    void update(int node, int l, int r, int idx, long long v) {
        if (l == r) { t[node] = v; return; }
        int m = (l + r) / 2;
        if (idx <= m) update(node*2, l, m, idx, v);
        else update(node*2+1, m+1, r, idx, v);
        t[node] = t[node*2] + t[node*2+1];
    }
    long long query(int node, int l, int r, int ql, int qr) {
        if (qr < l || r < ql) return 0;
        if (ql <= l && r <= qr) return t[node];
        int m = (l + r) / 2;
        return query(node*2, l, m, ql, qr) + query(node*2+1, m+1, r, ql, qr);
    }
};`,
    {
      howItWorks:
        "A complete binary tree where each node stores an aggregate of its segment. Point updates walk a single root-to-leaf path; range queries visit O(log n) canonical segments.",
      whenToUse: [
        "Range sum/min/max with point updates.",
        "Generalises to lazy propagation, persistent variants, 2-D versions.",
      ],
      example: "Array [1,3,5,7]; query(0,2)=9; update(1,2,2); query(0,2)=8.",
    },
  ),

  "Sparse Table (RMQ)": entry(
    "Data Structures",
    "O(n log n) prep, O(1) query",
    "O(n log n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct SparseTable {
    int n; vector<vector<int>> st; vector<int> lg;
    SparseTable(const vector<int>& a) {
        n = a.size(); int K = log2(n) + 1;
        st.assign(K, vector<int>(n));
        lg.assign(n + 1, 0);
        for (int i = 2; i <= n; ++i) lg[i] = lg[i / 2] + 1;
        st[0] = a;
        for (int k = 1; k < K; ++k)
            for (int i = 0; i + (1 << k) <= n; ++i)
                st[k][i] = min(st[k-1][i], st[k-1][i + (1 << (k-1))]);
    }
    int query(int l, int r) {
        int k = lg[r - l + 1];
        return min(st[k][l], st[k][r - (1 << k) + 1]);
    }
};`,
    {
      howItWorks:
        "Precomputes the answer on every interval whose length is a power of two. For an arbitrary [l,r] we cover it with two overlapping power-of-two intervals — valid for idempotent operations like min/max/gcd.",
      whenToUse: [
        "Static array range-min / max / gcd queries with constant-time response.",
        "Pair with Euler tour for LCA in O(1).",
      ],
      example: "Array [4,2,5,1,8]; query(1,3)=1.",
    },
  ),

  "Treap": entry(
    "Data Structures",
    "Expected O(log n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Treap {
    struct Node { int key, prio, size = 1; Node *l = nullptr, *r = nullptr; };
    Node* root = nullptr;
    int sz(Node* n) { return n ? n->size : 0; }
    void upd(Node* n) { if (n) n->size = 1 + sz(n->l) + sz(n->r); }
    void split(Node* t, int k, Node*& a, Node*& b) {
        if (!t) { a = b = nullptr; return; }
        if (t->key <= k) { split(t->r, k, t->r, b); a = t; }
        else { split(t->l, k, a, t->l); b = t; }
        upd(t);
    }
    Node* merge(Node* a, Node* b) {
        if (!a || !b) return a ? a : b;
        if (a->prio > b->prio) { a->r = merge(a->r, b); upd(a); return a; }
        b->l = merge(a, b->l); upd(b); return b;
    }
    void insert(int key) {
        Node* n = new Node{key, rand()};
        Node *a, *b; split(root, key, a, b); root = merge(merge(a, n), b);
    }
};`,
    {
      howItWorks:
        "Each node carries a key (BST order) and a random priority (heap order). Maintaining both invariants via split/merge yields expected balanced trees without rebalancing rules.",
      whenToUse: [
        "Ordered sets / multisets with custom operations.",
        "Implicit treaps for sequence reversal, k-th element, split/concat.",
      ],
      example:
        "Insert 5,3,8 in any order; an inorder walk yields 3,5,8 regardless of insertion sequence.",
    },
  ),

  "LRU Cache": entry(
    "Data Structures",
    "O(1) per op",
    "O(capacity)",
    `
#include <bits/stdc++.h>
using namespace std;

class LRUCache {
    int cap;
    list<pair<int,int>> lst;                 // key, value
    unordered_map<int, list<pair<int,int>>::iterator> mp;
public:
    LRUCache(int c) : cap(c) {}
    int get(int key) {
        auto it = mp.find(key);
        if (it == mp.end()) return -1;
        lst.splice(lst.begin(), lst, it->second);
        return it->second->second;
    }
    void put(int key, int val) {
        auto it = mp.find(key);
        if (it != mp.end()) { it->second->second = val; lst.splice(lst.begin(), lst, it->second); return; }
        if ((int)lst.size() == cap) { mp.erase(lst.back().first); lst.pop_back(); }
        lst.emplace_front(key, val); mp[key] = lst.begin();
    }
};`,
    {
      howItWorks:
        "Doubly-linked list orders items by recency, a hash map points to each list node. Each operation either splices a node to the front or evicts from the tail in constant time.",
      whenToUse: [
        "Caches with limited capacity (browsers, OS page cache).",
        "Memoization wrappers with eviction policy.",
      ],
      example:
        "cap=2; put(1,1) put(2,2) get(1)=1 put(3,3) → evicts key 2; get(2)=-1.",
    },
  ),

  "Monotonic Stack": entry(
    "Data Structures",
    "O(n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

// Next greater element to the right (-1 if none).
vector<int> nextGreater(const vector<int>& a) {
    int n = a.size();
    vector<int> ans(n, -1);
    stack<int> st;  // indices with decreasing values
    for (int i = 0; i < n; ++i) {
        while (!st.empty() && a[st.top()] < a[i]) { ans[st.top()] = a[i]; st.pop(); }
        st.push(i);
    }
    return ans;
}`,
    {
      howItWorks:
        "Maintains a stack whose values stay monotonic. When the new element breaks monotonicity, the popped elements have just found their answer — each index is pushed and popped at most once, giving linear time.",
      whenToUse: [
        "Next greater/smaller queries, largest rectangle in histogram.",
        "Stock-span style problems and tree-from-array constructions.",
      ],
      example: "[2,1,2,4,3] → [4,2,4,-1,-1].",
    },
  ),

  "Sliding Window Maximum": entry(
    "Data Structures",
    "O(n)",
    "O(k)",
    `
#include <bits/stdc++.h>
using namespace std;

vector<int> slidingMax(const vector<int>& a, int k) {
    deque<int> dq; vector<int> out;
    for (int i = 0; i < (int)a.size(); ++i) {
        while (!dq.empty() && dq.front() <= i - k) dq.pop_front();
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();
        dq.push_back(i);
        if (i >= k - 1) out.push_back(a[dq.front()]);
    }
    return out;
}`,
    {
      howItWorks:
        "A deque keeps candidate indices in decreasing order of their values. The front is always the maximum of the current window; outdated indices are popped from the front and dominated ones from the back.",
      whenToUse: [
        "Streaming max / min over a sliding window.",
        "Optimisations inside O(n²) DPs (e.g., constrained knapsack).",
      ],
      example: "a=[1,3,-1,-3,5,3,6,7], k=3 → [3,3,5,5,6,7].",
    },
  ),

  "Min-Heap (Priority Queue)": entry(
    "Data Structures",
    "O(log n) push/pop",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

// std::priority_queue is a max-heap; pass greater<> for a min-heap.
priority_queue<int, vector<int>, greater<int>> minHeap;
// minHeap.push(x), minHeap.top(), minHeap.pop()`,
    {
      howItWorks:
        "An implicit binary tree stored in an array: parent at i/2, children at 2i and 2i+1. Sift-up after push and sift-down after pop keep the heap property in log n time.",
      whenToUse: [
        "Dijkstra / Prim where you pop the smallest tentative cost.",
        "K-way merge, top-K problems, scheduling.",
      ],
      example: "push 4,1,3 → top=1; pop → top=3.",
    },
  ),

  // ─────────────────────────── Graph ───────────────────────────
  "Kosaraju SCC": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Kosaraju {
    int n; vector<vector<int>> g, gr; vector<bool> seen; vector<int> order, comp;
    Kosaraju(int n) : n(n), g(n), gr(n), seen(n, false), comp(n, -1) {}
    void add(int u, int v) { g[u].push_back(v); gr[v].push_back(u); }
    void dfs1(int u) { seen[u] = true; for (int v : g[u]) if (!seen[v]) dfs1(v); order.push_back(u); }
    void dfs2(int u, int c) { comp[u] = c; for (int v : gr[u]) if (comp[v] == -1) dfs2(v, c); }
    int run() {
        for (int i = 0; i < n; ++i) if (!seen[i]) dfs1(i);
        int c = 0;
        for (int i = n - 1; i >= 0; --i) if (comp[order[i]] == -1) dfs2(order[i], c++);
        return c;
    }
};`,
    {
      howItWorks:
        "First DFS records finishing order on the original graph. Processing nodes in reverse finishing order on the transposed graph reveals each SCC as one DFS tree.",
      whenToUse: [
        "Detecting cycles / clusters in directed graphs.",
        "Building condensation graphs for 2-SAT and reachability problems.",
      ],
      example:
        "Edges 1→2, 2→3, 3→1, 4→3 → 2 SCCs: {1,2,3} and {4}.",
    },
  ),

  "Tarjan SCC": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

struct TarjanSCC {
    int n, timer = 0, comps = 0;
    vector<vector<int>> g; vector<int> tin, low, comp; vector<bool> onStack;
    stack<int> st;
    TarjanSCC(int n) : n(n), g(n), tin(n, -1), low(n, -1), comp(n, -1), onStack(n, false) {}
    void add(int u, int v) { g[u].push_back(v); }
    void dfs(int u) {
        tin[u] = low[u] = timer++; st.push(u); onStack[u] = true;
        for (int v : g[u]) {
            if (tin[v] == -1) { dfs(v); low[u] = min(low[u], low[v]); }
            else if (onStack[v]) low[u] = min(low[u], tin[v]);
        }
        if (low[u] == tin[u]) {
            while (true) { int v = st.top(); st.pop(); onStack[v] = false; comp[v] = comps; if (v == u) break; }
            ++comps;
        }
    }
    int run() { for (int i = 0; i < n; ++i) if (tin[i] == -1) dfs(i); return comps; }
};`,
    {
      howItWorks:
        "Single DFS pass: each node receives a discovery time and a low-link; an SCC is identified when a node's low-link equals its discovery time, then popped from a running stack of unfinished nodes.",
      whenToUse: [
        "Single-pass SCC computation when you cannot easily build the transpose.",
        "Drop-in for 2-SAT and dominator algorithms.",
      ],
      example:
        "Same example as Kosaraju yields the same partition with one DFS instead of two.",
    },
  ),

  "Tarjan Bridges": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Bridges {
    int n, timer = 0;
    vector<vector<int>> g; vector<int> tin, low; vector<bool> seen;
    vector<pair<int,int>> bridges;
    Bridges(int n) : n(n), g(n), tin(n, -1), low(n, -1), seen(n, false) {}
    void add(int u, int v) { g[u].push_back(v); g[v].push_back(u); }
    void dfs(int u, int p) {
        seen[u] = true; tin[u] = low[u] = timer++;
        for (int v : g[u]) {
            if (v == p) continue;
            if (seen[v]) low[u] = min(low[u], tin[v]);
            else {
                dfs(v, u); low[u] = min(low[u], low[v]);
                if (low[v] > tin[u]) bridges.push_back({u, v});
            }
        }
    }
    vector<pair<int,int>> run() { for (int i = 0; i < n; ++i) if (!seen[i]) dfs(i, -1); return bridges; }
};`,
    {
      howItWorks:
        "Computes the lowest discovery time reachable from each subtree. An edge (u,v) is a bridge if no back-edge from v's subtree reaches u or higher.",
      whenToUse: [
        "Finding single-points-of-failure in a network.",
        "Pre-processing for biconnected components.",
      ],
      example: "Path 1-2-3 has bridges {1-2, 2-3}; adding 3-1 leaves no bridges.",
    },
  ),

  "Articulation Points": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

struct AP {
    int n, timer = 0;
    vector<vector<int>> g; vector<int> tin, low; vector<bool> seen, isAP;
    AP(int n) : n(n), g(n), tin(n, -1), low(n, -1), seen(n, false), isAP(n, false) {}
    void add(int u, int v) { g[u].push_back(v); g[v].push_back(u); }
    void dfs(int u, int p) {
        seen[u] = true; tin[u] = low[u] = timer++;
        int children = 0;
        for (int v : g[u]) {
            if (v == p) continue;
            if (seen[v]) low[u] = min(low[u], tin[v]);
            else {
                dfs(v, u); low[u] = min(low[u], low[v]);
                if (low[v] >= tin[u] && p != -1) isAP[u] = true;
                ++children;
            }
        }
        if (p == -1 && children > 1) isAP[u] = true;
    }
};`,
    {
      howItWorks:
        "Same low-link DFS as bridges; a vertex is an articulation point if a child's lowest reachable time isn't lower than its own discovery time. Roots need a separate two-child check.",
      whenToUse: [
        "Finding cut vertices in a network or social graph.",
      ],
      example: "Y-shape graph (1-2-3 with 2-4): 2 is the only articulation point.",
    },
  ),

  "Bipartite Check": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

bool isBipartite(const vector<vector<int>>& g) {
    int n = g.size();
    vector<int> color(n, -1);
    for (int s = 0; s < n; ++s) {
        if (color[s] != -1) continue;
        queue<int> q; q.push(s); color[s] = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : g[u]) {
                if (color[v] == -1) { color[v] = color[u] ^ 1; q.push(v); }
                else if (color[v] == color[u]) return false;
            }
        }
    }
    return true;
}`,
    {
      howItWorks:
        "BFS from each component, alternating colours. A clash between equal colours along an edge proves an odd cycle exists, meaning the graph isn't bipartite.",
      whenToUse: [
        "Two-colouring problems / scheduling without conflicts.",
        "Preprocessing for matching algorithms (Hopcroft-Karp).",
      ],
      example: "Square cycle (4 nodes) → bipartite; triangle → not bipartite.",
    },
  ),

  "Hopcroft-Karp Matching": entry(
    "Graph",
    "O(E√V)",
    "O(V+E)",
    `
#include <bits/stdc++.h>
using namespace std;

struct HopcroftKarp {
    int nL, nR;
    vector<vector<int>> g;
    vector<int> pairL, pairR, dist;
    static const int INF = INT_MAX;
    HopcroftKarp(int L, int R) : nL(L), nR(R), g(L), pairL(L, -1), pairR(R, -1), dist(L) {}
    void add(int u, int v) { g[u].push_back(v); }
    bool bfs() {
        queue<int> q;
        for (int u = 0; u < nL; ++u) {
            if (pairL[u] == -1) { dist[u] = 0; q.push(u); } else dist[u] = INF;
        }
        bool found = false;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : g[u]) {
                int pu = pairR[v];
                if (pu == -1) found = true;
                else if (dist[pu] == INF) { dist[pu] = dist[u] + 1; q.push(pu); }
            }
        }
        return found;
    }
    bool dfs(int u) {
        for (int v : g[u]) {
            int pu = pairR[v];
            if (pu == -1 || (dist[pu] == dist[u] + 1 && dfs(pu))) {
                pairL[u] = v; pairR[v] = u; return true;
            }
        }
        dist[u] = INF; return false;
    }
    int match() {
        int m = 0;
        while (bfs()) for (int u = 0; u < nL; ++u) if (pairL[u] == -1 && dfs(u)) ++m;
        return m;
    }
};`,
    {
      howItWorks:
        "Alternates BFS to find layered shortest augmenting paths with DFS to augment along them. Augmenting many paths per phase yields √V phases overall.",
      whenToUse: [
        "Maximum bipartite matching in dense graphs (assignment problems).",
        "Faster baseline before deciding you need min-cost flow.",
      ],
      example:
        "Workers vs. jobs: 3 workers each qualified for 2 jobs out of 3 — Hopcroft-Karp finds the maximum matching of size 3 in a few BFS/DFS rounds.",
    },
  ),

  "Topological Sort (Kahn)": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

vector<int> kahn(int n, const vector<vector<int>>& g) {
    vector<int> indeg(n, 0), order;
    for (int u = 0; u < n; ++u) for (int v : g[u]) ++indeg[v];
    queue<int> q;
    for (int i = 0; i < n; ++i) if (indeg[i] == 0) q.push(i);
    while (!q.empty()) {
        int u = q.front(); q.pop(); order.push_back(u);
        for (int v : g[u]) if (--indeg[v] == 0) q.push(v);
    }
    return order; // size < n ⇒ cycle exists
}`,
    {
      howItWorks:
        "Repeatedly removes a vertex with in-degree zero, decrementing in-degrees of its neighbours. Order of removal is a valid topological ordering; a stuck queue exposes cycles.",
      whenToUse: [
        "Course / dependency scheduling.",
        "DAG DP setup (process in topological order).",
      ],
      example:
        "Edges 5→2, 5→0, 4→0, 4→1, 2→3, 3→1 → one valid order [4,5,0,2,3,1].",
    },
  ),

  "Bellman-Ford": entry(
    "Graph",
    "O(V·E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Edge { int u, v, w; };
vector<long long> bellmanFord(int n, int src, const vector<Edge>& edges) {
    const long long INF = LLONG_MAX / 4;
    vector<long long> d(n, INF); d[src] = 0;
    for (int i = 0; i < n - 1; ++i)
        for (auto& e : edges)
            if (d[e.u] + e.w < d[e.v]) d[e.v] = d[e.u] + e.w;
    return d;
}`,
    {
      howItWorks:
        "Relaxes every edge up to V-1 times. After V-1 rounds, all shortest paths whose lengths are bounded above by V-1 edges are known; an extra round of relaxation detects negative cycles.",
      whenToUse: [
        "Shortest paths with negative edge weights.",
        "Detecting negative cycles (currency arbitrage).",
      ],
      example:
        "Edges (0→1, 1), (1→2, -3), (0→2, 4): result d=[0,1,-2].",
    },
  ),

  "Floyd-Warshall": entry(
    "Graph",
    "O(V³)",
    "O(V²)",
    `
#include <bits/stdc++.h>
using namespace std;

void floyd(vector<vector<long long>>& d) {
    int n = d.size();
    for (int k = 0; k < n; ++k)
        for (int i = 0; i < n; ++i)
            for (int j = 0; j < n; ++j)
                if (d[i][k] + d[k][j] < d[i][j])
                    d[i][j] = d[i][k] + d[k][j];
}`,
    {
      howItWorks:
        "Treats k as an allowed intermediate vertex. After iteration k, d[i][j] is the shortest path using only vertices {0..k} as intermediates.",
      whenToUse: [
        "All-pairs shortest paths in dense graphs (V ≤ ~400).",
        "Transitive closure (replace addition with OR).",
      ],
      example:
        "4-node complete graph with given weights — after iteration k=0..3 the matrix holds all-pairs distances.",
    },
  ),

  "Dijkstra (binary heap)": entry(
    "Graph",
    "O((V+E) log V)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

vector<long long> dijkstra(int n, int src, const vector<vector<pair<int,int>>>& g) {
    const long long INF = LLONG_MAX / 4;
    vector<long long> d(n, INF); d[src] = 0;
    priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [du, u] = pq.top(); pq.pop();
        if (du > d[u]) continue;
        for (auto [v, w] : g[u])
            if (du + w < d[v]) { d[v] = du + w; pq.push({d[v], v}); }
    }
    return d;
}`,
    {
      howItWorks:
        "Greedy: always relax edges from the unvisited node with the smallest tentative distance. A heap pops in O(log V) and we never revisit a node with a stale distance.",
      whenToUse: [
        "Non-negative weighted shortest paths.",
        "Network routing, map navigation backbone.",
      ],
      example:
        "From 0 in graph (0-1: 4, 0-2: 1, 2-1: 2, 1-3: 1): d=[0,3,1,4].",
    },
  ),

  "Prim MST": entry(
    "Graph",
    "O(E log V)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

long long prim(int n, const vector<vector<pair<int,int>>>& g) {
    vector<bool> inMST(n, false);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, 0});
    long long total = 0; int taken = 0;
    while (!pq.empty() && taken < n) {
        auto [w, u] = pq.top(); pq.pop();
        if (inMST[u]) continue;
        inMST[u] = true; total += w; ++taken;
        for (auto [v, ww] : g[u]) if (!inMST[v]) pq.push({ww, v});
    }
    return total;
}`,
    {
      howItWorks:
        "Grow the MST one vertex at a time, always taking the cheapest edge that connects an MST vertex to a non-MST vertex. A priority queue keeps candidate edges efficient.",
      whenToUse: [
        "Dense graphs / graphs given as adjacency lists.",
        "Network design problems where edges are continuously discovered.",
      ],
      example: "Triangle 1-2-3 with weights 1,2,3 → MST weight = 1+2 = 3.",
    },
  ),

  "Kruskal MST": entry(
    "Graph",
    "O(E log E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

struct DSU { vector<int> p, r; DSU(int n):p(n),r(n,0){iota(p.begin(),p.end(),0);} int f(int x){return p[x]==x?x:p[x]=f(p[x]);} bool u(int a,int b){a=f(a);b=f(b);if(a==b)return false;if(r[a]<r[b])swap(a,b);p[b]=a;if(r[a]==r[b])++r[a];return true;}};

struct Edge { int u, v, w; };
long long kruskal(int n, vector<Edge> edges) {
    sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b){ return a.w < b.w; });
    DSU dsu(n);
    long long total = 0;
    for (auto& e : edges) if (dsu.u(e.u, e.v)) total += e.w;
    return total;
}`,
    {
      howItWorks:
        "Sort edges by weight and accept each one that connects two previously disconnected components, tracked by Union-Find.",
      whenToUse: [
        "Sparse graphs / edge-list inputs.",
        "Offline MST when you already have all edges.",
      ],
      example: "Same triangle as Prim → 3.",
    },
  ),

  "BFS": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

vector<int> bfs(int n, int src, const vector<vector<int>>& g) {
    vector<int> dist(n, -1); queue<int> q;
    dist[src] = 0; q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u]) if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }
    }
    return dist;
}`,
    {
      howItWorks:
        "Explores vertices in increasing order of edge-distance using a FIFO queue. Each vertex is enqueued at most once, so each edge is examined a constant number of times.",
      whenToUse: [
        "Unweighted shortest paths.",
        "Level-order tree traversal, connected components in unweighted graphs.",
      ],
      example: "Path 0-1-2-3 from src=0 → dist=[0,1,2,3].",
    },
  ),

  "DFS": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

void dfs(int u, const vector<vector<int>>& g, vector<bool>& seen, vector<int>& order) {
    seen[u] = true; order.push_back(u);
    for (int v : g[u]) if (!seen[v]) dfs(v, g, seen, order);
}`,
    {
      howItWorks:
        "Recursively dives along each branch before backtracking. The implicit call stack (or an explicit one) drives the exploration.",
      whenToUse: [
        "Connectivity / cycle detection.",
        "Topological order via post-order, tree DP, backtracking templates.",
      ],
      example: "Same graph from 0 might visit 0,1,2,3 or 0,2,1,3 depending on adjacency order.",
    },
  ),

  "Eulerian Path (Hierholzer)": entry(
    "Graph",
    "O(V+E)",
    "O(V+E)",
    `
#include <bits/stdc++.h>
using namespace std;

vector<int> eulerianPath(int n, vector<vector<pair<int,int>>>& g, int m) {
    // g[u] holds {v, edgeId}; edges array tracks if each edge is used.
    vector<bool> used(m, false);
    vector<int> stack = {0}, path;
    vector<int> it(n, 0);
    while (!stack.empty()) {
        int u = stack.back();
        while (it[u] < (int)g[u].size() && used[g[u][it[u]].second]) ++it[u];
        if (it[u] == (int)g[u].size()) { path.push_back(u); stack.pop_back(); }
        else { auto [v, id] = g[u][it[u]++]; used[id] = true; stack.push_back(v); }
    }
    reverse(path.begin(), path.end());
    return path;
}`,
    {
      howItWorks:
        "Walks edges greedily until stuck, splicing in sub-tours found by backtracking through earlier vertices that still have unused edges. Hierholzer's clever stack-based formulation gives linear time.",
      whenToUse: [
        "Recovering a tour that uses each edge exactly once.",
        "De Bruijn sequence construction, sequencing in bioinformatics.",
      ],
      example: "Square with diagonal traversed gives an Eulerian circuit of length 5.",
    },
  ),

  "Edmonds-Karp Max Flow": entry(
    "Graph",
    "O(V·E²)",
    "O(V²)",
    `
#include <bits/stdc++.h>
using namespace std;

struct EK {
    int n;
    vector<vector<int>> cap, adj;
    EK(int n) : n(n), cap(n, vector<int>(n, 0)), adj(n) {}
    void add(int u, int v, int c) { cap[u][v] += c; adj[u].push_back(v); adj[v].push_back(u); }
    int bfs(int s, int t, vector<int>& parent) {
        fill(parent.begin(), parent.end(), -1); parent[s] = -2;
        queue<pair<int,int>> q; q.push({s, INT_MAX});
        while (!q.empty()) {
            auto [u, flow] = q.front(); q.pop();
            for (int v : adj[u]) if (parent[v] == -1 && cap[u][v] > 0) {
                parent[v] = u;
                int nf = min(flow, cap[u][v]);
                if (v == t) return nf;
                q.push({v, nf});
            }
        }
        return 0;
    }
    int maxflow(int s, int t) {
        int flow = 0, nf; vector<int> parent(n);
        while ((nf = bfs(s, t, parent))) {
            flow += nf; int cur = t;
            while (cur != s) { int prev = parent[cur]; cap[prev][cur] -= nf; cap[cur][prev] += nf; cur = prev; }
        }
        return flow;
    }
};`,
    {
      howItWorks:
        "Repeatedly finds the shortest augmenting path (in edge count) via BFS and pushes flow equal to its bottleneck capacity. BFS guarantees a polynomial bound independent of capacity magnitudes.",
      whenToUse: [
        "Bipartite matching as a special case.",
        "Project selection, image segmentation, flow problems with small graphs.",
      ],
      example:
        "Diamond graph s→a→t, s→b→t each capacity 1 gives max flow 2.",
    },
  ),

  // ─────────────────────────── Tree ───────────────────────────
  "Lowest Common Ancestor (Binary Lifting)": entry(
    "Tree",
    "O((n+q) log n)",
    "O(n log n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct LCA {
    int n, LOG;
    vector<vector<int>> up;
    vector<int> depth;
    LCA(int n) : n(n), LOG(ceil(log2(n)) + 1), up(LOG, vector<int>(n, 0)), depth(n, 0) {}
    void build(int root, const vector<vector<int>>& g) {
        function<void(int,int)> dfs = [&](int u, int p) {
            up[0][u] = p;
            for (int k = 1; k < LOG; ++k) up[k][u] = up[k-1][ up[k-1][u] ];
            for (int v : g[u]) if (v != p) { depth[v] = depth[u] + 1; dfs(v, u); }
        };
        dfs(root, root);
    }
    int lca(int a, int b) {
        if (depth[a] < depth[b]) swap(a, b);
        int diff = depth[a] - depth[b];
        for (int k = 0; k < LOG; ++k) if (diff >> k & 1) a = up[k][a];
        if (a == b) return a;
        for (int k = LOG - 1; k >= 0; --k)
            if (up[k][a] != up[k][b]) { a = up[k][a]; b = up[k][b]; }
        return up[0][a];
    }
};`,
    {
      howItWorks:
        "Precomputes 2^k-th ancestors for every node. To find an LCA, equalise depths by jumping in binary increments, then jump both pointers upward until their parents match.",
      whenToUse: [
        "Distance queries on trees (depth[a]+depth[b]-2·depth[lca]).",
        "Path queries combined with Euler tour / Fenwick trees.",
      ],
      example: "Tree 1-(2,3), 2-(4,5): lca(4,5)=2, lca(4,3)=1.",
    },
  ),

  "Heavy-Light Decomposition": entry(
    "Tree",
    "O(n log n) prep, O(log² n) query",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct HLD {
    int n, t = 0;
    vector<vector<int>> g; vector<int> par, dep, heavy, head, pos, sz;
    HLD(int n) : n(n), g(n), par(n), dep(n), heavy(n, -1), head(n), pos(n), sz(n) {}
    void add(int u, int v) { g[u].push_back(v); g[v].push_back(u); }
    int dfs(int u, int p) {
        par[u] = p; sz[u] = 1; int mx = 0;
        for (int v : g[u]) if (v != p) {
            dep[v] = dep[u] + 1;
            int s = dfs(v, u); sz[u] += s;
            if (s > mx) { mx = s; heavy[u] = v; }
        }
        return sz[u];
    }
    void decompose(int u, int h) {
        head[u] = h; pos[u] = t++;
        if (heavy[u] != -1) decompose(heavy[u], h);
        for (int v : g[u]) if (v != par[u] && v != heavy[u]) decompose(v, v);
    }
    void build(int root = 0) { dfs(root, root); decompose(root, root); }
};`,
    {
      howItWorks:
        "Partitions the tree into heavy chains (each node points to its largest child). Any root-to-node path crosses at most log n chains, so path queries become O(log n) segment-tree queries on each chain.",
      whenToUse: [
        "Path sum / update queries on trees.",
        "Tree problems that mix subtree and path queries.",
      ],
      example:
        "On a degenerate path of 8 nodes, HLD produces 1 chain; on a balanced binary tree, log n chains.",
    },
  ),

  "Euler Tour Subtree Sum": entry(
    "Tree",
    "O((n+q) log n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct EulerTour {
    int n, t = 0;
    vector<int> tin, tout, order;
    vector<vector<int>> g;
    EulerTour(int n) : n(n), tin(n), tout(n), g(n) {}
    void add(int u, int v) { g[u].push_back(v); g[v].push_back(u); }
    void dfs(int u, int p) {
        tin[u] = t++;
        for (int v : g[u]) if (v != p) dfs(v, u);
        tout[u] = t;
    }
    // Subtree of u corresponds to indices [tin[u], tout[u]) — pair with a BIT for sums.
};`,
    {
      howItWorks:
        "Flattens the tree into an array by recording entry and exit times. The subtree of any vertex maps to a contiguous range, turning subtree queries into range queries.",
      whenToUse: [
        "Subtree sum / count updates.",
        "Distance and ancestor queries with RMQ over depths.",
      ],
      example:
        "Pre-order on root 0 with children 1,2: tin=[0,1,2], tout=[3,2,3]; subtree of 0 is [0,3).",
    },
  ),

  "Morris Inorder Traversal": entry(
    "Tree",
    "O(n)",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Node { int val; Node *left = nullptr, *right = nullptr; };

vector<int> morrisInorder(Node* root) {
    vector<int> out; Node* cur = root;
    while (cur) {
        if (!cur->left) { out.push_back(cur->val); cur = cur->right; }
        else {
            Node* pre = cur->left;
            while (pre->right && pre->right != cur) pre = pre->right;
            if (!pre->right) { pre->right = cur; cur = cur->left; }
            else { pre->right = nullptr; out.push_back(cur->val); cur = cur->right; }
        }
    }
    return out;
}`,
    {
      howItWorks:
        "Temporarily threads each node's inorder predecessor's right pointer back to it, so we can return without a stack. After visiting, the threading is removed to restore the tree.",
      whenToUse: [
        "Inorder traversal without recursion or extra memory.",
        "Embedded / memory-constrained environments.",
      ],
      example:
        "Inorder of (1, ←(2,3), nil) is 2,1,3 — Morris produces the same sequence using O(1) extra memory.",
    },
  ),

  // ─────────────────────────── Sorting & misc ───────────────────────────
  "Counting Sort": entry(
    "Sorting",
    "O(n + k)",
    "O(n + k)",
    `
#include <bits/stdc++.h>
using namespace std;

vector<int> countingSort(const vector<int>& a, int k) {
    vector<int> count(k + 1, 0), out(a.size());
    for (int x : a) ++count[x];
    for (int i = 1; i <= k; ++i) count[i] += count[i - 1];
    for (int i = a.size() - 1; i >= 0; --i) out[--count[a[i]]] = a[i];
    return out;
}`,
    {
      howItWorks:
        "Builds a histogram of values, turns it into prefix sums (positions), then scatters each input element into its sorted index. Stable and non-comparison.",
      whenToUse: [
        "Small integer ranges (k = O(n)).",
        "As the stable inner sort of radix sort.",
      ],
      example: "[4,2,2,8,3,3,1], k=8 → [1,2,2,3,3,4,8].",
    },
  ),

  "Radix Sort": entry(
    "Sorting",
    "O(d·(n+b))",
    "O(n+b)",
    `
#include <bits/stdc++.h>
using namespace std;

void radixSort(vector<int>& a) {
    int maxVal = *max_element(a.begin(), a.end());
    for (int exp = 1; maxVal / exp > 0; exp *= 10) {
        vector<int> out(a.size()), cnt(10, 0);
        for (int x : a) ++cnt[(x / exp) % 10];
        for (int i = 1; i < 10; ++i) cnt[i] += cnt[i - 1];
        for (int i = a.size() - 1; i >= 0; --i) out[--cnt[(a[i] / exp) % 10]] = a[i];
        a = out;
    }
}`,
    {
      howItWorks:
        "Sorts by each digit from least to most significant using a stable counting sort. Stability across digits gives a globally correct ordering.",
      whenToUse: [
        "Sorting fixed-width integers / strings.",
        "Building blocks for suffix-array constructions.",
      ],
      example: "[170,45,75,90,802,24,2,66] → [2,24,45,66,75,90,170,802].",
    },
  ),

  "Bucket Sort": entry(
    "Sorting",
    "O(n + k)",
    "O(n + k)",
    `
#include <bits/stdc++.h>
using namespace std;

void bucketSort(vector<double>& a) {
    int n = a.size();
    vector<vector<double>> b(n);
    for (double x : a) b[min(n - 1, (int)(x * n))].push_back(x);
    int idx = 0;
    for (auto& bucket : b) { sort(bucket.begin(), bucket.end()); for (double x : bucket) a[idx++] = x; }
}`,
    {
      howItWorks:
        "Distributes elements into n buckets based on value range, sorts each bucket individually (often with insertion sort), then concatenates.",
      whenToUse: [
        "Uniformly distributed floating-point keys in [0,1).",
        "Geographic / hashing-friendly data.",
      ],
      example: "[0.78, 0.17, 0.39, 0.72] → [0.17, 0.39, 0.72, 0.78].",
    },
  ),

  "QuickSelect (k-th)": entry(
    "Search",
    "O(n) average, O(n²) worst",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

int quickselect(vector<int>& a, int k) {  // returns the k-th smallest (0-indexed)
    int lo = 0, hi = a.size() - 1;
    while (lo < hi) {
        int pivot = a[hi], i = lo;
        for (int j = lo; j < hi; ++j) if (a[j] < pivot) swap(a[i++], a[j]);
        swap(a[i], a[hi]);
        if (i == k) return a[i];
        if (i < k) lo = i + 1; else hi = i - 1;
    }
    return a[lo];
}`,
    {
      howItWorks:
        "Like quicksort but only recurses into the side containing the k-th index. Expected linear time because the work halves on average at each partition.",
      whenToUse: [
        "Finding medians / order statistics without full sorting.",
        "Implementing nth_element in linear average time.",
      ],
      example: "[7,10,4,3,20,15], k=3 → 10 (4th smallest).",
    },
  ),

  "Reservoir Sampling": entry(
    "Algorithms",
    "O(n)",
    "O(k)",
    `
#include <bits/stdc++.h>
using namespace std;

// Pick k random items from a stream of unknown length.
vector<int> reservoir(const vector<int>& stream, int k) {
    vector<int> r(stream.begin(), stream.begin() + min((int)stream.size(), k));
    for (int i = k; i < (int)stream.size(); ++i) {
        int j = rand() % (i + 1);
        if (j < k) r[j] = stream[i];
    }
    return r;
}`,
    {
      howItWorks:
        "First k items go into the reservoir. For each subsequent item i, accept it with probability k/(i+1); when accepted, evict a uniformly random reservoir slot. Result: every prefix yields a uniform sample.",
      whenToUse: [
        "Sampling from streams where the total length is unknown or huge.",
        "Online log sampling, randomised algorithms.",
      ],
      example:
        "Streaming [1..1000], k=3 → any subset of size 3 is equally likely.",
    },
  ),

  "Boyer-Moore Majority Vote": entry(
    "Algorithms",
    "O(n)",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

int majority(const vector<int>& a) {
    int cand = 0, cnt = 0;
    for (int x : a) {
        if (cnt == 0) cand = x;
        cnt += (x == cand) ? 1 : -1;
    }
    return cand; // verify it actually appears > n/2 if not guaranteed
}`,
    {
      howItWorks:
        "Pairs off occurrences of different candidates. If a majority exists (>n/2), it will be the only candidate standing after cancellations.",
      whenToUse: [
        "Finding a majority element with O(1) memory.",
        "Streaming heavy-hitters approximations.",
      ],
      example: "[2,2,1,1,1,2,2] → 2.",
    },
  ),

  "Knapsack with Reconstruction": entry(
    "DP",
    "O(n·W)",
    "O(n·W)",
    `
#include <bits/stdc++.h>
using namespace std;

pair<int, vector<int>> knapsackPick(const vector<int>& w, const vector<int>& v, int W) {
    int n = w.size();
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    for (int i = 1; i <= n; ++i)
        for (int c = 0; c <= W; ++c) {
            dp[i][c] = dp[i-1][c];
            if (w[i-1] <= c) dp[i][c] = max(dp[i][c], dp[i-1][c - w[i-1]] + v[i-1]);
        }
    vector<int> taken;
    for (int i = n, c = W; i > 0; --i)
        if (dp[i][c] != dp[i-1][c]) { taken.push_back(i - 1); c -= w[i-1]; }
    return { dp[n][W], taken };
}`,
    {
      howItWorks:
        "Standard 2-D knapsack DP, then walks the table backwards: whenever the value differs from the row above, that item was taken. Subtract its weight and continue.",
      whenToUse: [
        "When you need not just the optimum but also the picked items.",
        "Resource-allocation reports that must explain choices.",
      ],
      example:
        "w=[1,3,4,5], v=[1,4,5,7], W=7 → value 9, items {1,3} (weights 3 and 4).",
    },
  ),

  "Convex Hull (Andrew's Monotone Chain)": entry(
    "Geometry",
    "O(n log n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

using Point = pair<long long, long long>;
long long cross(const Point& O, const Point& A, const Point& B) {
    return (A.first - O.first) * (B.second - O.second)
         - (A.second - O.second) * (B.first - O.first);
}
vector<Point> convexHull(vector<Point> pts) {
    sort(pts.begin(), pts.end());
    int n = pts.size(), k = 0;
    vector<Point> h(2 * n);
    for (int i = 0; i < n; ++i) {
        while (k >= 2 && cross(h[k-2], h[k-1], pts[i]) <= 0) --k;
        h[k++] = pts[i];
    }
    for (int i = n - 2, t = k + 1; i >= 0; --i) {
        while (k >= t && cross(h[k-2], h[k-1], pts[i]) <= 0) --k;
        h[k++] = pts[i];
    }
    h.resize(k - 1);
    return h;
}`,
    {
      howItWorks:
        "Sort points lexicographically, then sweep left-to-right to build the lower hull and right-to-left to build the upper hull, removing points that make a non-left turn.",
      whenToUse: [
        "Computing convex polygons around a point set.",
        "Preprocessing for rotating calipers / closest pair on convex hulls.",
      ],
      example: "Square corners + interior point → hull contains only the four corners.",
    },
  ),

  "Mo's Algorithm": entry(
    "Algorithms",
    "O((n+q)·√n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct Query { int l, r, idx; };
int block;
bool cmp(const Query& a, const Query& b) {
    if (a.l / block != b.l / block) return a.l / block < b.l / block;
    return (a.l / block) & 1 ? a.r > b.r : a.r < b.r;
}
// Offline range-query template; user fills add()/remove()/answer().
vector<long long> mo(const vector<int>& a, vector<Query>& qs) {
    block = max(1, (int)sqrt((double)a.size()));
    sort(qs.begin(), qs.end(), cmp);
    vector<long long> ans(qs.size());
    int l = 0, r = -1; long long cur = 0;
    auto add = [&](int) { /* update cur */ };
    auto remove = [&](int) { /* update cur */ };
    for (auto& q : qs) {
        while (r < q.r) add(++r);
        while (l > q.l) add(--l);
        while (r > q.r) remove(r--);
        while (l < q.l) remove(l++);
        ans[q.idx] = cur;
    }
    return ans;
}`,
    {
      howItWorks:
        "Sorts queries by (l/√n, r) and reuses the previous answer by incrementally adding/removing one element at a time. Total movement is O((n+q)√n).",
      whenToUse: [
        "Offline range queries where add/remove of a single element is cheap.",
        "Distinct-count, frequency questions over arbitrary ranges.",
      ],
      example:
        "Count distinct values in many [l,r] subarrays of a 10⁵-length array.",
    },
  ),

  "Disjoint Sparse Table (Persistent Concept)": entry(
    "Data Structures",
    "O(n log n) prep, O(1) query",
    "O(n log n)",
    `
#include <bits/stdc++.h>
using namespace std;

// Range sum (or any associative op) on a static array in O(1) per query
// using disjoint sparse table.
struct DST {
    int n, K;
    vector<vector<long long>> t;
    DST(const vector<long long>& a) {
        n = a.size(); K = max(1, (int)ceil(log2(n)));
        t.assign(K, vector<long long>(n, 0));
        for (int h = 1, len = 2; h <= K; ++h, len <<= 1)
            for (int c = len >> 1; c < n; c += len) {
                t[h - 1][c] = a[c];
                for (int i = c + 1; i < min(n, c + (len >> 1)); ++i) t[h - 1][i] = t[h - 1][i - 1] + a[i];
                if (c >= 1) {
                    t[h - 1][c - 1] = a[c - 1];
                    for (int i = c - 2; i >= max(0, c - (len >> 1)); --i) t[h - 1][i] = t[h - 1][i + 1] + a[i];
                }
            }
    }
};`,
    {
      howItWorks:
        "Splits the array recursively at midpoints and stores prefix sums on each side of each split. Any [l,r] either shares a split point with both endpoints (combine in O(1)) or is contained in a smaller block.",
      whenToUse: [
        "Constant-time range sum / product / xor on a static array.",
        "Useful when the operation isn't idempotent (so sparse-table can't be used).",
      ],
      example:
        "Array of 8 elements: split at 4; ranges crossing 4 are answered as left-prefix + right-prefix.",
    },
  ),

  "Kahn Toposort + DP (Longest Path in DAG)": entry(
    "Graph",
    "O(V+E)",
    "O(V)",
    `
#include <bits/stdc++.h>
using namespace std;

long long longestPathDAG(int n, const vector<vector<pair<int,int>>>& g) {
    vector<int> indeg(n, 0);
    for (int u = 0; u < n; ++u) for (auto& [v, w] : g[u]) ++indeg[v];
    queue<int> q;
    for (int i = 0; i < n; ++i) if (!indeg[i]) q.push(i);
    vector<long long> d(n, 0);
    long long best = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        best = max(best, d[u]);
        for (auto& [v, w] : g[u]) {
            d[v] = max(d[v], d[u] + w);
            if (--indeg[v] == 0) q.push(v);
        }
    }
    return best;
}`,
    {
      howItWorks:
        "Process vertices in topological order; for each outgoing edge relax the destination's best-so-far. Because we visit u only after all paths into u are finalised, d[u] is correct when popped.",
      whenToUse: [
        "Longest / shortest paths in DAGs (single linear pass).",
        "Dependency cost analysis (critical path).",
      ],
      example: "Tasks with durations forming a DAG → critical-path duration.",
    },
  ),

  "Hash Map (Open Addressing)": entry(
    "Data Structures",
    "O(1) average",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

struct HashMap {
    vector<pair<long long,int>> tbl;   // {key, val}, key=-1 means empty
    vector<bool> used;
    int n, cap;
    HashMap(int c) : tbl(c, {-1, 0}), used(c, false), n(0), cap(c) {}
    int hash(long long k) { return (k * 2654435761u) % cap; }
    void put(long long k, int v) {
        int i = hash(k);
        while (used[i] && tbl[i].first != k) i = (i + 1) % cap;
        if (!used[i]) { used[i] = true; ++n; }
        tbl[i] = {k, v};
    }
    int get(long long k) {
        int i = hash(k);
        while (used[i]) { if (tbl[i].first == k) return tbl[i].second; i = (i + 1) % cap; }
        return -1;
    }
};`,
    {
      howItWorks:
        "Stores entries directly in an array, resolving collisions by linear probing. With load factor below ~0.5 lookups stay constant time on average.",
      whenToUse: [
        "Small to medium key sets where unordered_map's pointer chasing is too slow.",
        "Cache-friendly hashing in performance-critical code.",
      ],
      example:
        "put(42,1), put(74,2); get(74)=2 even after wrap-around because of linear probing.",
    },
  ),

  "Two-Pointers Pair Sum": entry(
    "Algorithms",
    "O(n)",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

// Find any pair in a sorted array that sums to target.
pair<int,int> pairSum(const vector<int>& a, int target) {
    int l = 0, r = a.size() - 1;
    while (l < r) {
        int s = a[l] + a[r];
        if (s == target) return {l, r};
        if (s < target) ++l; else --r;
    }
    return {-1, -1};
}`,
    {
      howItWorks:
        "Place pointers at both ends of a sorted array; the sum decision tells us which pointer to advance. Each element is visited at most once.",
      whenToUse: [
        "Sorted-array pair / triple / closest-sum problems.",
        "Container-with-most-water / trapping-rain style sweeps.",
      ],
      example: "[1,2,4,7,11,15], target 15 → indices (3,4).",
    },
  ),

  "Floyd's Cycle Detection": entry(
    "Algorithms",
    "O(n)",
    "O(1)",
    `
#include <bits/stdc++.h>
using namespace std;

// Detect cycle start in a function/linked list iteration f.
int floydCycle(function<int(int)> f, int start) {
    int slow = f(start), fast = f(f(start));
    while (slow != fast) { slow = f(slow); fast = f(f(fast)); }
    slow = start;
    while (slow != fast) { slow = f(slow); fast = f(fast); }
    return slow;
}`,
    {
      howItWorks:
        "Tortoise-and-hare: one pointer steps once, the other steps twice. They meet inside the cycle; resetting one and advancing both at unit speed locates the cycle's entry node.",
      whenToUse: [
        "Linked-list cycle detection.",
        "Pollard's rho factorisation and number-theoretic loop detection.",
      ],
      example: "Linked list 1→2→3→4→5→3 (cycle to 3) → returns 3.",
    },
  ),

  "Manhattan MST (Sweep)": entry(
    "Geometry",
    "O(n log n)",
    "O(n)",
    `
#include <bits/stdc++.h>
using namespace std;

// Skeleton: build candidate edges using 4 sweeps in different
// coordinate rotations, then feed into Kruskal.
struct ManhattanMST {
    // For brevity, full implementation per CP-Algorithms is recommended;
    // the trick: rotating/swapping coordinates gives 4 sweeps each
    // producing at most n candidate edges, total O(n log n).
};`,
    {
      howItWorks:
        "Manhattan distance |dx|+|dy| equals Chebyshev distance after rotating 45°. Four directional sweeps produce O(n) candidate edges that contain the MST; Kruskal completes the job.",
      whenToUse: [
        "MST on points with L1 / Manhattan distance (grid networks).",
      ],
      example:
        "Three points (0,0), (3,1), (1,4) → MST edges of total length 4 + 4 = 8.",
    },
  ),

  "Reservoir-weighted Sampling (A-Res)": entry(
    "Algorithms",
    "O(n log k)",
    "O(k)",
    `
#include <bits/stdc++.h>
using namespace std;

// Weighted reservoir sampling (A-Res). Returns k items chosen with
// probability proportional to their weights from a stream of (item, weight).
vector<int> aRes(const vector<pair<int,double>>& stream, int k) {
    priority_queue<pair<double,int>, vector<pair<double,int>>, greater<>> heap;
    for (auto& [x, w] : stream) {
        double r = pow((double)rand() / RAND_MAX, 1.0 / w);
        if ((int)heap.size() < k) heap.push({r, x});
        else if (r > heap.top().first) { heap.pop(); heap.push({r, x}); }
    }
    vector<int> out;
    while (!heap.empty()) { out.push_back(heap.top().second); heap.pop(); }
    return out;
}`,
    {
      howItWorks:
        "Each item gets a key r = U^(1/w). Keeping the k largest keys (min-heap of size k) yields a sample where inclusion probability is proportional to weight.",
      whenToUse: [
        "Picking k items from a weighted stream with one pass.",
        "Recommendation / analytics pipelines.",
      ],
      example:
        "Stream of clicks weighted by dwell time → biased sample favours longer engagement.",
    },
  ),
};

export const LIBRARY_ALGOS = Object.keys(LIBRARY_DATA);
