import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { PYTHON_CODES, type PySection } from "../lib/algorithms/python";
import { LIBRARY_DATA } from "../lib/algorithms/libraryData";
import {
  initialCppState,
  tokenizeCppLine,
  CPP_TOKEN_COLORS,
  type CppLineState,
} from "../lib/cppHighlight";

interface PythonCodePanelProps {
  section: PySection;
  algo: string;
  accentColor: string;
  /** Lines (1-indexed) to highlight as currently-executing. */
  activeLines?: number[];
  /** Optional max-height (CSS) for the code body — enables independent scroll. */
  bodyMaxHeight?: string;
}

export function PythonCodePanel({
  section,
  algo,
  accentColor,
  activeLines = [],
  bodyMaxHeight,
}: PythonCodePanelProps) {
  // The Library page extends the catalogue beyond what python.ts ships, so
  // fall back to LIBRARY_DATA when the section is "library".
  const snippet =
    PYTHON_CODES[section]?.[algo] ??
    (section === "library" ? LIBRARY_DATA[algo]?.snippet : undefined);
  const [copied, setCopied] = useState(false);

  // Tokenise once per snippet — keeps render cheap even for long programs.
  const highlighted = useMemo(() => {
    if (!snippet) return [] as { raw: string; tokens: ReturnType<typeof tokenizeCppLine> }[];
    const state: CppLineState = initialCppState();
    return snippet.code.split("\n").map((raw) => ({
      raw,
      tokens: tokenizeCppLine(raw, state),
    }));
  }, [snippet]);

  const activeSet = useMemo(() => new Set(activeLines), [activeLines]);

  // Auto-scroll the first active (currently-executing) line into view so the
  // user can always see which line is running, even in long programs.
  const bodyRef = useRef<HTMLDivElement>(null);
  const firstActive = activeLines.length ? Math.min(...activeLines) : -1;
  useEffect(() => {
    if (firstActive < 0) return;
    const container = bodyRef.current;
    if (!container) return;
    const lineEl = container.querySelector<HTMLElement>(`[data-line="${firstActive}"]`);
    if (!lineEl) return;
    const cTop = container.scrollTop;
    const cBottom = cTop + container.clientHeight;
    const lTop = lineEl.offsetTop;
    const lBottom = lTop + lineEl.offsetHeight;
    if (lTop < cTop + 12 || lBottom > cBottom - 12) {
      container.scrollTo({
        top: lTop - container.clientHeight / 2 + lineEl.offsetHeight,
        behavior: "smooth",
      });
    }
  }, [firstActive]);

  if (!snippet) {
    return (
      <div
        className="rounded-2xl p-4 text-xs"
        style={{
          background: "oklch(0.10 0.02 265)",
          border: "1px solid oklch(1 0 0 / 8%)",
          color: "oklch(0.55 0.04 255)",
        }}
      >
        C++ implementation coming soon for <strong>{algo}</strong>.
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([snippet.code], { type: "text/x-c++src" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeAlgo = algo.replace(/[^a-zA-Z0-9_-]/g, "_");
    a.href = url;
    a.download = `${section}_${safeAlgo}.cpp`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "oklch(0.10 0.02 265)",
        border: "1px solid oklch(1 0 0 / 8%)",
      }}
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className="text-[10px] font-mono uppercase tracking-widest truncate"
            style={{ color: "oklch(0.40 0.04 255)" }}
          >
            c++ · {algo}
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            Time {snippet.time}
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: "oklch(1 0 0 / 6%)", color: "oklch(0.55 0.04 255)" }}
          >
            Space {snippet.space}
          </span>
          {activeLines.length > 0 && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1"
              style={{
                background: `${accentColor}18`,
                color: accentColor,
                border: `1px solid ${accentColor}30`,
              }}
              title="Currently executing lines"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: accentColor }}
              />
              line {activeLines.join(", ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-95"
            style={{
              background: "oklch(0.72 0.19 255 / 14%)",
              color: "oklch(0.82 0.14 255)",
              border: "1px solid oklch(0.72 0.19 255 / 30%)",
            }}
            title="Download .cpp file"
          >
            <Download size={12} strokeWidth={2.4} />
            <span>Download</span>
          </button>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-95"
            style={{
              background: copied ? "oklch(0.75 0.18 162 / 18%)" : "oklch(0.75 0.18 162 / 14%)",
              color: copied ? "oklch(0.85 0.18 162)" : "oklch(0.80 0.16 162)",
              border: `1px solid ${
                copied ? "oklch(0.75 0.18 162 / 50%)" : "oklch(0.75 0.18 162 / 30%)"
              }`,
            }}
            title="Copy code to clipboard"
          >
            {copied ? <Check size={12} strokeWidth={2.4} /> : <Copy size={12} strokeWidth={2.4} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Code body — independent vertical scroll when bodyMaxHeight is set */}
      <div
        ref={bodyRef}
        className="overflow-auto relative"
        style={bodyMaxHeight ? { maxHeight: bodyMaxHeight } : undefined}
      >
        <pre
          className="text-[12px] font-mono leading-relaxed py-3"
          style={{
            color: "oklch(0.82 0.02 255)",
            whiteSpace: "pre",
            minWidth: "max-content",
            margin: 0,
          }}
        >
          {highlighted.map(({ raw, tokens }, i) => {
            const lineNo = i + 1;
            const isActive = activeSet.has(lineNo);
            const isFirstActive = lineNo === firstActive;
            return (
              <div
                key={i}
                data-line={lineNo}
                className={`flex relative ${isActive ? "code-line-active" : ""}`}
                style={{
                  background: isActive ? `${accentColor}22` : "transparent",
                  borderLeft: `3px solid ${isActive ? accentColor : "transparent"}`,
                  boxShadow: isActive ? `inset 0 0 18px ${accentColor}1c` : "none",
                  transition: "background-color 140ms ease, box-shadow 140ms ease",
                }}
              >
                {/* execution pointer on the first active line */}
                <span
                  className="select-none w-4 text-center"
                  style={{
                    color: accentColor,
                    opacity: isFirstActive ? 1 : 0,
                    transition: "opacity 120ms ease",
                  }}
                  aria-hidden
                >
                  {isFirstActive ? "▶" : ""}
                </span>
                <span
                  className="select-none text-right pr-3 pl-1"
                  style={{
                    color: isActive ? accentColor : "oklch(0.35 0.03 255)",
                    minWidth: "2.1rem",
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {lineNo}
                </span>
                <span className="flex-1 pr-4">
                  {tokens.length === 0
                    ? raw.length
                      ? raw
                      : "\u00a0"
                    : tokens.map((t, idx) => (
                        <span
                          key={idx}
                          style={{
                            color: CPP_TOKEN_COLORS[t.kind],
                            fontStyle: t.kind === "comment" ? "italic" : undefined,
                            fontWeight:
                              t.kind === "keyword" || t.kind === "preproc" ? 600 : undefined,
                          }}
                        >
                          {t.text}
                        </span>
                      ))}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
