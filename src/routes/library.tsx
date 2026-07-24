import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Search, Clock, HardDrive, Lightbulb, Target, BookOpen } from "lucide-react";
import { PythonCodePanel } from "../components/PythonCodePanel";
import { LIBRARY_DATA, LIBRARY_ALGOS } from "../lib/algorithms/libraryData";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Algorithm Library — AlgoViz" },
      {
        name: "description",
        content:
          "Browse 50+ classic computer-science algorithms with clean C++ STL source, syntax highlighting, and detailed how-it-works + when-to-use explanations.",
      },
      { property: "og:title", content: "AlgoViz Library — 50+ Algorithms with C++ & Explanations" },
      {
        property: "og:description",
        content:
          "Strings, math, DP, graphs, trees, data structures — each algorithm comes with highlighted C++ source and a clear explanation.",
      },
    ],
  }),
  component: LibraryPage,
});

const ACCENT = "oklch(0.75 0.18 162)";

const CATEGORY_COLORS: Record<string, string> = {
  Strings: "oklch(0.78 0.18 320)",
  Math: "oklch(0.82 0.16 200)",
  DP: "oklch(0.82 0.18 85)",
  "Data Structures": "oklch(0.75 0.18 162)",
  Graph: "oklch(0.72 0.19 255)",
  Tree: "oklch(0.78 0.16 145)",
  Sorting: "oklch(0.80 0.16 50)",
  Search: "oklch(0.78 0.10 30)",
  Geometry: "oklch(0.76 0.14 280)",
  Algorithms: "oklch(0.78 0.10 220)",
};

function LibraryPage() {
  const [query, setQuery] = useState("");
  const [algo, setAlgo] = useState<string>(LIBRARY_ALGOS[0]);
  const [activeCat, setActiveCat] = useState<string | "All">("All");

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    LIBRARY_ALGOS.forEach((n) => set.add(LIBRARY_DATA[n].category));
    return ["All", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY_ALGOS.filter((name) => {
      const entry = LIBRARY_DATA[name];
      if (activeCat !== "All" && entry.category !== activeCat) return false;
      if (!q) return true;
      return (
        name.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q) ||
        entry.explanation.howItWorks.toLowerCase().includes(q)
      );
    });
  }, [query, activeCat]);

  const entry = LIBRARY_DATA[algo];
  const catColor = CATEGORY_COLORS[entry.category] ?? ACCENT;

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={20} style={{ color: ACCENT }} />
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight truncate"
              style={{ letterSpacing: "-0.025em" }}
            >
              Algorithm Library
            </h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            {LIBRARY_ALGOS.length} classic CS &amp; problem-solving algorithms — highlighted C++
            STL source plus a detailed explanation for each one.
          </p>
        </div>
        <div
          className="text-xs font-mono px-3 py-1.5 rounded-full shrink-0"
          style={{
            background: "oklch(1 0 0 / 5%)",
            border: "1px solid oklch(1 0 0 / 10%)",
            color: "oklch(0.7 0.04 255)",
          }}
        >
          {filtered.length} / {LIBRARY_ALGOS.length}
        </div>
      </header>

      {/* Search + category chips */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "oklch(0.55 0.04 255)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search algorithms, categories, or keywords…"
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm outline-none"
            style={{
              background: "oklch(0.10 0.02 265)",
              border: "1px solid oklch(1 0 0 / 10%)",
              color: "oklch(0.92 0.01 255)",
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map((c) => {
            const active = activeCat === c;
            const color = c === "All" ? ACCENT : CATEGORY_COLORS[c] ?? ACCENT;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c as typeof activeCat)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: active ? `${color}24` : "oklch(1 0 0 / 4%)",
                  color: active ? color : "oklch(0.65 0.04 255)",
                  border: `1px solid ${active ? `${color}55` : "oklch(1 0 0 / 8%)"}`,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: sidebar + content. Stacked on mobile, side-by-side on lg.       */}
      {/* Each panel has its own scroll so the page itself doesn't jump.       */}
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar list */}
        <div
          className="rounded-2xl p-2 overflow-y-auto"
          style={{
            background: "oklch(0.10 0.02 265)",
            border: "1px solid oklch(1 0 0 / 8%)",
            maxHeight: "min(60vh, 520px)",
          }}
        >
          {filtered.length === 0 && (
            <div
              className="text-xs px-3 py-4 text-center"
              style={{ color: "oklch(0.55 0.04 255)" }}
            >
              No algorithms match "{query}".
            </div>
          )}
          {filtered.map((name) => {
            const active = name === algo;
            const cat = LIBRARY_DATA[name].category;
            const color = CATEGORY_COLORS[cat] ?? ACCENT;
            return (
              <motion.button
                key={name}
                onClick={() => setAlgo(name)}
                whileHover={{ x: 3 }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex flex-col gap-0.5 transition-all"
                style={{
                  background: active ? `${color}14` : "transparent",
                  borderLeft: active ? `2px solid ${color}` : "2px solid transparent",
                }}
              >
                <span
                  className="font-semibold truncate"
                  style={{ color: active ? "oklch(0.95 0.01 255)" : "oklch(0.78 0.02 255)" }}
                >
                  {name}
                </span>
                <span
                  className="text-[10px] font-mono uppercase tracking-wider"
                  style={{ color: active ? color : "oklch(0.45 0.04 255)" }}
                >
                  {cat}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Detail pane: code + explanation. Each has its own scroll on mobile.*/}
        <motion.div
          key={algo}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="space-y-4 min-w-0"
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-bold tracking-tight truncate">{algo}</h2>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: `${catColor}22`, color: catColor }}
            >
              {entry.category}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: "oklch(0.55 0.04 255)" }}
            >
              {entry.snippet.time} · {entry.snippet.space}
            </span>
          </div>

          <PythonCodePanel
            section="library"
            algo={algo}
            accentColor={catColor}
            bodyMaxHeight="min(55vh, 520px)"
          />

          {/* Explanation cards: independent scroll on small screens */}
          <div
            className="rounded-2xl overflow-y-auto"
            style={{
              background: "oklch(0.10 0.02 265)",
              border: "1px solid oklch(1 0 0 / 8%)",
              maxHeight: "min(55vh, 520px)",
            }}
          >
            <div className="p-4 sm:p-5 space-y-5">
              <Section
                icon={<Lightbulb size={14} />}
                title="How it works"
                color={catColor}
              >
                <p style={{ color: "oklch(0.78 0.02 255)" }}>
                  {entry.explanation.howItWorks}
                </p>
              </Section>

              <Section
                icon={<Target size={14} />}
                title="When to use it"
                color={catColor}
              >
                <ul className="space-y-1.5">
                  {entry.explanation.whenToUse.map((u, i) => (
                    <li
                      key={i}
                      className="flex gap-2"
                      style={{ color: "oklch(0.78 0.02 255)" }}
                    >
                      <span style={{ color: catColor }}>›</span>
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <div className="grid gap-3 sm:grid-cols-2">
                <Stat
                  icon={<Clock size={14} />}
                  label="Time complexity"
                  value={entry.explanation.time}
                  color={catColor}
                />
                <Stat
                  icon={<HardDrive size={14} />}
                  label="Space complexity"
                  value={entry.explanation.space}
                  color={catColor}
                />
              </div>

              <Section
                icon={<BookOpen size={14} />}
                title="Worked example"
                color={catColor}
              >
                <p
                  className="font-mono text-xs leading-relaxed"
                  style={{ color: "oklch(0.78 0.02 255)" }}
                >
                  {entry.explanation.example}
                </p>
              </Section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div
        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color }}
      >
        {icon}
        <span>{title}</span>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex items-center gap-3"
      style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 8%)" }}
    >
      <span
        className="grid h-7 w-7 place-items-center rounded-lg shrink-0"
        style={{ background: `${color}1F`, color }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "oklch(0.55 0.04 255)" }}
        >
          {label}
        </div>
        <div
          className="font-mono text-sm truncate"
          style={{ color: "oklch(0.92 0.01 255)" }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
