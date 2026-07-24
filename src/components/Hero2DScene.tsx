import { useEffect, useRef, useState } from "react";

// ─── 2D Canvas Hero: Quick Sort + Binary Search ──────────────────────────────
// Replaces the old three.js hero. Same algorithms, same beats, flat & crisp.

type HeroMode = "Quick Sort" | "Binary Search";

type SortStep =
  | { type: "compare"; i: number; j: number }
  | { type: "swap"; i: number; j: number }
  | { type: "sorted"; i: number };

type SearchStep =
  | { type: "range"; lo: number; hi: number }
  | { type: "probe"; mid: number }
  | { type: "found"; mid: number }
  | { type: "miss" };

function genQuickSteps(input: number[]): SortStep[] {
  const a = [...input];
  const steps: SortStep[] = [];
  const cmp = (i: number, j: number) => steps.push({ type: "compare", i, j });
  const swp = (i: number, j: number) => {
    [a[i], a[j]] = [a[j], a[i]];
    steps.push({ type: "swap", i, j });
  };
  const qs = (lo: number, hi: number) => {
    if (lo >= hi) {
      if (lo === hi) steps.push({ type: "sorted", i: lo });
      return;
    }
    const pivot = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      cmp(j, hi);
      if (a[j] <= pivot) {
        i++;
        if (i !== j) swp(i, j);
      }
    }
    if (i + 1 !== hi) swp(i + 1, hi);
    steps.push({ type: "sorted", i: i + 1 });
    qs(lo, i);
    qs(i + 2, hi);
  };
  qs(0, a.length - 1);
  return steps;
}

function genBinarySearchSteps(sorted: number[], target: number): SearchStep[] {
  const steps: SearchStep[] = [];
  let lo = 0,
    hi = sorted.length - 1;
  steps.push({ type: "range", lo, hi });
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    steps.push({ type: "probe", mid });
    if (sorted[mid] === target) {
      steps.push({ type: "found", mid });
      return steps;
    }
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
    steps.push({ type: "range", lo, hi });
  }
  steps.push({ type: "miss" });
  return steps;
}

const BAR_COUNT = 16;
const BS_COUNT = 14;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  r: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function hexToRgb(c: string) {
  if (c.startsWith("rgb")) {
    const m = c.match(/[\d.]+/g);
    if (m && m.length >= 3) {
      return { r: parseFloat(m[0]), g: parseFloat(m[1]), b: parseFloat(m[2]) };
    }
    return { r: 0, g: 0, b: 0 };
  }
  const m = c.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return { r, g, b };
}
function mixColor(c1: string, c2: string, t: number) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r},${g},${bl})`;
}

export function Hero2DScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<HeroMode>("Quick Sort");
  const [shuffleKey, setShuffleKey] = useState(0);
  const [bsInfo, setBsInfo] = useState<{
    lo: number;
    hi: number;
    mid: number;
    target: number;
    found: boolean;
    miss: boolean;
  }>({ lo: 0, hi: BS_COUNT - 1, mid: -1, target: 0, found: false, miss: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx = ctx2d;

    let W = 0,
      H = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      W = Math.max(1, Math.round(rect?.width || canvas.clientWidth || 600));
      H = Math.max(1, Math.round(rect?.height || canvas.clientHeight || 320));
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    // Parent may not have final layout dimensions on first paint (e.g. while
    // the hero card is still animating in). ResizeObserver catches that and
    // any later size changes; window resize is kept as a fallback.
    let ro: ResizeObserver | null = null;
    if (canvas.parentElement && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas.parentElement);
    }

    // ── Colors ──
    const C_BG_GLOW = "#0a0f1f";
    const C_COMPARE = "#ffd34d";
    const C_SWAP = "#ff6b5e";
    const C_SORTED = "#3ddc97";
    const C_HOVER = "#ffffff";
    const C_RANGE = "#5a7cff";
    const C_PROBE = "#ffd34d";
    const C_FOUND = "#3ddc97";
    const C_DIM = "#1a2240";
    const C_TARGET = "#a0d8ff";

    const baseColorFor = (v: number) => {
      // hue sweeps blue -> purple as value increases, HSL-ish via manual mix
      const hues = ["#4da3ff", "#7aa7ff", "#a78bff", "#c98bff"];
      const t = clamp(v, 0, 1);
      const seg = t * (hues.length - 1);
      const i0 = Math.floor(seg);
      const i1 = Math.min(hues.length - 1, i0 + 1);
      return mixColor(hues[i0], hues[i1], seg - i0);
    };

    // ── Sort bars state ──
    interface Bar {
      value: number;
      slot: number;
      sorted: boolean;
      x: number; // current animated x (slot center)
      targetX: number;
      hop: number; // 0..1 arc progress when swapping
      hopFrom: number;
      hopTo: number;
      color: string;
      glow: number;
      scalePulse: number;
    }
    let bars: Bar[] = [];
    let slotToBar: Bar[] = [];

    // ── Binary search tiles state ──
    interface Tile {
      value: number;
      idx: number;
      color: string;
      glow: number;
      y: number; // vertical offset for lift
      targetY: number;
      scale: number;
    }
    let tiles: Tile[] = [];

    const initialValues = () =>
      Array.from({ length: BAR_COUNT }, (_, i) => (i + 1) / BAR_COUNT);

    function shuffleArr<T>(arr: T[]) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    let sortSteps: SortStep[] = [];
    let searchSteps: SearchStep[] = [];
    let stepIdx = 0;
    let cooldown = 0;
    let comparing: [Bar, Bar] | null = null;
    let searchLo = 0,
      searchHi = BS_COUNT - 1;
    let searchProbe = -1;
    let searchFound = -1;
    let targetBsIdx = 0;
    let searchTargetValue = 0;
    let stepTimer = 0;
    let stepInterval = 620; // ms per step, sort
    const sparks: Spark[] = [];

    function spawnBurst(x: number, y: number, color: string, count = 18) {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 1.2 + Math.random() * 2.2;
        sparks.push({
          x,
          y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 1,
          life: 1,
          color,
          r: 1.5 + Math.random() * 2,
        });
      }
    }

    function rebuildSort() {
      const vals = shuffleArr(initialValues());
      bars = vals.map((v, i) => ({
        value: v,
        slot: i,
        sorted: false,
        x: i,
        targetX: i,
        hop: 0,
        hopFrom: i,
        hopTo: i,
        color: baseColorFor(v),
        glow: 0,
        scalePulse: 1,
      }));
      slotToBar = [...bars];
      sortSteps = genQuickSteps(vals);
      stepIdx = 0;
      comparing = null;
      cooldown = 500;
      stepInterval = sortSteps.length > 60 ? 90 : 140;
    }

    function rebuildSearch() {
      const bsValues = Array.from({ length: BS_COUNT }, (_, i) => i + 1);
      tiles = bsValues.map((v, i) => ({
        value: v,
        idx: i,
        color: C_DIM,
        glow: 0.15,
        y: 0,
        targetY: 0,
        scale: 1,
      }));
      targetBsIdx = Math.floor(Math.random() * BS_COUNT);
      searchTargetValue = bsValues[targetBsIdx];
      searchSteps = genBinarySearchSteps(bsValues, searchTargetValue);
      stepIdx = 0;
      searchLo = 0;
      searchHi = BS_COUNT - 1;
      searchProbe = -1;
      searchFound = -1;
      cooldown = 500;
      stepInterval = 560;
      setBsInfo({
        lo: 0,
        hi: BS_COUNT - 1,
        mid: -1,
        target: searchTargetValue,
        found: false,
        miss: false,
      });
    }

    function rebuild() {
      if (mode === "Quick Sort") rebuildSort();
      else rebuildSearch();
    }
    rebuild();

    function applySortStep(s: SortStep, cx: number, cyBase: number, barW: number, gap: number) {
      if (s.type === "compare") {
        comparing = [slotToBar[s.i], slotToBar[s.j]];
      } else if (s.type === "swap") {
        const A = slotToBar[s.i];
        const B = slotToBar[s.j];
        A.hopFrom = A.slot;
        B.hopFrom = B.slot;
        const tmp = A.slot;
        A.slot = B.slot;
        B.slot = tmp;
        A.hopTo = A.slot;
        B.hopTo = B.slot;
        A.hop = 0.001;
        B.hop = 0.001;
        slotToBar[A.slot] = A;
        slotToBar[B.slot] = B;
        comparing = null;
      } else {
        const b = slotToBar[s.i];
        b.sorted = true;
        comparing = null;
        const x = cx + b.slot * (barW + gap) + barW / 2;
        spawnBurst(x, cyBase - 10, C_SORTED, 10);
      }
    }

    function applySearchStep(s: SearchStep, tileXAt: (i: number) => number, cy: number) {
      if (s.type === "range") {
        searchLo = s.lo;
        searchHi = s.hi;
        searchProbe = -1;
        setBsInfo((prev) => ({ ...prev, lo: s.lo, hi: s.hi, mid: -1 }));
      } else if (s.type === "probe") {
        searchProbe = s.mid;
        setBsInfo((prev) => ({ ...prev, mid: s.mid }));
      } else if (s.type === "found") {
        searchFound = s.mid;
        searchProbe = s.mid;
        setBsInfo((prev) => ({ ...prev, found: true, mid: s.mid }));
        spawnBurst(tileXAt(s.mid), cy, C_FOUND, 26);
      } else {
        searchProbe = -1;
        setBsInfo((prev) => ({ ...prev, miss: true }));
      }
    }

    // ── Pointer interaction ──
    let hoverIdx = -1;
    let pointerX = -1,
      pointerY = -1;
    let isOver = false;

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      isOver = true;
    };
    const onLeave = () => {
      isOver = false;
      hoverIdx = -1;
    };
    const onClick = () => {
      rebuild();
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);
    canvas.style.cursor = "pointer";

    const sortLayout = () => {
      const barW = Math.max(4, Math.min(34, (W - 60) / BAR_COUNT - 6));
      const gap = 6;
      const totalW = BAR_COUNT * (barW + gap) - gap;
      const cx = (W - totalW) / 2;
      return { barW, gap, cx };
    };
    const searchLayout = () => {
      const tileW = Math.max(4, Math.min(40, (W - 60) / BS_COUNT - 6));
      const gapT = 7;
      const totalWT = BS_COUNT * (tileW + gapT) - gapT;
      const cxT = (W - totalWT) / 2;
      const tileXAt = (i: number) => cxT + i * (tileW + gapT) + tileW / 2;
      return { tileW, gapT, cxT, tileXAt };
    };
    const advanceStep = (dt: number) => {
      if (cooldown > 0) {
        cooldown -= dt;
        return;
      }
      stepTimer += dt;
      if (stepTimer < stepInterval) return;
      stepTimer = 0;
      if (mode === "Quick Sort") {
        if (stepIdx < sortSteps.length) {
          const { barW, gap, cx } = sortLayout();
          applySortStep(sortSteps[stepIdx++], cx, H - 56, barW, gap);
        } else if (sortSteps.length > 0) {
          comparing = null;
          cooldown = 1100;
          sortSteps = [];
        } else {
          rebuild();
        }
      } else {
        const { tileXAt } = searchLayout();
        if (stepIdx < searchSteps.length) {
          applySearchStep(searchSteps[stepIdx++], tileXAt, H / 2);
        } else if (searchSteps.length > 0) {
          cooldown = 1300;
          searchSteps = [];
        } else {
          rebuild();
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    let t = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(48, now - last);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, W, H);

      // background subtle radial glow + grid
      const grad = ctx.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.35, Math.max(W, H) * 0.75);
      grad.addColorStop(0, "#0d1530");
      grad.addColorStop(1, C_BG_GLOW);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#7aa7ff";
      ctx.lineWidth = 1;
      const gridSize = 28;
      for (let gx = (t * 0.01) % gridSize; gx < W; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }
      ctx.restore();

      // floating ambient particles
      ctx.save();
      for (let i = 0; i < 26; i++) {
        const seed = i * 137.5;
        const px = (Math.sin(seed + t * 0.00012) * 0.5 + 0.5) * W;
        const py = ((seed * 0.618 + t * 0.012) % H);
        ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 0.001 + i);
        ctx.fillStyle = "#7aa7ff";
        ctx.beginPath();
        ctx.arc(px, py, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      advanceStep(dt);

      if (mode === "Quick Sort") {
        const { barW, gap, cx } = sortLayout();
        const baseY = Math.max(40, H - 56);
        const maxBarH = Math.max(20, H - 120);

        hoverIdx = -1;
        if (isOver) {
          for (const b of bars) {
            const x = cx + b.slot * (barW + gap);
            if (pointerX >= x && pointerX <= x + barW) hoverIdx = b.slot;
          }
        }

        for (const b of bars) {
          // advance hop animation (parabolic arc swap)
          if (b.hop > 0 && b.hop < 1) {
            b.hop = Math.min(1, b.hop + dt / 260);
          }
          const ease = b.hop > 0 ? 0.5 - 0.5 * Math.cos(Math.PI * b.hop) : 1;
          const fromX = b.hop > 0 ? b.hopFrom : b.slot;
          const toX = b.hop > 0 ? b.hopTo : b.slot;
          b.x = lerp(fromX, toX, b.hop > 0 ? ease : 1);
          if (b.hop >= 1) b.hop = 0;

          const isHover = b.slot === hoverIdx;
          const isCmp = !!comparing && (comparing[0] === b || comparing[1] === b);
          const inHop = b.hop > 0;
          let target = baseColorFor(b.value);
          let glowTarget = 0.15;
          if (isHover) {
            target = C_HOVER;
            glowTarget = 0.5;
          } else if (inHop) {
            target = C_SWAP;
            glowTarget = 0.9;
          } else if (isCmp) {
            target = C_COMPARE;
            glowTarget = 0.85;
          } else if (b.sorted) {
            target = C_SORTED;
            glowTarget = 0.45;
          }
          b.color = target;
          b.glow = lerp(b.glow, glowTarget, 0.15);
          b.scalePulse = lerp(b.scalePulse, isHover ? 1.06 : 1, 0.2);

          const px = cx + b.x * (barW + gap);
          const lift = inHop ? Math.sin(Math.PI * b.hop) * 22 : 0;
          const barH = Math.max(2, (0.18 + b.value * 0.82) * maxBarH * b.scalePulse);
          const py = baseY - barH - lift;

          ctx.save();
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 6 + b.glow * 22;
          const barGrad = ctx.createLinearGradient(px, py, px, baseY);
          barGrad.addColorStop(0, b.color);
          barGrad.addColorStop(1, mixColor(b.color, "#05060d", 0.55));
          ctx.fillStyle = barGrad;
          const r = Math.min(6, barW / 3);
          roundRect(ctx, px, py, barW, barH, r);
          ctx.fill();
          ctx.restore();

          if (b.sorted) {
            ctx.save();
            ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 0.006 + b.slot);
            ctx.fillStyle = "#ffffff";
            roundRect(ctx, px, py, barW, Math.min(6, barH), r);
            ctx.fill();
            ctx.restore();
          }
        }
      } else {
        const { tileW, tileXAt } = searchLayout();
        const cy = H / 2;

        hoverIdx = -1;
        if (isOver) {
          for (const tl of tiles) {
            const x = tileXAt(tl.idx) - tileW / 2;
            if (pointerX >= x && pointerX <= x + tileW && pointerY >= cy - tileW / 2 - 30 && pointerY <= cy + tileW / 2 + 30)
              hoverIdx = tl.idx;
          }
        }

        // range bracket
        const loX = tileXAt(searchLo) - tileW / 2 - 8;
        const hiX = tileXAt(searchHi) + tileW / 2 + 8;
        ctx.save();
        ctx.strokeStyle = C_RANGE;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 0.004);
        ctx.shadowColor = C_RANGE;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(loX, cy - 34);
        ctx.lineTo(loX, cy + 34);
        ctx.moveTo(hiX, cy - 34);
        ctx.lineTo(hiX, cy + 34);
        ctx.stroke();
        ctx.restore();

        for (const tl of tiles) {
          const isFound = tl.idx === searchFound;
          const isProbe = tl.idx === searchProbe;
          const inRange = tl.idx >= searchLo && tl.idx <= searchHi;
          const isHover = tl.idx === hoverIdx;
          const isTarget = tl.idx === targetBsIdx;

          let target = C_DIM;
          let glowTarget = 0.12;
          let targetY = 0;
          let targetScale = 1;
          if (isFound) {
            target = C_FOUND;
            glowTarget = 1.3;
            targetY = -14;
            targetScale = 1.22;
          } else if (isProbe) {
            target = C_PROBE;
            glowTarget = 1.1;
            targetY = -8;
            targetScale = 1.15;
          } else if (isHover) {
            target = C_HOVER;
            glowTarget = 0.6;
          } else if (isTarget && inRange) {
            target = C_TARGET;
            glowTarget = 0.55;
          } else if (inRange) {
            target = C_RANGE;
            glowTarget = 0.4;
          }
          tl.color = target;
          tl.glow = lerp(tl.glow, glowTarget, 0.16);
          tl.y = lerp(tl.y, targetY, 0.18);
          tl.scale = lerp(tl.scale, targetScale, 0.18);

          const x = tileXAt(tl.idx);
          const size = tileW * tl.scale;
          const py = cy + tl.y;

          ctx.save();
          ctx.shadowColor = tl.color;
          ctx.shadowBlur = 6 + tl.glow * 18;
          const tg = ctx.createLinearGradient(x, py - size / 2, x, py + size / 2);
          tg.addColorStop(0, tl.color);
          tg.addColorStop(1, mixColor(tl.color, "#05060d", 0.5));
          ctx.fillStyle = tg;
          roundRect(ctx, x - size / 2, py - size / 2, size, size, 8);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.fillStyle = inRange || isFound || isProbe ? "#0b0f1e" : "#cdd8ff";
          ctx.globalAlpha = inRange || isFound || isProbe ? 0.85 : 0.45;
          ctx.font = "600 13px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(tl.value), x, py + 1);
          ctx.restore();

          if (isProbe || isFound) {
            ctx.save();
            ctx.fillStyle = tl.color;
            ctx.font = "700 10px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("mid", x, py - size / 2 - 8);
            ctx.restore();
          }
        }
      }

      // sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.06;
        s.life -= dt / 600;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = clamp(s.life, 0, 1);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      const rr = Math.min(r, w / 2, Math.max(h / 2, 0.001));
      c.beginPath();
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + h, rr);
      c.arcTo(x + w, y + h, x, y + h, rr);
      c.arcTo(x, y + h, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
      c.closePath();
    }

    raf = requestAnimationFrame(frame);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, [mode, shuffleKey]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Mode picker */}
      <div className="absolute top-3 left-0 right-0 flex flex-wrap justify-center gap-1.5 z-10 px-3">
        {(["Quick Sort", "Binary Search"] as HeroMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1 rounded-full text-[11px] font-mono transition-all hover:scale-105"
            style={{
              background: m === mode ? "oklch(0.72 0.19 255 / 22%)" : "oklch(1 0 0 / 5%)",
              color: m === mode ? "oklch(0.85 0.15 255)" : "oklch(0.55 0.04 255)",
              border: `1px solid ${m === mode ? "oklch(0.72 0.19 255 / 50%)" : "oklch(1 0 0 / 10%)"}`,
            }}
          >
            {m}
          </button>
        ))}
        <button
          onClick={() => setShuffleKey((k) => k + 1)}
          className="px-3 py-1 rounded-full text-[11px] font-mono transition-all hover:scale-105"
          style={{
            background: "oklch(0.75 0.18 162 / 14%)",
            color: "oklch(0.75 0.18 162)",
            border: "1px solid oklch(0.75 0.18 162 / 35%)",
          }}
        >
          ⤨ Restart
        </button>
      </div>
      {/* Binary Search HUD */}
      {mode === "Binary Search" && (
        <div className="absolute top-12 left-0 right-0 flex justify-center gap-3 pointer-events-none z-10">
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-mono"
            style={{
              background: "oklch(0.06 0.02 265 / 85%)",
              color: "#5a7cff",
              border: "1px solid #5a7cff40",
            }}
          >
            lo={bsInfo.lo}
          </span>
          {bsInfo.mid >= 0 && (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono"
              style={{
                background: "oklch(0.06 0.02 265 / 85%)",
                color: "#ffd34d",
                border: "1px solid #ffd34d40",
              }}
            >
              mid={bsInfo.mid} → val={bsInfo.mid + 1}
            </span>
          )}
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-mono"
            style={{
              background: "oklch(0.06 0.02 265 / 85%)",
              color: "#5a7cff",
              border: "1px solid #5a7cff40",
            }}
          >
            hi={bsInfo.hi}
          </span>
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-mono"
            style={{
              background: "oklch(0.06 0.02 265 / 85%)",
              color: "#3ddc97",
              border: "1px solid #3ddc9740",
            }}
          >
            target={bsInfo.target}
          </span>
          {bsInfo.found && (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono animate-pulse"
              style={{ background: "#3ddc9720", color: "#3ddc97", border: "1px solid #3ddc9740" }}
            >
              ✓ FOUND
            </span>
          )}
          {bsInfo.miss && (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono"
              style={{ background: "#ff6b5e20", color: "#ff6b5e", border: "1px solid #ff6b5e40" }}
            >
              ✗ NOT FOUND
            </span>
          )}
        </div>
      )}
      {mode !== "Binary Search" && (
        <div
          className="absolute top-12 left-0 right-0 text-center text-[10px] font-mono pointer-events-none z-10"
          style={{ color: "oklch(0.45 0.04 255)" }}
        >
          hover to inspect · click to restart
        </div>
      )}
      {/* Legend */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-4 pointer-events-none">
        {(mode === "Quick Sort"
          ? [
              { dot: "#ffd34d", label: "Compare" },
              { dot: "#ff6b5e", label: "Swap" },
              { dot: "#3ddc97", label: "Sorted" },
            ]
          : [
              { dot: "#5a7cff", label: "Range [lo..hi]" },
              { dot: "#ffd34d", label: "Probe mid" },
              { dot: "#3ddc97", label: "Found" },
            ]
        ).map(({ dot, label }) => (
          <span
            key={label}
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: "oklch(0.50 0.04 255)" }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
