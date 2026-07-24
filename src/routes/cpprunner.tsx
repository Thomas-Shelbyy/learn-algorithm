import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controls } from "../components/viz/Controls";
import { runCpp, type Step } from "../lib/cpp/interpreter";

export const Route = createFileRoute("/cpprunner")({
  head: () => ({
    meta: [
      { title: "C++ Runner — AlgoViz" },
      { name: "description", content: "Run C++ line by line — arrays, vectors, functions, recursion, STL, cin — with a live call stack, variables, and output." },
    ],
  }),
  component: CppRunnerPage,
});

const ACCENT = "oklch(0.72 0.19 255)";
const panel: React.CSSProperties = { background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" };

const EXAMPLES: { name: string; code: string; stdin?: string }[] = [
  {
    name: "Arithmetic",
    code: `#include <iostream>
using namespace std;

int main() {
    int a = 12, b = 5;
    cout << "sum  = " << a + b << endl;
    cout << "diff = " << a - b << endl;
    cout << "prod = " << a * b << endl;
    cout << "quot = " << a / b << endl;
    cout << "rem  = " << a % b << endl;
    return 0;
}`,
  },
  {
    name: "If / Else",
    code: `#include <iostream>
using namespace std;

int main() {
    int score = 76;
    if (score >= 90) cout << "Grade A" << endl;
    else if (score >= 75) cout << "Grade B" << endl;
    else if (score >= 60) cout << "Grade C" << endl;
    else cout << "Fail" << endl;
    return 0;
}`,
  },
  {
    name: "Loops",
    code: `#include <iostream>
using namespace std;

int main() {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum += i;
        cout << "i=" << i << " sum=" << sum << endl;
    }
    cout << "Total = " << sum << endl;
    return 0;
}`,
  },
  {
    name: "Arrays",
    code: `#include <iostream>
using namespace std;

int main() {
    int a[5];
    for (int i = 0; i < 5; i++) a[i] = i * i;
    for (int i = 0; i < 5; i++) cout << a[i] << " ";
    cout << endl;
    cout << "a[3] = " << a[3] << endl;
    return 0;
}`,
  },
  {
    name: "Vector",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    v.push_back(10);
    v.push_back(20);
    v.push_back(30);
    cout << "size = " << v.size() << endl;
    cout << "v[1] = " << v[1] << endl;
    v.pop_back();
    cout << "after pop_back, size = " << v.size() << endl;
    return 0;
}`,
  },
  {
    name: "Recursion",
    code: `#include <iostream>
using namespace std;

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    for (int i = 1; i <= 5; i++)
        cout << i << "! = " << factorial(i) << endl;
    return 0;
}`,
  },
  {
    name: "Sieve",
    code: `#include <iostream>
using namespace std;

int main() {
    int N = 30;
    bool prime[31];
    for (int i = 0; i <= N; i++) prime[i] = true;
    prime[0] = false; prime[1] = false;
    for (int i = 2; i * i <= N; i++) {
        if (prime[i]) {
            for (int j = i * i; j <= N; j += i) prime[j] = false;
        }
    }
    for (int i = 2; i <= N; i++) if (prime[i]) cout << i << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    name: "Binary search",
    code: `#include <iostream>
using namespace std;

int main() {
    int a[10];
    for (int i = 0; i < 10; i++) a[i] = i * 3;
    int target = 18, lo = 0, hi = 9, ans = -1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] == target) { ans = mid; break; }
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    cout << "Found at index " << ans << endl;
    return 0;
}`,
  },
  {
    name: "Sort",
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> v;
    v.push_back(5); v.push_back(2); v.push_back(8);
    v.push_back(1); v.push_back(9);
    sort(v);
    for (int i = 0; i < v.size(); i++) cout << v[i] << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    name: "cin input",
    code: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << "sum = " << a + b << endl;
    cout << "max = " << (a > b ? a : b) << endl;
    return 0;
}`,
    stdin: "7 12",
  },
];

function CppRunnerPage() {
  const [activeEx, setActiveEx] = useState(0);
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [stdin, setStdin] = useState("");
  const [speed, setSpeed] = useState(55);

  const result = useMemo(() => runCpp(code, stdin), [code, stdin]);
  const steps = result.steps;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => { setIndex(0); setPlaying(false); }, [code, stdin]);
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => { if (i >= steps.length - 1) { setPlaying(false); return i; } return i + 1; });
    }, Math.max(90, 1100 - speed * 9));
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [playing, speed, steps.length]);

  const onPlay = useCallback(() => { setIndex((i) => (i >= steps.length - 1 ? 0 : i)); setPlaying(true); }, [steps.length]);
  const onPause = useCallback(() => setPlaying(false), []);
  const onReset = useCallback(() => { setPlaying(false); setIndex(0); }, []);
  const onStepFwd = useCallback(() => setIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);
  const onStepBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const cur: Step | undefined = steps[Math.min(index, steps.length - 1)];
  const curLine = cur?.line ?? -1;
  const lines = code.split("\n");
  const codeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = codeRef.current?.querySelector(`[data-ln="${curLine}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [curLine]);

  const loadExample = (i: number) => { setActiveEx(i); setCode(EXAMPLES[i].code); setStdin(EXAMPLES[i].stdin ?? ""); };

  return (
    <div className="space-y-4 py-2">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-mono" style={{ color: ACCENT }}>{"{ }"}</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>C++ Runner</h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>Run C++ line by line — arrays, vectors, functions, recursion, STL & cin — with a live call stack, variables, and output.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex, i) => (
            <button key={ex.name} onClick={() => loadExample(i)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
              style={{ background: activeEx === i ? ACCENT : "oklch(1 0 0 / 6%)", color: activeEx === i ? "oklch(0.08 0.02 265)" : "oklch(0.65 0.04 255)", border: `1px solid ${activeEx === i ? ACCENT : "oklch(1 0 0 / 10%)"}` }}>
              {ex.name}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* editable source */}
        <div className="rounded-2xl overflow-hidden" style={panel}>
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest flex items-center justify-between" style={{ color: "oklch(0.45 0.04 255)" }}>
            <span>source — editable</span>
            <button onClick={onReset} className="px-2 py-0.5 rounded text-[10px]" style={{ background: "oklch(1 0 0 / 6%)", color: "oklch(0.6 0.04 255)" }}>reset run</button>
          </div>
          <textarea value={code} onChange={(e) => { setActiveEx(-1); setCode(e.target.value); }} spellCheck={false}
            className="w-full font-mono text-[12.5px] leading-relaxed p-3 outline-none resize-y"
            style={{ minHeight: 360, background: "oklch(0.07 0.015 265)", color: "oklch(0.82 0.03 255)", border: "none" }} />
        </div>

        {/* execution view */}
        <div className="rounded-2xl overflow-hidden" style={panel}>
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: "oklch(0.45 0.04 255)" }}>execution — current line highlighted</div>
          <div ref={codeRef} className="font-mono text-[12.5px] leading-relaxed p-3 overflow-auto" style={{ maxHeight: 400, background: "oklch(0.07 0.015 265)" }}>
            {lines.map((ln, idx) => {
              const lineNo = idx + 1;
              const running = lineNo === curLine;
              return (
                <div key={idx} data-ln={lineNo} className="flex items-start gap-3 rounded px-2 -mx-1 transition-colors" style={{ background: running ? `${ACCENT}26` : "transparent", boxShadow: running ? `inset 3px 0 0 ${ACCENT}` : "none" }}>
                  <span className="select-none w-6 text-right shrink-0" style={{ color: running ? ACCENT : "oklch(0.4 0.04 255)" }}>{lineNo}</span>
                  <span className="shrink-0 w-3" style={{ color: ACCENT }}>{running ? "▶" : ""}</span>
                  <span className="whitespace-pre" style={{ color: running ? "oklch(0.95 0.02 255)" : "oklch(0.7 0.03 255)" }}>{ln || " "}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* stdin */}
      <div className="rounded-2xl p-4" style={panel}>
        <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "oklch(0.45 0.04 255)" }}>program input (cin) — whitespace separated</div>
        <input value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="e.g. 7 12" spellCheck={false}
          className="w-full font-mono text-[12.5px] rounded-lg px-3 py-2 outline-none" style={{ background: "oklch(0.07 0.015 265)", color: "oklch(0.85 0.18 162)", border: "1px solid oklch(1 0 0 / 10%)" }} />
      </div>

      {/* call stack + scopes */}
      <div className="rounded-2xl p-4" style={panel}>
        <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "oklch(0.45 0.04 255)" }}>call stack &amp; variables</div>
        {result.error ? (
          <div className="text-sm font-mono" style={{ color: "var(--danger)" }}>{result.error}</div>
        ) : !cur || cur.stack.length === 0 ? (
          <div className="text-sm" style={{ color: "oklch(0.5 0.04 255)" }}>No active frames.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {cur.stack.slice().reverse().map((fr, ri) => {
                const depth = cur.stack.length - 1 - ri;
                const isTop = ri === 0;
                return (
                  <motion.div key={fr.func + "@" + depth} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                    className="rounded-xl p-3" style={{ background: isTop ? `${ACCENT}14` : "oklch(1 0 0 / 3%)", border: `1px solid ${isTop ? `${ACCENT}40` : "oklch(1 0 0 / 8%)"}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: isTop ? ACCENT : "oklch(1 0 0 / 8%)", color: isTop ? "oklch(0.08 0.02 265)" : "oklch(0.6 0.04 255)" }}>frame {depth}</span>
                      <span className="font-mono text-xs font-bold" style={{ color: "oklch(0.85 0.02 255)" }}>{fr.func}()</span>
                    </div>
                    {fr.vars.length === 0 ? (
                      <span className="text-[11px]" style={{ color: "oklch(0.45 0.04 255)" }}>no locals yet</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {fr.vars.map(([k, v], i) => (
                          <div key={k + i} className="rounded-lg px-2.5 py-1 font-mono text-[11px]" style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 10%)" }}>
                            <span style={{ color: ACCENT }}>{k}</span>
                            <span style={{ color: "oklch(0.5 0.04 255)" }}> = </span>
                            <span style={{ color: "oklch(0.9 0.02 255)" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {cur.note && (
              <div className="text-xs rounded-lg px-3 py-2" style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, color: "oklch(0.8 0.02 255)" }}>{cur.note}</div>
            )}
          </div>
        )}
      </div>

      {/* output */}
      <div className="rounded-2xl p-4" style={panel}>
        <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "oklch(0.45 0.04 255)" }}>stdout (cout)</div>
        <pre className="font-mono text-[12.5px] leading-relaxed rounded-lg p-3 overflow-auto whitespace-pre-wrap" style={{ minHeight: 110, maxHeight: 240, background: "oklch(0.07 0.015 265)", color: "oklch(0.85 0.18 162)" }}>{cur?.output || ""}<motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.9 }} style={{ color: ACCENT }}>▌</motion.span></pre>
      </div>

      <Controls playing={playing} onPlay={onPlay} onPause={onPause} onReset={onReset} onStepBack={onStepBack} onStepFwd={onStepFwd} speed={speed} setSpeed={setSpeed} index={index} total={steps.length} />

      <p className="text-[11px]" style={{ color: "oklch(0.42 0.04 255)" }}>
        Teaching interpreter for a large subset of C++: variables, arithmetic/bitwise/logical/ternary operators, if/else, for/while/do-while, switch, break/continue, arrays (incl. 2D), std::vector, std::string methods, functions &amp; recursion (with call stack), cin, and STL helpers (sort, reverse, min, max, swap, abs, sqrt, pow, gcd…). Not yet supported: classes/structs, maps/sets, pointers, and new/delete.
      </p>
    </div>
  );
}
