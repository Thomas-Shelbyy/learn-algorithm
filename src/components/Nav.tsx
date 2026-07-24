import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type LinkItem = { to: string; label: string; icon: string; color: string; desc: string };

const groups: { title: string; items: LinkItem[] }[] = [
  {
    title: "Core",
    items: [
      {
        to: "/sorting",
        label: "Sorting",
        icon: "⟨⟩",
        color: "oklch(0.72 0.19 255)",
        desc: "Bubble, quick, merge & more",
      },
      {
        to: "/searching",
        label: "Searching",
        icon: "⌕",
        color: "oklch(0.75 0.18 162)",
        desc: "Binary, jump, interpolation",
      },
      {
        to: "/dp",
        label: "Dynamic Prog.",
        icon: "⊞",
        color: "oklch(0.72 0.22 180)",
        desc: "Knapsack, LCS, edit distance",
      },
      {
        to: "/strings",
        label: "Strings",
        icon: "Σ",
        color: "oklch(0.82 0.22 60)",
        desc: "KMP, Rabin-Karp matching",
      },
    ],
  },
  {
    title: "Graphs & Trees",
    items: [
      {
        to: "/tree",
        label: "Tree",
        icon: "⋔",
        color: "oklch(0.82 0.18 85)",
        desc: "BST traversals & rotations",
      },
      {
        to: "/graph",
        label: "Graph",
        icon: "⬡",
        color: "oklch(0.75 0.18 310)",
        desc: "BFS, DFS, Dijkstra",
      },
      {
        to: "/pathfinding",
        label: "Pathfinding",
        icon: "◈",
        color: "oklch(0.68 0.22 22)",
        desc: "A* on an editable grid",
      },
    ],
  },
  {
    title: "Backtracking & Game Theory",
    items: [
      {
        to: "/nqueens",
        label: "N-Queens",
        icon: "♛",
        color: "oklch(0.82 0.18 85)",
        desc: "Place queens with no attacks",
      },
      {
        to: "/knights",
        label: "Knight's Tour",
        icon: "♞",
        color: "oklch(0.72 0.22 180)",
        desc: "Visit every square once",
      },
      {
        to: "/hanoi",
        label: "Tower of Hanoi",
        icon: "⌬",
        color: "oklch(0.75 0.18 310)",
        desc: "Classic recursive puzzle",
      },
      {
        to: "/gametheory",
        label: "Game Theory",
        icon: "♟",
        color: "oklch(0.72 0.19 255)",
        desc: "Nash, minimax, dilemma & more",
      },
    ],
  },
  {
    title: "Code Lab",
    items: [
      {
        to: "/cpprunner",
        label: "C++ Runner",
        icon: "{}",
        color: "oklch(0.72 0.19 255)",
        desc: "Step through C++ line by line",
      },
      {
        to: "/library",
        label: "Library",
        icon: "📚",
        color: "oklch(0.75 0.18 162)",
        desc: "Browse all 60+ algorithms",
      },
      {
        to: "/developer",
        label: "Developer",
        icon: "🛠",
        color: "oklch(0.68 0.22 200)",
        desc: "About & tech stack",
      },
    ],
  },
];

const allLinks = groups.flatMap((g) => g.items);

export function Nav() {
  const [open, setOpen] = useState(false); // mobile
  const [menu, setMenu] = useState(false); // desktop mega-menu
  const router = useRouterState();
  const path = router.location.pathname;
  const menuRef = useRef<HTMLDivElement>(null);

  // close desktop menu on route change
  useEffect(() => {
    setMenu(false);
    setOpen(false);
  }, [path]);

  // close on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const active = allLinks.find((l) => l.to === path);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "oklch(0.08 0.02 265 / 88%)",
        borderBottom: "1px solid oklch(1 0 0 / 8%)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.72 0.19 255), oklch(0.75 0.18 162))",
            }}
          >
            <img
              src="/icon-512.png"
              alt="AlgoViz"
              className="h-5 w-5 rounded-md object-contain select-none"
            />
          </div>
          <span
            className="font-semibold text-sm hidden sm:block"
            style={{ letterSpacing: "-0.02em" }}
          >
            <span className="text-white">Algo</span>
            <span style={{ color: "oklch(0.72 0.19 255)" }}>Viz</span>
          </span>
        </Link>

        {/* Desktop: quick links + Explore mega-menu */}
        <div className="hidden md:flex items-center gap-1" ref={menuRef}>
          {(
            [
              { to: "/sorting", label: "Sorting" },
              { to: "/searching", label: "Searching" },
              { to: "/pathfinding", label: "Pathfinding" },
              { to: "/cpprunner", label: "C++ Runner" },
              { to: "/gametheory", label: "Game Theory" },
              { to: "/library", label: "Library" },
            ] as const
          ).map((l) => {
            const isActive = path === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                style={{
                  color: isActive ? "oklch(0.95 0.01 255)" : "oklch(0.6 0.04 255)",
                  background: isActive ? "oklch(1 0 0 / 8%)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}

          {/* Explore button */}
          <button
            onClick={() => setMenu((v) => !v)}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              color: menu ? "oklch(0.95 0.01 255)" : "oklch(0.72 0.19 255)",
              background: menu ? "oklch(0.72 0.19 255 / 18%)" : "oklch(0.72 0.19 255 / 10%)",
              border: "1px solid oklch(0.72 0.19 255 / 30%)",
            }}
            aria-expanded={menu}
          >
            Explore all
            <motion.span
              animate={{ rotate: menu ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[10px]"
            >
              ▾
            </motion.span>
          </button>

          {/* Mega-menu panel */}
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute right-4 sm:right-6 top-14 w-160 max-w-[calc(100vw-2rem)] rounded-2xl p-4 grid grid-cols-2 gap-x-4 gap-y-4 shadow-2xl"
                style={{
                  background: "oklch(0.11 0.022 265 / 98%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  backdropFilter: "blur(24px)",
                }}
              >
                {groups.map((g) => (
                  <div key={g.title}>
                    <div
                      className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "oklch(0.5 0.04 255)" }}
                    >
                      {g.title}
                    </div>
                    <div className="space-y-0.5">
                      {g.items.map((l) => {
                        const isActive = path === l.to;
                        return (
                          <Link
                            key={l.to}
                            to={l.to}
                            className="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors"
                            style={{ background: isActive ? "oklch(1 0 0 / 7%)" : "transparent" }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                "oklch(1 0 0 / 6%)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = isActive
                                ? "oklch(1 0 0 / 7%)"
                                : "transparent";
                            }}
                          >
                            <span
                              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-transform group-hover:scale-110"
                              style={{ background: `${l.color}1f`, color: l.color }}
                            >
                              {l.icon}
                            </span>
                            <span className="min-w-0">
                              <span
                                className="block text-xs font-medium"
                                style={{ color: "oklch(0.92 0.01 255)" }}
                              >
                                {l.label}
                              </span>
                              <span
                                className="block truncate text-[10px]"
                                style={{ color: "oklch(0.5 0.04 255)" }}
                              >
                                {l.desc}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hamburger (mobile) */}
        <button
          className="md:hidden flex flex-col gap-1.25 p-2 rounded-lg"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          style={{ color: "oklch(0.65 0.04 255)" }}
        >
          <span
            className="block h-[1.5px] w-5 rounded-full transition-all duration-200"
            style={{
              background: "currentColor",
              transform: open ? "rotate(45deg) translate(4.5px,4.5px)" : "none",
            }}
          />
          <span
            className="block h-[1.5px] w-5 rounded-full transition-all duration-200"
            style={{ background: "currentColor", opacity: open ? 0 : 1 }}
          />
          <span
            className="block h-[1.5px] w-5 rounded-full transition-all duration-200"
            style={{
              background: "currentColor",
              transform: open ? "rotate(-45deg) translate(4.5px,-4.5px)" : "none",
            }}
          />
        </button>
      </div>

      {/* Mobile dropdown — grouped */}
      <div
        className="md:hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "820px" : "0", opacity: open ? 1 : 0, overflow: "hidden" }}
      >
        <div
          className="px-4 pb-4 pt-2 space-y-3"
          style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}
        >
          {groups.map((g) => (
            <div key={g.title}>
              <div
                className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "oklch(0.5 0.04 255)" }}
              >
                {g.title}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {g.items.map((l) => {
                  const isActive = path === l.to;
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: isActive ? "oklch(1 0 0 / 7%)" : "oklch(1 0 0 / 3%)",
                        color: isActive ? "oklch(0.95 0.01 255)" : "oklch(0.62 0.04 255)",
                        borderLeft: isActive ? `2px solid ${l.color}` : "2px solid transparent",
                      }}
                    >
                      <span className="w-4 text-center" style={{ color: l.color }}>
                        {l.icon}
                      </span>
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* subtle active-page indicator strip */}
      {active && (
        <div
          className="hidden md:block absolute bottom-0 left-0 h-0.5 w-full opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent, ${active.color}, transparent)`,
          }}
        />
      )}
    </header>
  );
}
