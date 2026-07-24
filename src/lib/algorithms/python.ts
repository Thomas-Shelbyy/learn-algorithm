// C++ (STL) reference implementations for every visualized algorithm.
// File name kept as `python.ts` for backward compat with existing imports;
// the exported snippets are now C++ using only the standard library / STL.

export type PySection =
  | "sorting"
  | "searching"
  | "strings"
  | "tree"
  | "graph"
  | "pathfinding"
  | "dp"
  | "backtracking"
  | "library";

export interface PySnippet {
  code: string;
  time: string;
  space: string;
}

const s = (str: string) => str.replace(/^\n/, "").replace(/\n[\t ]*$/, "");

export const PYTHON_CODES: Record<PySection, Record<string, PySnippet>> = {
  // ────────────────────────────── SORTING ──────────────────────────────
  sorting: {
    Bubble: {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Repeatedly swap adjacent out-of-order pairs.
void bubbleSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; ++j) {
            if (a[j] > a[j + 1]) {
                swap(a[j], a[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;     // already sorted
    }
}
`),
    },
    Selection: {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Each pass selects the minimum of the unsorted suffix.
void selectionSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; ++i) {
        int mn = i;
        for (int j = i + 1; j < n; ++j)
            if (a[j] < a[mn]) mn = j;
        swap(a[i], a[mn]);
    }
}
`),
    },
    Insertion: {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Insert each element into its place in the sorted prefix.
void insertionSort(vector<int>& a) {
    for (int i = 1; i < (int)a.size(); ++i) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            --j;
        }
        a[j + 1] = key;
    }
}
`),
    },
    Merge: {
      time: "O(n log n)", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

void mergeRange(vector<int>& a, int l, int m, int r) {
    vector<int> tmp; tmp.reserve(r - l + 1);
    int i = l, j = m + 1;
    while (i <= m && j <= r)
        tmp.push_back(a[i] <= a[j] ? a[i++] : a[j++]);
    while (i <= m) tmp.push_back(a[i++]);
    while (j <= r) tmp.push_back(a[j++]);
    for (int k = 0; k < (int)tmp.size(); ++k) a[l + k] = tmp[k];
}

void mergeSort(vector<int>& a, int l, int r) {
    if (l >= r) return;
    int m = (l + r) / 2;
    mergeSort(a, l, m);
    mergeSort(a, m + 1, r);
    mergeRange(a, l, m, r);
}
`),
    },
    Quick: {
      time: "O(n log n) avg", space: "O(log n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// In-place Lomuto partition scheme.
int partition(vector<int>& a, int lo, int hi) {
    int pivot = a[hi], i = lo - 1;
    for (int j = lo; j < hi; ++j)
        if (a[j] <= pivot) swap(a[++i], a[j]);
    swap(a[i + 1], a[hi]);
    return i + 1;
}

void quickSort(vector<int>& a, int lo, int hi) {
    if (lo < hi) {
        int p = partition(a, lo, hi);
        quickSort(a, lo, p - 1);
        quickSort(a, p + 1, hi);
    }
}
`),
    },
    Heap: {
      time: "O(n log n)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// std::make_heap / std::sort_heap form a clean STL heap-sort.
void heapSort(vector<int>& a) {
    make_heap(a.begin(), a.end());        // max-heap
    sort_heap(a.begin(), a.end());        // pop repeatedly
}
`),
    },
    Shell: {
      time: "O(n^1.5)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Gapped insertion sort with halving gap sequence.
void shellSort(vector<int>& a) {
    int n = a.size();
    for (int gap = n / 2; gap > 0; gap /= 2) {
        for (int i = gap; i < n; ++i) {
            int tmp = a[i], j = i;
            while (j >= gap && a[j - gap] > tmp) {
                a[j] = a[j - gap];
                j -= gap;
            }
            a[j] = tmp;
        }
    }
}
`),
    },
    Counting: {
      time: "O(n + k)", space: "O(n + k)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Non-comparison sort for bounded integer keys.
void countingSort(vector<int>& a) {
    if (a.empty()) return;
    int lo = *min_element(a.begin(), a.end());
    int hi = *max_element(a.begin(), a.end());
    vector<int> cnt(hi - lo + 1, 0);
    for (int x : a) cnt[x - lo]++;
    int idx = 0;
    for (int v = 0; v < (int)cnt.size(); ++v)
        while (cnt[v]--) a[idx++] = v + lo;
}
`),
    },
    Radix: {
      time: "O(d·(n + b))", space: "O(n + b)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// LSD radix sort (base 10) using counting sort per digit.
void radixSort(vector<int>& a) {
    if (a.empty()) return;
    int mx = *max_element(a.begin(), a.end());
    for (int exp = 1; mx / exp > 0; exp *= 10) {
        vector<int> out(a.size()), cnt(10, 0);
        for (int x : a) cnt[(x / exp) % 10]++;
        for (int i = 1; i < 10; ++i) cnt[i] += cnt[i - 1];
        for (int i = a.size() - 1; i >= 0; --i)
            out[--cnt[(a[i] / exp) % 10]] = a[i];
        a = out;
    }
}
`),
    },
    Cocktail: {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Bidirectional bubble sort.
void cocktailSort(vector<int>& a) {
    int lo = 0, hi = a.size() - 1;
    bool swapped = true;
    while (swapped) {
        swapped = false;
        for (int i = lo; i < hi; ++i)
            if (a[i] > a[i + 1]) { swap(a[i], a[i + 1]); swapped = true; }
        if (!swapped) break;
        --hi; swapped = false;
        for (int i = hi; i > lo; --i)
            if (a[i - 1] > a[i]) { swap(a[i - 1], a[i]); swapped = true; }
        ++lo;
    }
}
`),
    },
    Gnome: {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Walk forward; on inversion, swap and step back.
void gnomeSort(vector<int>& a) {
    int i = 0, n = a.size();
    while (i < n) {
        if (i == 0 || a[i - 1] <= a[i]) ++i;
        else { swap(a[i - 1], a[i]); --i; }
    }
}
`),
    },
    Comb: {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Bubble sort with shrinking gap (shrink factor 1.3).
void combSort(vector<int>& a) {
    int n = a.size(), gap = n;
    bool swapped = true;
    while (gap > 1 || swapped) {
        gap = max(1, (int)(gap / 1.3));
        swapped = false;
        for (int i = 0; i + gap < n; ++i)
            if (a[i] > a[i + gap]) { swap(a[i], a[i + gap]); swapped = true; }
    }
}
`),
    },
    Cycle: {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Minimal-writes sort by routing elements to their final slot.
void cycleSort(vector<int>& a) {
    int n = a.size();
    for (int start = 0; start < n - 1; ++start) {
        int item = a[start], pos = start;
        for (int i = start + 1; i < n; ++i)
            if (a[i] < item) ++pos;
        if (pos == start) continue;
        while (item == a[pos]) ++pos;
        swap(a[pos], item);
        while (pos != start) {
            pos = start;
            for (int i = start + 1; i < n; ++i)
                if (a[i] < item) ++pos;
            while (item == a[pos]) ++pos;
            swap(a[pos], item);
        }
    }
}
`),
    },
    Pancake: {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Sort by repeatedly flipping prefixes (like flipping pancakes).
void flip(vector<int>& a, int k) {
    int i = 0;
    while (i < k) { swap(a[i], a[k]); i++; k--; }
}
void pancakeSort(vector<int>& a) {
    int n = a.size();
    for (int size = n; size > 1; --size) {
        int mx = 0;
        for (int i = 1; i < size; ++i)
            if (a[i] > a[mx]) mx = i;
        if (mx != size - 1) {
            if (mx != 0) flip(a, mx);
            flip(a, size - 1);
        }
    }
}
`),
    },
    "Odd-Even": {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Brick sort: alternate compare-swaps on odd then even index pairs.
void oddEvenSort(vector<int>& a) {
    int n = a.size();
    bool sorted = false;
    while (!sorted) {
        sorted = true;
        for (int i = 1; i < n - 1; i += 2)
            if (a[i] > a[i + 1]) { swap(a[i], a[i + 1]); sorted = false; }
        for (int i = 0; i < n - 1; i += 2)
            if (a[i] > a[i + 1]) { swap(a[i], a[i + 1]); sorted = false; }
    }
}
`),
    },
  },

  // ────────────────────────────── SEARCHING ──────────────────────────────
  searching: {
    Linear: {
      time: "O(n)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int linearSearch(const vector<int>& a, int target) {
    for (int i = 0; i < (int)a.size(); ++i)
        if (a[i] == target) return i;
    return -1;
}
`),
    },
    Binary: {
      time: "O(log n)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Requires 'a' to be sorted ascending.
int binarySearch(const vector<int>& a, int target) {
    int lo = 0, hi = a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] <  target) lo = mid + 1;
        else                  hi = mid - 1;
    }
    return -1;
}
`),
    },
    Jump: {
      time: "O(√n)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int jumpSearch(const vector<int>& a, int target) {
    int n = a.size(), step = (int)sqrt((double)n), prev = 0;
    while (prev < n && a[min(step, n) - 1] < target) {
        prev = step;
        step += (int)sqrt((double)n);
        if (prev >= n) return -1;
    }
    for (int i = prev; i < min(step, n); ++i)
        if (a[i] == target) return i;
    return -1;
}
`),
    },
    Exponential: {
      time: "O(log n)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int exponentialSearch(const vector<int>& a, int target) {
    int n = a.size();
    if (n == 0) return -1;
    if (a[0] == target) return 0;
    int i = 1;
    while (i < n && a[i] <= target) i *= 2;
    int lo = i / 2, hi = min(i, n - 1);
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] <  target) lo = mid + 1;
        else                  hi = mid - 1;
    }
    return -1;
}
`),
    },
    Ternary: {
      time: "O(log₃ n)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int ternarySearch(const vector<int>& a, int target) {
    int lo = 0, hi = a.size() - 1;
    while (lo <= hi) {
        int third = (hi - lo) / 3;
        int m1 = lo + third, m2 = hi - third;
        if (a[m1] == target) return m1;
        if (a[m2] == target) return m2;
        if (target < a[m1]) hi = m1 - 1;
        else if (target > a[m2]) lo = m2 + 1;
        else { lo = m1 + 1; hi = m2 - 1; }
    }
    return -1;
}
`),
    },
    Interpolation: {
      time: "O(log log n) avg", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int interpolationSearch(const vector<int>& a, int target) {
    int lo = 0, hi = a.size() - 1;
    while (lo <= hi && target >= a[lo] && target <= a[hi]) {
        if (lo == hi) return a[lo] == target ? lo : -1;
        long long pos = lo + (long long)(target - a[lo]) * (hi - lo) / (a[hi] - a[lo]);
        if (a[pos] == target) return pos;
        if (a[pos] <  target) lo = pos + 1;
        else                  hi = pos - 1;
    }
    return -1;
}
`),
    },
    Fibonacci: {
      time: "O(log n)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Narrow the range using Fibonacci numbers instead of halving.
int fibonacciSearch(const vector<int>& a, int target) {
    int n = a.size();
    int fk2 = 0, fk1 = 1, fk = fk2 + fk1;
    while (fk < n) { fk2 = fk1; fk1 = fk; fk = fk2 + fk1; }
    int offset = -1;
    while (fk > 1) {
        int i = min(offset + fk2, n - 1);
        if (a[i] < target) { fk = fk1; fk1 = fk2; fk2 = fk - fk1; offset = i; }
        else if (a[i] > target) { fk = fk2; fk1 = fk1 - fk2; fk2 = fk - fk1; }
        else return i;
    }
    if (fk1 && offset + 1 < n && a[offset + 1] == target) return offset + 1;
    return -1;
}
`),
    },
  },

  // ────────────────────────────── STRINGS ──────────────────────────────
  strings: {
    Naive: {
      time: "O(n·m)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

vector<int> naiveSearch(const string& text, const string& pat) {
    vector<int> matches;
    int n = text.size(), m = pat.size();
    for (int i = 0; i + m <= n; ++i) {
        int j = 0;
        while (j < m && text[i + j] == pat[j]) ++j;
        if (j == m) matches.push_back(i);
    }
    return matches;
}
`),
    },
    KMP: {
      time: "O(n + m)", space: "O(m)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

vector<int> buildLPS(const string& p) {
    int m = p.size(); vector<int> lps(m, 0);
    int len = 0;
    for (int i = 1; i < m; ) {
        if (p[i] == p[len]) lps[i++] = ++len;
        else if (len) len = lps[len - 1];
        else         lps[i++] = 0;
    }
    return lps;
}

vector<int> kmpSearch(const string& text, const string& pat) {
    vector<int> lps = buildLPS(pat), matches;
    int n = text.size(), m = pat.size(), i = 0, j = 0;
    while (i < n) {
        if (text[i] == pat[j]) { ++i; ++j;
            if (j == m) { matches.push_back(i - j); j = lps[j - 1]; }
        } else if (j) j = lps[j - 1];
        else ++i;
    }
    return matches;
}
`),
    },
    "Rabin-Karp": {
      time: "O(n + m) avg", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

vector<int> rabinKarp(const string& text, const string& pat) {
    const long long BASE = 256, MOD = 1000000007;
    int n = text.size(), m = pat.size();
    vector<int> matches;
    if (m > n) return matches;
    long long h = 1;
    for (int i = 0; i < m - 1; ++i) h = (h * BASE) % MOD;
    long long hp = 0, ht = 0;
    for (int i = 0; i < m; ++i) {
        hp = (hp * BASE + pat[i]) % MOD;
        ht = (ht * BASE + text[i]) % MOD;
    }
    for (int i = 0; i + m <= n; ++i) {
        if (hp == ht && text.compare(i, m, pat) == 0) matches.push_back(i);
        if (i + m < n)
            ht = ((ht - text[i] * h) * BASE + text[i + m]) % MOD;
        if (ht < 0) ht += MOD;
    }
    return matches;
}
`),
    },
    "Z-Algorithm": {
      time: "O(n + m)", space: "O(n + m)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

vector<int> zSearch(const string& text, const string& pat) {
    string s = pat + "$" + text;
    int n = s.size();
    vector<int> z(n, 0);
    int l = 0, r = 0;
    for (int i = 1; i < n; ++i) {
        if (i < r) z[i] = min(r - i, z[i - l]);
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) ++z[i];
        if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    int m = pat.size();
    vector<int> out;
    for (int i = m + 1; i < n; ++i)
        if (z[i] == m) out.push_back(i - m - 1);
    return out;
}
`),
    },
  },

  // ────────────────────────────── TREE ──────────────────────────────
  tree: {
    BFS: {
      time: "O(n)", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;
struct Node { int val; Node *L, *R; };

vector<int> bfs(Node* root) {
    vector<int> order;
    if (!root) return order;
    queue<Node*> q; q.push(root);
    while (!q.empty()) {
        Node* n = q.front(); q.pop();
        order.push_back(n->val);
        if (n->L) q.push(n->L);
        if (n->R) q.push(n->R);
    }
    return order;
}
`),
    },
    "DFS-In": {
      time: "O(n)", space: "O(h)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;
struct Node { int val; Node *L, *R; };

vector<int> inorder(Node* root) {
    vector<int> out; stack<Node*> st; Node* cur = root;
    while (cur || !st.empty()) {
        while (cur) { st.push(cur); cur = cur->L; }
        cur = st.top(); st.pop();
        out.push_back(cur->val);
        cur = cur->R;
    }
    return out;
}
`),
    },
    "DFS-Pre": {
      time: "O(n)", space: "O(h)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;
struct Node { int val; Node *L, *R; };

vector<int> preorder(Node* root) {
    vector<int> out;
    if (!root) return out;
    stack<Node*> st; st.push(root);
    while (!st.empty()) {
        Node* n = st.top(); st.pop();
        out.push_back(n->val);
        if (n->R) st.push(n->R);
        if (n->L) st.push(n->L);
    }
    return out;
}
`),
    },
    "DFS-Post": {
      time: "O(n)", space: "O(h)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;
struct Node { int val; Node *L, *R; };

vector<int> postorder(Node* root) {
    vector<int> out;
    if (!root) return out;
    stack<Node*> st; st.push(root);
    while (!st.empty()) {
        Node* n = st.top(); st.pop();
        out.push_back(n->val);
        if (n->L) st.push(n->L);
        if (n->R) st.push(n->R);
    }
    reverse(out.begin(), out.end());
    return out;
}
`),
    },
  },

  // ────────────────────────────── GRAPH ──────────────────────────────
  graph: {
    DFS: {
      time: "O(V + E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

vector<int> dfs(const vector<vector<int>>& g, int start) {
    vector<int> order; vector<bool> seen(g.size(), false);
    stack<int> st; st.push(start);
    while (!st.empty()) {
        int u = st.top(); st.pop();
        if (seen[u]) continue;
        seen[u] = true;
        order.push_back(u);
        for (auto it = g[u].rbegin(); it != g[u].rend(); ++it)
            if (!seen[*it]) st.push(*it);
    }
    return order;
}
`),
    },
    BFS: {
      time: "O(V + E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

vector<int> bfs(const vector<vector<int>>& g, int start) {
    vector<int> order; vector<bool> seen(g.size(), false);
    queue<int> q; q.push(start); seen[start] = true;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : g[u]) if (!seen[v]) { seen[v] = true; q.push(v); }
    }
    return order;
}
`),
    },
    "Topological Sort": {
      time: "O(V + E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Kahn's algorithm.
vector<int> topoSort(const vector<vector<int>>& g) {
    int n = g.size();
    vector<int> indeg(n, 0);
    for (int u = 0; u < n; ++u)
        for (int v : g[u]) ++indeg[v];
    queue<int> q;
    for (int i = 0; i < n; ++i) if (!indeg[i]) q.push(i);
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : g[u]) if (--indeg[v] == 0) q.push(v);
    }
    return order;
}
`),
    },
    "Cycle Detection": {
      time: "O(V + E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// DFS coloring: 0 white, 1 gray, 2 black. Back-edge => cycle.
bool dfsCycle(int u, const vector<vector<int>>& g, vector<int>& color) {
    color[u] = 1;
    for (int v : g[u]) {
        if (color[v] == 1) return true;
        if (color[v] == 0 && dfsCycle(v, g, color)) return true;
    }
    color[u] = 2;
    return false;
}

bool hasCycle(const vector<vector<int>>& g) {
    vector<int> color(g.size(), 0);
    for (int u = 0; u < (int)g.size(); ++u)
        if (color[u] == 0 && dfsCycle(u, g, color)) return true;
    return false;
}
`),
    },
    Dijkstra: {
      time: "O((V+E) log V)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// graph[u] = list of {v, weight}
vector<long long> dijkstra(const vector<vector<pair<int,int>>>& g, int src) {
    int n = g.size();
    vector<long long> dist(n, LLONG_MAX);
    priority_queue<pair<long long,int>,
                   vector<pair<long long,int>>,
                   greater<>> pq;
    dist[src] = 0; pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : g[u]) {
            long long nd = d + w;
            if (nd < dist[v]) { dist[v] = nd; pq.push({nd, v}); }
        }
    }
    return dist;
}
`),
    },
    "Prim MST": {
      time: "O(E log V)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

long long primMST(const vector<vector<pair<int,int>>>& g, int start) {
    int n = g.size();
    vector<bool> inMST(n, false);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, start});
    long long total = 0;
    while (!pq.empty()) {
        auto [w, u] = pq.top(); pq.pop();
        if (inMST[u]) continue;
        inMST[u] = true; total += w;
        for (auto [v, nw] : g[u])
            if (!inMST[v]) pq.push({nw, v});
    }
    return total;
}
`),
    },
    "Bellman-Ford": {
      time: "O(V·E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

struct Edge { int u, v, w; };

// Returns dist[] or empty vector if a negative cycle is reachable from src.
vector<long long> bellmanFord(int n, vector<Edge>& edges, int src) {
    const long long INF = LLONG_MAX / 4;
    vector<long long> dist(n, INF);
    dist[src] = 0;
    for (int i = 0; i < n - 1; ++i)
        for (auto& e : edges)
            if (dist[e.u] + e.w < dist[e.v])
                dist[e.v] = dist[e.u] + e.w;
    // One more pass detects negative cycles.
    for (auto& e : edges)
        if (dist[e.u] + e.w < dist[e.v]) return {}; // negative cycle
    return dist;
}
`),
    },
    "Floyd-Warshall": {
      time: "O(V³)", space: "O(V²)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// All-pairs shortest paths. dist[i][j] = INF means unreachable.
void floydWarshall(vector<vector<long long>>& dist) {
    int n = dist.size();
    for (int k = 0; k < n; ++k)
        for (int i = 0; i < n; ++i)
            for (int j = 0; j < n; ++j)
                if (dist[i][k] + dist[k][j] < dist[i][j])
                    dist[i][j] = dist[i][k] + dist[k][j];
}
`),
    },
    "Kruskal MST": {
      time: "O(E log E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

struct DSU {
    vector<int> p, r;
    DSU(int n) : p(n), r(n, 0) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (r[a] < r[b]) swap(a, b);
        p[b] = a; if (r[a] == r[b]) r[a]++;
        return true;
    }
};

struct Edge { int u, v, w; };

long long kruskalMST(int n, vector<Edge> edges) {
    sort(edges.begin(), edges.end(),
         [](auto& a, auto& b) { return a.w < b.w; });
    DSU dsu(n); long long total = 0; int taken = 0;
    for (auto& e : edges)
        if (dsu.unite(e.u, e.v)) { total += e.w; if (++taken == n - 1) break; }
    return total;
}
`),
    },
  },

  // ────────────────────────────── PATHFINDING ──────────────────────────────
  pathfinding: {
    BFS: {
      time: "O(R·C)", space: "O(R·C)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Shortest path on unweighted grid (4-connected). 1 = wall.
vector<pair<int,int>> bfsPath(vector<vector<int>>& grid,
                              pair<int,int> start,
                              pair<int,int> goal) {
    int R = grid.size(), C = grid[0].size();
    map<pair<int,int>, pair<int,int>> par;
    queue<pair<int,int>> q;
    q.push(start); par[start] = {-1, -1};
    int dr[] = {1,-1,0,0}, dc[] = {0,0,1,-1};
    while (!q.empty()) {
        auto [r, c] = q.front(); q.pop();
        if (make_pair(r, c) == goal) break;
        for (int k = 0; k < 4; ++k) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
            if (grid[nr][nc] == 1 || par.count({nr, nc})) continue;
            par[{nr, nc}] = {r, c};
            q.push({nr, nc});
        }
    }
    vector<pair<int,int>> path;
    if (!par.count(goal)) return path;
    for (auto cur = goal; cur.first != -1; cur = par[cur]) path.push_back(cur);
    reverse(path.begin(), path.end());
    return path;
}
`),
    },
    Dijkstra: {
      time: "O(N log N)", space: "O(N)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

vector<pair<int,int>> dijkstraPath(vector<vector<int>>& grid,
                                   pair<int,int> start,
                                   pair<int,int> goal) {
    int R = grid.size(), C = grid[0].size();
    map<pair<int,int>, long long> dist;
    map<pair<int,int>, pair<int,int>> par;
    priority_queue<tuple<long long,int,int>,
                   vector<tuple<long long,int,int>>,
                   greater<>> pq;
    dist[start] = 0; par[start] = {-1, -1};
    pq.push({0, start.first, start.second});
    int dr[] = {1,-1,0,0}, dc[] = {0,0,1,-1};
    while (!pq.empty()) {
        auto [d, r, c] = pq.top(); pq.pop();
        if (make_pair(r, c) == goal) break;
        if (d > dist[{r, c}]) continue;
        for (int k = 0; k < 4; ++k) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] == 1) continue;
            long long nd = d + max(1, grid[nr][nc]);
            if (!dist.count({nr, nc}) || nd < dist[{nr, nc}]) {
                dist[{nr, nc}] = nd; par[{nr, nc}] = {r, c};
                pq.push({nd, nr, nc});
            }
        }
    }
    vector<pair<int,int>> path;
    if (!par.count(goal)) return path;
    for (auto cur = goal; cur.first != -1; cur = par[cur]) path.push_back(cur);
    reverse(path.begin(), path.end());
    return path;
}
`),
    },
    "A*": {
      time: "O(N log N)", space: "O(N)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Manhattan heuristic.
int h(pair<int,int> a, pair<int,int> b) {
    return abs(a.first - b.first) + abs(a.second - b.second);
}

vector<pair<int,int>> aStar(vector<vector<int>>& grid,
                            pair<int,int> start,
                            pair<int,int> goal) {
    int R = grid.size(), C = grid[0].size();
    map<pair<int,int>, int> g;
    map<pair<int,int>, pair<int,int>> par;
    priority_queue<tuple<int,int,int,int>,
                   vector<tuple<int,int,int,int>>,
                   greater<>> pq;
    g[start] = 0; par[start] = {-1, -1};
    pq.push({h(start, goal), 0, start.first, start.second});
    int dr[] = {1,-1,0,0}, dc[] = {0,0,1,-1};
    while (!pq.empty()) {
        auto [f, gc, r, c] = pq.top(); pq.pop();
        if (make_pair(r, c) == goal) break;
        if (gc > g[{r, c}]) continue;
        for (int k = 0; k < 4; ++k) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] == 1) continue;
            int ng = gc + 1;
            if (!g.count({nr, nc}) || ng < g[{nr, nc}]) {
                g[{nr, nc}] = ng; par[{nr, nc}] = {r, c};
                pq.push({ng + h({nr, nc}, goal), ng, nr, nc});
            }
        }
    }
    vector<pair<int,int>> path;
    if (!par.count(goal)) return path;
    for (auto cur = goal; cur.first != -1; cur = par[cur]) path.push_back(cur);
    reverse(path.begin(), path.end());
    return path;
}
`),
    },
  },

  // ────────────────────────────── DP ──────────────────────────────
  dp: {
    Fibonacci: {
      time: "O(n)", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Bottom-up DP for the nth Fibonacci number.
long long fib(int n) {
    if (n < 2) return n;
    vector<long long> dp(n + 1, 0);
    dp[1] = 1;
    for (int i = 2; i <= n; ++i)
        dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}
`),
    },
    LCS: {
      time: "O(n·m)", space: "O(n·m)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int lcs(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; ++i)
        for (int j = 1; j <= m; ++j)
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else                      dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
    return dp[n][m];
}
`),
    },
    "0/1 Knapsack": {
      time: "O(n·W)", space: "O(n·W)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int knapsack(const vector<int>& w, const vector<int>& v, int W) {
    int n = w.size();
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    for (int i = 1; i <= n; ++i)
        for (int cap = 0; cap <= W; ++cap) {
            dp[i][cap] = dp[i - 1][cap];
            if (w[i - 1] <= cap)
                dp[i][cap] = max(dp[i][cap], dp[i - 1][cap - w[i - 1]] + v[i - 1]);
        }
    return dp[n][W];
}
`),
    },
    "Edit Distance": {
      time: "O(n·m)", space: "O(n·m)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int editDistance(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 0; i <= n; ++i) dp[i][0] = i;
    for (int j = 0; j <= m; ++j) dp[0][j] = j;
    for (int i = 1; i <= n; ++i)
        for (int j = 1; j <= m; ++j)
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + min({dp[i - 1][j],      // delete
                                     dp[i][j - 1],      // insert
                                     dp[i - 1][j - 1]});// replace
    return dp[n][m];
}
`),
    },
    "Coin Change": {
      time: "O(amount·|coins|)", space: "O(amount)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int coinChange(const vector<int>& coins, int amount) {
    const int INF = INT_MAX;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int a = 1; a <= amount; ++a)
        for (int c : coins)
            if (c <= a && dp[a - c] != INF && dp[a - c] + 1 < dp[a])
                dp[a] = dp[a - c] + 1;
    return dp[amount] == INF ? -1 : dp[amount];
}
`),
    },
    LIS: {
      time: "O(n log n)", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

int lis(const vector<int>& a) {
    vector<int> tails;
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else                   *it = x;
    }
    return tails.size();
}
`),
    },
  },

  // ────────────────────────────── BACKTRACKING ──────────────────────────────
  backtracking: {
    "N-Queens": {
      time: "O(N!)", space: "O(N)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Classic N-Queens via backtracking.
// cols[r] = column of the queen on row r.
bool safe(const vector<int>& cols, int row, int col) {
    for (int r = 0; r < row; ++r)
        if (cols[r] == col || abs(cols[r] - col) == row - r)
            return false;
    return true;
}

void solve(int row, int n, vector<int>& cols,
           vector<vector<int>>& solutions) {
    if (row == n) { solutions.push_back(cols); return; }
    for (int c = 0; c < n; ++c) {
        if (safe(cols, row, c)) {
            cols[row] = c;
            solve(row + 1, n, cols, solutions);
            cols[row] = -1;   // backtrack
        }
    }
}

vector<vector<int>> nQueens(int n) {
    vector<int> cols(n, -1);
    vector<vector<int>> solutions;
    solve(0, n, cols, solutions);
    return solutions;
}
`),
    },
    "Knight's Tour": {
      time: "O(8^(N²)) worst", space: "O(N²)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Warnsdorff's heuristic — always move to the square with the
// fewest onward moves. Solves N×N knight's tours efficiently.
const int DR[8] = {-2,-2,-1,-1, 1, 1, 2, 2};
const int DC[8] = {-1, 1,-2, 2,-2, 2,-1, 1};

int degree(int r, int c, const vector<vector<int>>& b, int n) {
    int cnt = 0;
    for (int k = 0; k < 8; ++k) {
        int nr = r + DR[k], nc = c + DC[k];
        if (nr >= 0 && nc >= 0 && nr < n && nc < n && b[nr][nc] == 0) ++cnt;
    }
    return cnt;
}

bool knightTour(int n, int sr, int sc, vector<vector<int>>& b) {
    b.assign(n, vector<int>(n, 0));
    int r = sr, c = sc; b[r][c] = 1;
    for (int step = 2; step <= n * n; ++step) {
        int bestDeg = INT_MAX, br = -1, bc = -1;
        for (int k = 0; k < 8; ++k) {
            int nr = r + DR[k], nc = c + DC[k];
            if (nr < 0 || nc < 0 || nr >= n || nc >= n || b[nr][nc]) continue;
            int d = degree(nr, nc, b, n);
            if (d < bestDeg) { bestDeg = d; br = nr; bc = nc; }
        }
        if (br == -1) return false;
        r = br; c = bc; b[r][c] = step;
    }
    return true;
}
`),
    },
    "Tower of Hanoi": {
      time: "O(2^n)", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Classic recursive Tower of Hanoi.
// Move n disks from peg 'from' to peg 'to' using 'via' as helper.
void hanoi(int n, char from, char to, char via,
           vector<string>& moves) {
    if (n == 0) return;
    hanoi(n - 1, from, via, to, moves);
    moves.push_back(string("Move disk ") + to_string(n) +
                    ": " + from + " -> " + to);
    hanoi(n - 1, via, to, from, moves);
}

vector<string> solveHanoi(int n) {
    vector<string> moves;
    hanoi(n, 'A', 'C', 'B', moves);
    return moves;     // total = 2^n - 1 moves
}
`),
    },
  },

  // ────────────────────────────── LIBRARY (15 extra algorithms) ──────────────
  library: {
    "Boyer-Moore": {
      time: "O(n/m) avg, O(nm) worst", space: "O(σ)",
      code: s(`
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
}
`),
    },
    "Longest Palindrome": {
      time: "O(n²)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Expand around every center to find the longest palindromic substring.
string longestPalindrome(const string& s) {
    int n = s.size(), bestL = 0, bestR = 0;
    auto expand = [&](int l, int r) {
        while (l >= 0 && r < n && s[l] == s[r]) {
            if (r - l > bestR - bestL) { bestL = l; bestR = r; }
            --l; ++r;
        }
    };
    for (int c = 0; c < n; ++c) {
        expand(c, c);      // odd-length center
        expand(c, c + 1);  // even-length center
    }
    return s.substr(bestL, bestR - bestL + 1);
}
`),
    },
    "Manacher": {
      time: "O(n)", space: "O(n)",
      code: s(`
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
}
`),
    },
    "Sieve of Eratosthenes": {
      time: "O(n log log n)", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// All primes up to n.
vector<int> sieve(int n) {
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (long long i = 2; i * i <= n; ++i)
        if (isPrime[i])
            for (long long j = i * i; j <= n; j += i) isPrime[j] = false;
    vector<int> primes;
    for (int i = 2; i <= n; ++i) if (isPrime[i]) primes.push_back(i);
    return primes;
}
`),
    },
    "Euclidean GCD": {
      time: "O(log min(a,b))", space: "O(1)",
      code: s(`
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
}
`),
    },
    "Fast Modular Exponentiation": {
      time: "O(log e)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// (base^exp) mod m using square-and-multiply.
long long powmod(long long base, long long exp, long long m) {
    long long result = 1 % m;
    base %= m;
    while (exp > 0) {
        if (exp & 1) result = result * base % m;
        base = base * base % m;
        exp >>= 1;
    }
    return result;
}
`),
    },
    "Matrix Chain Multiplication": {
      time: "O(n³)", space: "O(n²)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// p has n+1 entries; matrix i has dim p[i] x p[i+1].
// Returns minimum scalar multiplications.
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
}
`),
    },
    "Rod Cutting": {
      time: "O(n²)", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// price[i] = price of rod length i+1. Returns max revenue for rod length n.
int rodCutting(const vector<int>& price, int n) {
    vector<int> dp(n + 1, 0);
    for (int i = 1; i <= n; ++i)
        for (int j = 0; j < i; ++j)
            dp[i] = max(dp[i], price[j] + dp[i - j - 1]);
    return dp[n];
}
`),
    },
    "Subset Sum": {
      time: "O(n·S)", space: "O(S)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Can any subset of nums sum to target?
bool subsetSum(const vector<int>& nums, int target) {
    vector<bool> dp(target + 1, false);
    dp[0] = true;
    for (int x : nums)
        for (int s = target; s >= x; --s) dp[s] = dp[s] || dp[s - x];
    return dp[target];
}
`),
    },
    "Union-Find (DSU)": {
      time: "O(α(n))", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Disjoint-set with path compression and union-by-rank.
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
};
`),
    },
    "Fenwick Tree (BIT)": {
      time: "O(log n) update/query", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// 1-indexed Binary Indexed Tree for prefix sums.
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
};
`),
    },
    "Segment Tree": {
      time: "O(log n) per op", space: "O(n)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Point update, range sum query.
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
};
`),
    },
    "Kosaraju SCC": {
      time: "O(V+E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Strongly-connected components by two DFS passes.
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
};
`),
    },
    "Tarjan Bridges": {
      time: "O(V+E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// Bridges = edges whose removal disconnects the graph.
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
};
`),
    },
    "Bipartite Check": {
      time: "O(V+E)", space: "O(V)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

// 2-color via BFS. Returns true iff bipartite.
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
}
`),
    },
    "Morris Traversal": {
      time: "O(n)", space: "O(1)",
      code: s(`
#include <bits/stdc++.h>
using namespace std;

struct Node { int val; Node *left = nullptr, *right = nullptr; };

// Inorder traversal of a binary tree without recursion or stack.
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
}
`),
    },
  },
};

