import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Nav } from "../components/Nav";

function NotFoundComponent() {
  // animated grid of cells gets "visited" by a fake BFS — same vibe as pathfinding
  const COLS = 18,
    ROWS = 9;
  const cells = useMemo(() => Array.from({ length: ROWS * COLS }, (_, i) => i), []);
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [glitchKey, setGlitchKey] = useState(0);

  useEffect(() => {
    let i = 0;
    const order = [...cells].sort(() => Math.random() - 0.5);
    const id = setInterval(() => {
      setVisited((prev) => {
        if (i >= order.length) {
          i = 0;
          return new Set();
        }
        const next = new Set(prev);
        next.add(order[i++]);
        return next;
      });
    }, 55);
    return () => clearInterval(id);
  }, [cells]);

  useEffect(() => {
    const id = setInterval(() => setGlitchKey((k) => k + 1), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex min-h-[78vh] items-center justify-center px-4 overflow-hidden">
      {/* animated grid backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      >
        <div
          className="absolute inset-0 grid gap-0.75 p-6"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {cells.map((i) => {
            const isVisited = visited.has(i);
            return (
              <div
                key={i}
                className="aspect-square rounded-[3px] transition-all duration-300"
                style={{
                  background: isVisited ? "oklch(0.72 0.19 255 / 35%)" : "oklch(1 0 0 / 4%)",
                  boxShadow: isVisited ? "0 0 8px oklch(0.72 0.19 255 / 50%)" : "none",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* floating orbs */}
      <div
        className="absolute top-10 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none animate-pulse"
        style={{ background: "oklch(0.72 0.19 255)" }}
      />
      <div
        className="absolute bottom-10 right-1/4 w-56 h-56 rounded-full blur-3xl opacity-25 pointer-events-none animate-pulse"
        style={{ background: "oklch(0.75 0.18 162)", animationDelay: "1s" }}
      />

      <div className="relative text-center space-y-5 z-10 max-w-md">
        <div
          key={glitchKey}
          className="relative inline-block text-[120px] sm:text-[160px] font-bold leading-none select-none"
          style={{ letterSpacing: "-0.06em" }}
        >
          <span
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.19 255), oklch(0.75 0.18 162), oklch(0.82 0.22 60))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            404
          </span>
          <span
            aria-hidden
            className="absolute inset-0 opacity-60 mix-blend-screen animate-glitch-a"
            style={{ color: "oklch(0.70 0.22 22)" }}
          >
            404
          </span>
          <span
            aria-hidden
            className="absolute inset-0 opacity-60 mix-blend-screen animate-glitch-b"
            style={{ color: "oklch(0.75 0.18 162)" }}
          >
            404
          </span>
        </div>

        <div className="space-y-1">
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            Path not found
          </h2>
          <p className="text-sm font-mono" style={{ color: "oklch(0.60 0.04 255)" }}>
            <span style={{ color: "oklch(0.74 0.20 30)" }}>BFS</span> exhausted the frontier · no
            route to this URL
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: "oklch(0.72 0.19 255)",
              color: "oklch(0.08 0.02 265)",
              boxShadow: "0 0 24px oklch(0.72 0.19 255 / 30%)",
            }}
          >
            ← Back to start node
          </Link>
          <Link
            to="/pathfinding"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{
              background: "oklch(1 0 0 / 6%)",
              color: "oklch(0.85 0.01 255)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            Try Pathfinding instead
          </Link>
        </div>

        <p className="text-[10px] font-mono pt-3" style={{ color: "oklch(0.40 0.04 255)" }}>
          status: 404 · visited: {visited.size}/{ROWS * COLS}
        </p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
          An unexpected error occurred.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "oklch(0.72 0.19 255)", color: "oklch(0.08 0.02 265)" }}
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: "oklch(1 0 0 / 6%)",
              color: "oklch(0.75 0.04 255)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "AlgoViz — Algorithm Visualizer (C++ STL)" },
      {
        name: "description",
        content:
          "Interactive visualizations of sorting, searching, graph, tree, DP, pathfinding, N-Queens, Knight's Tour and Tower of Hanoi — with C++ STL source code.",
      },
      { name: "theme-color", content: "#0a0d16" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AlgoViz" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "AlgoViz" },
      { property: "og:title", content: "AlgoViz — Algorithm Visualizer" },
      {
        property: "og:description",
        content: "Visualize classic algorithms step-by-step with live C++ STL code.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div
        className="min-h-screen grid-bg flex flex-col"
        style={{ background: "oklch(0.08 0.02 265)" }}
      >
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 sm:py-6 flex-1">
          <Outlet />
        </main>
        <footer
          className="mt-10 border-t"
          style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.07 0.02 265 / 60%)" }}
        >
          <div
            className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]"
            style={{ color: "oklch(0.55 0.04 255)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-5 w-5 rounded-md flex items-center justify-center"
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
              <span>AlgoViz · built for learning</span>
            </div>
            <div className="text-center sm:text-right">
              Made with <span style={{ color: "oklch(0.70 0.22 22)" }}>❤</span> by{" "}
              <a
                href="https://hafizsakib.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline-offset-2 hover:underline transition-colors"
                style={{ color: "oklch(0.85 0.12 200)" }}
              >
                Mohammad Hafizur Rahman Sakib
              </a>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
