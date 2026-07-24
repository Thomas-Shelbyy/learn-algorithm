import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, AnimatePresence, type Variants } from "framer-motion";
import { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { HeroViz2D } from "../components/HeroViz2D";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlgoViz — Interactive Algorithm Visualizer with C++ Source" },
      {
        name: "description",
        content:
          "Visualize 60+ classic algorithms with smooth animations and synced C++ STL source code — sorting, searching, graphs, DP, pathfinding and more.",
      },
      { property: "og:title", content: "AlgoViz — Interactive Algorithm Visualizer" },
      {
        property: "og:description",
        content:
          "Watch algorithms come to life with smooth animations and line-by-line C++ source.",
      },
    ],
  }),
  component: Index,
});

// ─── Hero (Quick Sort + Binary Search) is now a 2D component: HeroViz2D ──────

// ─── A* Search: Three.js grid visualization ──────────────────────────────────
const GRID_COLS = 14;
const GRID_ROWS = 10;
const CELL = 0.52;
const GRID_W = GRID_COLS * CELL;
const GRID_H = GRID_ROWS * CELL;

type AStarNodeState = "empty" | "wall" | "open" | "closed" | "path" | "start" | "end";

interface AStarNode {
  r: number;
  c: number;
  state: AStarNodeState;
  g: number;
  h: number;
  parent: AStarNode | null;
}

function heuristic(a: AStarNode, b: AStarNode) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function runAStar(grid: AStarNodeState[][], sr: number, sc: number, er: number, ec: number) {
  const nodes: AStarNode[][] = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => ({
      r,
      c,
      state: grid[r][c],
      g: Infinity,
      h: 0,
      parent: null,
    })),
  );
  const start = nodes[sr][sc];
  const end = nodes[er][ec];
  start.g = 0;
  start.h = heuristic(start, end);
  const open: AStarNode[] = [start];
  const visited: Set<string> = new Set();

  type AStepEvent =
    | { type: "open"; r: number; c: number }
    | { type: "close"; r: number; c: number }
    | { type: "path"; cells: [number, number][] }
    | { type: "fail" };
  const events: AStepEvent[] = [];

  while (open.length > 0) {
    open.sort((a, b) => a.g + a.h - (b.g + b.h));
    const cur = open.shift()!;
    const key = `${cur.r},${cur.c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (cur !== start && cur !== end) events.push({ type: "close", r: cur.r, c: cur.c });
    if (cur.r === er && cur.c === ec) {
      const path: [number, number][] = [];
      let n: AStarNode | null = cur;
      while (n) {
        path.unshift([n.r, n.c]);
        n = n.parent;
      }
      events.push({ type: "path", cells: path });
      return events;
    }
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr,
        nc = cur.c + dc;
      if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
      const nb = nodes[nr][nc];
      if (nb.state === "wall" || visited.has(`${nr},${nc}`)) continue;
      const ng = cur.g + 1;
      if (ng < nb.g) {
        nb.g = ng;
        nb.h = heuristic(nb, end);
        nb.parent = cur;
        open.push(nb);
        if (nb !== end) events.push({ type: "open", r: nr, c: nc });
      }
    }
  }
  events.push({ type: "fail" });
  return events;
}

function makeRandomGrid(): {
  grid: AStarNodeState[][];
  sr: number;
  sc: number;
  er: number;
  ec: number;
} {
  const grid: AStarNodeState[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill("empty"),
  );
  // scatter walls ~28%
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++) if (Math.random() < 0.28) grid[r][c] = "wall";
  const sr = Math.floor(Math.random() * GRID_ROWS),
    sc = 0;
  const er = Math.floor(Math.random() * GRID_ROWS),
    ec = GRID_COLS - 1;
  grid[sr][sc] = "start";
  grid[er][ec] = "end";
  // clear 3x3 around start/end
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const r1 = sr + dr,
        c1 = sc + dc;
      if (r1 >= 0 && r1 < GRID_ROWS && c1 >= 0 && c1 < GRID_COLS && grid[r1][c1] !== "start")
        grid[r1][c1] = "empty";
      const r2 = er + dr,
        c2 = ec + dc;
      if (r2 >= 0 && r2 < GRID_ROWS && c2 >= 0 && c2 < GRID_COLS && grid[r2][c2] !== "end")
        grid[r2][c2] = "empty";
    }
  return { grid, sr, sc, er, ec };
}

function AStarScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [restartKey, setRestartKey] = useState(0);
  const [hudText, setHudText] = useState("Searching…");

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    setHudText("Searching…");
    const W = el.clientWidth || 1,
      H = el.clientHeight || 1;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color("#05060d"), 12, 26);
    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 100);
    camera.position.set(0, 5.2, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 8, 5);
    scene.add(key);
    const rimA = new THREE.PointLight(new THREE.Color("#4da3ff"), 12, 20);
    rimA.position.set(-6, 3, -3);
    scene.add(rimA);
    const rimB = new THREE.PointLight(new THREE.Color("#3ddc97"), 8, 18);
    rimB.position.set(6, -1, 4);
    scene.add(rimB);

    const world = new THREE.Group();
    scene.add(world);

    const gridHelper = new THREE.GridHelper(
      Math.max(GRID_W, GRID_H) + 1,
      20,
      new THREE.Color("#1a2d50"),
      new THREE.Color("#0e1a30"),
    );
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    gridHelper.position.y = -0.26;
    world.add(gridHelper);

    // Particle backdrop
    const pCount = 160;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 18;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color("#6a97ff"),
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    world.add(new THREE.Points(pGeo, pMat));

    // Build grid
    const { grid, sr, sc, er, ec } = makeRandomGrid();
    const events = runAStar(grid, sr, sc, er, ec);

    const C_WALL = new THREE.Color("#0d1526");
    const C_EMPTY = new THREE.Color("#111d35");
    const C_START = new THREE.Color("#3ddc97");
    const C_END = new THREE.Color("#ff6b5e");
    const C_OPEN = new THREE.Color("#5a7cff");
    const C_CLOSED = new THREE.Color("#2a3d6b");
    const C_PATH = new THREE.Color("#ffd34d");

    interface Cell {
      mesh: THREE.Mesh;
      mat: THREE.MeshStandardMaterial;
      state: AStarNodeState;
      targetColor: THREE.Color;
      targetY: number;
      targetEmissive: number;
    }
    const cells: Cell[][] = [];
    const cellGeo = new THREE.BoxGeometry(CELL - 0.04, 0.18, CELL - 0.04);
    const wallGeo = new THREE.BoxGeometry(CELL - 0.04, 0.44, CELL - 0.04);

    const xOff = (-(GRID_COLS - 1) * CELL) / 2;
    const zOff = (-(GRID_ROWS - 1) * CELL) / 2;

    for (let r = 0; r < GRID_ROWS; r++) {
      cells[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const s = grid[r][c];
        const isWall = s === "wall";
        const mat = new THREE.MeshStandardMaterial({
          color: s === "wall" ? C_WALL : s === "start" ? C_START : s === "end" ? C_END : C_EMPTY,
          emissive: s === "start" ? C_START : s === "end" ? C_END : C_EMPTY,
          emissiveIntensity: s === "start" || s === "end" ? 0.6 : 0.05,
          roughness: 0.4,
          metalness: 0.5,
        });
        const geo = isWall ? wallGeo : cellGeo;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          xOff + c * CELL,
          isWall ? 0.12 : -0.1 + Math.random() * 0.02,
          zOff + r * CELL,
        );
        mesh.scale.set(1, isWall ? 1 : 0.6 + Math.random() * 0.2, 1);
        world.add(mesh);
        cells[r][c] = {
          mesh,
          mat,
          state: s,
          targetColor: mat.color.clone(),
          targetY: mesh.position.y,
          targetEmissive: mat.emissiveIntensity,
        };
      }
    }

    // Path/found markers — sphere for start, tetra for end
    const startSphGeo = new THREE.SphereGeometry(0.14, 12, 12);
    const startSphMat = new THREE.MeshStandardMaterial({
      color: C_START,
      emissive: C_START,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.4,
    });
    const startSph = new THREE.Mesh(startSphGeo, startSphMat);
    startSph.position.set(xOff + sc * CELL, 0.3, zOff + sr * CELL);
    world.add(startSph);

    const endTetraGeo = new THREE.OctahedronGeometry(0.15, 0);
    const endTetraMat = new THREE.MeshStandardMaterial({
      color: C_END,
      emissive: C_END,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.4,
    });
    const endTetra = new THREE.Mesh(endTetraGeo, endTetraMat);
    endTetra.position.set(xOff + ec * CELL, 0.3, zOff + er * CELL);
    world.add(endTetra);

    // Playback
    let frame = 0;
    let eventIdx = 0;
    const FRAMES_PER_EVENT = 3;
    let cooldown = 60;
    let done = false;
    let pathFound = false;

    let targetYaw = 0,
      targetPitch = 0.18;
    let dragging = false,
      moved = 0,
      lastX = 0,
      lastY = 0;
    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    const onPD = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    };
    const onPM = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lastX,
          dy = e.clientY - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        targetYaw += dx * 0.006;
        targetPitch = THREE.MathUtils.clamp(targetPitch + dy * 0.004, -0.1, 0.6);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const onPU = (e: PointerEvent) => {
      dragging = false;
      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {
        /**/
      }
    };
    dom.addEventListener("pointerdown", onPD);
    dom.addEventListener("pointermove", onPM);
    dom.addEventListener("pointerup", onPU);

    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      frame++;

      // apply events
      if (cooldown > 0) {
        cooldown--;
      } else if (!done && frame % FRAMES_PER_EVENT === 0 && eventIdx < events.length) {
        const ev = events[eventIdx++];
        if (ev.type === "open") {
          const cell = cells[ev.r][ev.c];
          cell.targetColor = C_OPEN.clone();
          cell.targetY = 0.06;
          cell.targetEmissive = 0.55;
          cell.state = "open";
        } else if (ev.type === "close") {
          const cell = cells[ev.r][ev.c];
          cell.targetColor = C_CLOSED.clone();
          cell.targetY = -0.04;
          cell.targetEmissive = 0.15;
          cell.state = "closed";
        } else if (ev.type === "path") {
          pathFound = true;
          for (const [pr, pc] of ev.cells) {
            const cell = cells[pr][pc];
            if (cell.state !== "start" && cell.state !== "end") {
              cell.targetColor = C_PATH.clone();
              cell.targetY = 0.18;
              cell.targetEmissive = 1.0;
            }
          }
          setHudText(`Path found · ${ev.cells.length} steps`);
          done = true;
        } else if (ev.type === "fail") {
          setHudText("No path found");
          done = true;
        }
        if (!done && eventIdx >= events.length) {
          done = true;
        }
      } else if (done && frame % 300 === 0) {
        // auto-restart after pause
        setRestartKey((k) => k + 1);
      }

      // smooth lerp all cells
      for (let r = 0; r < GRID_ROWS; r++)
        for (let c = 0; c < GRID_COLS; c++) {
          const cell = cells[r][c];
          cell.mat.color.lerp(cell.targetColor, 0.18);
          cell.mat.emissive.lerp(cell.targetColor, 0.18);
          cell.mat.emissiveIntensity += (cell.targetEmissive - cell.mat.emissiveIntensity) * 0.15;
          cell.mesh.position.y += (cell.targetY - cell.mesh.position.y) * 0.15;
        }

      // animate markers
      startSph.position.y = 0.3 + Math.sin(frame * 0.06) * 0.06;
      endTetra.rotation.y = frame * 0.04;
      endTetra.position.y = 0.3 + Math.sin(frame * 0.05 + 1) * 0.06;

      pMat.opacity = 0.35 + 0.1 * Math.sin(frame * 0.008);

      const idle = dragging ? 0 : Math.sin(frame * 0.003) * 0.05;
      world.rotation.y += (targetYaw + idle - world.rotation.y) * 0.06;
      world.rotation.x += (targetPitch - world.rotation.x) * 0.06;
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      const w = el.clientWidth || 1,
        h = el.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("pointerdown", onPD);
      dom.removeEventListener("pointermove", onPM);
      dom.removeEventListener("pointerup", onPU);
      cellGeo.dispose();
      wallGeo.dispose();
      startSphGeo.dispose();
      endTetraGeo.dispose();
      pGeo.dispose();
      pMat.dispose();
      startSphMat.dispose();
      endTetraMat.dispose();
      for (let r = 0; r < GRID_ROWS; r++)
        for (let c = 0; c < GRID_COLS; c++) cells[r][c].mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [restartKey]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6 }}
      className="space-y-4"
    >
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            A* Pathfinding — Live 3D
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            Watch A* explore the grid, then trace the optimal path.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-mono px-2 py-1 rounded-lg"
            style={{
              background: "oklch(0.72 0.19 255 / 10%)",
              color: "oklch(0.72 0.19 255)",
              border: "1px solid oklch(0.72 0.19 255 / 25%)",
            }}
          >
            {hudText}
          </span>
          <button
            onClick={() => setRestartKey((k) => k + 1)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
            style={{
              background: "oklch(0.75 0.18 162 / 16%)",
              color: "oklch(0.75 0.18 162)",
              border: "1px solid oklch(0.75 0.18 162 / 35%)",
            }}
          >
            ↺ New grid
          </button>
        </div>
      </header>
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          height: 340,
          background: "oklch(0.07 0.02 265)",
          border: "1px solid oklch(1 0 0 / 10%)",
        }}
      >
        <div ref={mountRef} className="absolute inset-0" style={{ cursor: "grab" }} />
        {/* Legend */}
        <div className="absolute bottom-3 left-0 right-0 flex flex-wrap justify-center gap-3 pointer-events-none">
          {[
            { dot: "#3ddc97", label: "Start ●" },
            { dot: "#ff6b5e", label: "End ◆" },
            { dot: "#5a7cff", label: "Open set" },
            { dot: "#2a3d6b", label: "Closed set" },
            { dot: "#ffd34d", label: "Path" },
            { dot: "#0d1526", label: "Wall" },
          ].map(({ dot, label }) => (
            <span
              key={label}
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color: "oklch(0.50 0.04 255)" }}
            >
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: dot }} />
              {label}
            </span>
          ))}
        </div>
        <div
          className="absolute top-3 right-3 text-[10px] font-mono pointer-events-none"
          style={{ color: "oklch(0.35 0.04 255)" }}
        >
          drag to rotate
        </div>
      </div>
      {/* A* info strip */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Heuristic", value: "Manhattan", color: "oklch(0.75 0.18 162)" },
          { label: "Complexity", value: "O(b^d)", color: "oklch(0.72 0.19 255)" },
          { label: "Optimal?", value: "Yes (admissible h)", color: "oklch(0.82 0.18 85)" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl px-3 py-2.5"
            style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
          >
            <div className="text-[10px] font-mono mb-0.5" style={{ color: "oklch(0.45 0.04 255)" }}>
              {item.label}
            </div>
            <div className="text-xs font-bold font-mono" style={{ color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

// ─── Static section 1: Algorithm DNA cards ───────────────────────────────────
const ALGO_DNA = [
  {
    name: "Sorting",
    icon: "⟨⟩",
    color: "#5a7cff",
    paradigm: "Comparison / Non-comparison",
    bestCase: "O(n)",
    worstCase: "O(n²) – O(n log n)",
    inPlace: true,
    stable: "Depends",
    keyIdea: "Rearrange elements into order by repeatedly comparing & moving.",
  },
  {
    name: "Binary Search",
    icon: "⌕",
    color: "#3ddc97",
    paradigm: "Divide & Conquer",
    bestCase: "O(1)",
    worstCase: "O(log n)",
    inPlace: true,
    stable: "N/A",
    keyIdea: "Halve the search space each step — requires sorted input.",
  },
  {
    name: "Graph BFS/DFS",
    icon: "⬡",
    color: "#ffd34d",
    paradigm: "Graph Traversal",
    bestCase: "O(V+E)",
    worstCase: "O(V+E)",
    inPlace: false,
    stable: "N/A",
    keyIdea: "Visit all reachable nodes via queue (BFS) or stack (DFS).",
  },
  {
    name: "Dijkstra",
    icon: "◈",
    color: "#ff6b5e",
    paradigm: "Greedy + Priority Queue",
    bestCase: "O(E log V)",
    worstCase: "O(E log V)",
    inPlace: false,
    stable: "N/A",
    keyIdea: "Always expand the cheapest unvisited node. No neg weights.",
  },
  {
    name: "A* Search",
    icon: "✦",
    color: "#c084fc",
    paradigm: "Heuristic Search",
    bestCase: "O(b^d)",
    worstCase: "O(b^d)",
    inPlace: false,
    stable: "N/A",
    keyIdea: "Dijkstra + admissible heuristic guides toward the goal.",
  },
  {
    name: "Dynamic Prog.",
    icon: "⊞",
    color: "#82e0aa",
    paradigm: "Memoization / Tabulation",
    bestCase: "Problem-specific",
    worstCase: "O(n·m)",
    inPlace: false,
    stable: "N/A",
    keyIdea: "Solve overlapping subproblems once; reuse stored answers.",
  },
];

function AlgoDNA() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55 }}
      className="space-y-4"
    >
      <header>
        <h2
          className="text-xl sm:text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          Algorithm DNA
        </h2>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
          Tap any card for the key idea behind each algorithm family.
        </p>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ALGO_DNA.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setActive(active === i ? null : i)}
            className="relative rounded-2xl p-4 cursor-pointer select-none overflow-hidden"
            style={{
              background: active === i ? `${a.color}12` : "oklch(0.10 0.02 265)",
              border: `1px solid ${active === i ? a.color + "50" : "oklch(1 0 0 / 8%)"}`,
              transition: "background 0.2s, border 0.2s",
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
              style={{
                background: active === i ? a.color : "transparent",
                transition: "background 0.2s",
              }}
            />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg" style={{ color: a.color }}>
                {a.icon}
              </span>
              <span className="text-xs font-semibold">{a.name}</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between gap-2">
                <span style={{ color: "oklch(0.45 0.04 255)" }}>best</span>
                <span style={{ color: "#3ddc97" }}>{a.bestCase}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: "oklch(0.45 0.04 255)" }}>worst</span>
                <span style={{ color: "#ff6b5e" }}>{a.worstCase}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: "oklch(0.45 0.04 255)" }}>paradigm</span>
                <span className="text-right" style={{ color: a.color }}>
                  {a.paradigm}
                </span>
              </div>
            </div>
            <AnimatePresence>
              {active === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-3 pt-3 text-[11px] leading-relaxed"
                    style={{ color: "oklch(0.70 0.04 255)", borderTop: `1px solid ${a.color}30` }}
                  >
                    {a.keyIdea}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

// ─── Big-O Playground (zoom by wheel, hover tooltips) ────────────────────────
type Complexity = { name: string; color: string; fn: (n: number) => number };
const COMPLEXITIES: Complexity[] = [
  { name: "O(1)", color: "oklch(0.75 0.18 162)", fn: () => 1 },
  { name: "O(log n)", color: "oklch(0.72 0.19 255)", fn: (n) => Math.log2(Math.max(1, n)) },
  { name: "O(n)", color: "oklch(0.82 0.18 85)", fn: (n) => n },
  { name: "O(n log n)", color: "oklch(0.75 0.18 310)", fn: (n) => n * Math.log2(Math.max(1, n)) },
  { name: "O(n²)", color: "oklch(0.68 0.22 22)", fn: (n) => n * n },
];

function BigOPlayground() {
  const [nMax, setNMax] = useState(60); // controls X range
  const [hover, setHover] = useState<{ x: number; y: number; n: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const W = 720,
    H = 280,
    PAD = 36;

  // wheel zoom — change nMax between 8..400
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setNMax((cur) => {
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      return Math.round(Math.min(400, Math.max(8, cur * factor)));
    });
  };

  // sample points
  const series = useMemo(() => {
    const N = 64;
    const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * nMax);
    return COMPLEXITIES.map((c) => {
      const ys = xs.map(c.fn);
      const maxY = Math.max(...ys, 1);
      return { ...c, xs, ys, maxY };
    });
  }, [nMax]);

  // shared Y normalizer (log compressed so curves are comparable)
  const globalMax = Math.max(...series.flatMap((s) => s.maxY));
  const norm = (y: number) => Math.log1p(y) / Math.log1p(globalMax);

  const pxX = (n: number) => PAD + (n / nMax) * (W - 2 * PAD);
  const pxY = (y: number) => H - PAD - norm(y) * (H - 2 * PAD);

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const n = Math.max(0, Math.min(nMax, ((xPx - PAD) / (W - 2 * PAD)) * nMax));
    setHover({ x: xPx, y: e.clientY - rect.top, n });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            Big-O Playground
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            Scroll on the chart to zoom · hover for exact values.
          </p>
        </div>
        <div
          className="text-xs font-mono px-3 py-1.5 rounded-full"
          style={{
            background: "oklch(1 0 0 / 5%)",
            border: "1px solid oklch(1 0 0 / 10%)",
            color: "oklch(0.7 0.04 255)",
          }}
        >
          n max ={" "}
          <span className="font-bold" style={{ color: "oklch(0.85 0.15 255)" }}>
            {nMax}
          </span>
        </div>
      </header>
      <div
        ref={wrapRef}
        onWheel={onWheel}
        className="relative rounded-2xl p-3 overflow-hidden"
        style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHover(null)}
          className="select-none cursor-crosshair"
        >
          {/* grid */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = PAD + ((H - 2 * PAD) * i) / 4;
            return (
              <line
                key={`gy${i}`}
                x1={PAD}
                x2={W - PAD}
                y1={y}
                y2={y}
                stroke="oklch(1 0 0 / 6%)"
                strokeDasharray="3 3"
              />
            );
          })}
          {Array.from({ length: 6 }, (_, i) => {
            const x = PAD + ((W - 2 * PAD) * i) / 5;
            return (
              <line
                key={`gx${i}`}
                x1={x}
                x2={x}
                y1={PAD}
                y2={H - PAD}
                stroke="oklch(1 0 0 / 6%)"
                strokeDasharray="3 3"
              />
            );
          })}
          {/* axes labels */}
          <text
            x={PAD}
            y={H - 10}
            fill="oklch(0.5 0.04 255)"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            0
          </text>
          <text
            x={W - PAD - 22}
            y={H - 10}
            fill="oklch(0.5 0.04 255)"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            {nMax}
          </text>
          <text
            x={6}
            y={PAD + 4}
            fill="oklch(0.5 0.04 255)"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            ops
          </text>
          <text
            x={W - 14}
            y={H - 22}
            fill="oklch(0.5 0.04 255)"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            n
          </text>
          {/* curves */}
          {series.map((s) => {
            const d = s.xs
              .map(
                (x, i) => `${i === 0 ? "M" : "L"}${pxX(x).toFixed(1)},${pxY(s.ys[i]).toFixed(1)}`,
              )
              .join(" ");
            return (
              <path
                key={s.name}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2.2"
                style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
              />
            );
          })}
          {/* hover crosshair */}
          {hover && (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={PAD}
                y2={H - PAD}
                stroke="oklch(1 0 0 / 25%)"
                strokeDasharray="2 2"
              />
              {series.map((s) => {
                const y = s.fn(hover.n);
                return (
                  <circle
                    key={s.name}
                    cx={hover.x}
                    cy={pxY(y)}
                    r="3.5"
                    fill={s.color}
                    stroke="white"
                    strokeWidth="0.8"
                  />
                );
              })}
            </>
          )}
        </svg>
        {/* tooltip */}
        <AnimatePresence>
          {hover && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none rounded-xl p-2.5 text-[11px] font-mono"
              style={{
                left: Math.min(hover.x + 12, (wrapRef.current?.clientWidth ?? W) - 180),
                top: Math.max(8, hover.y - 8),
                background: "oklch(0.06 0.02 265 / 95%)",
                border: "1px solid oklch(1 0 0 / 12%)",
                minWidth: 150,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              <div className="mb-1.5" style={{ color: "oklch(0.7 0.04 255)" }}>
                n ≈{" "}
                <span className="font-bold" style={{ color: "oklch(0.85 0.15 255)" }}>
                  {hover.n.toFixed(1)}
                </span>
              </div>
              {series.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-3">
                  <span style={{ color: s.color }}>{s.name}</span>
                  <span style={{ color: "oklch(0.85 0.01 255)" }}>
                    {(() => {
                      const v = s.fn(hover.n);
                      return v >= 10000 ? v.toExponential(1) : v.toFixed(2);
                    })()}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {/* legend */}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {COMPLEXITIES.map((c) => (
            <span
              key={c.name}
              className="flex items-center gap-1.5 text-[11px] font-mono"
              style={{ color: "oklch(0.7 0.04 255)" }}
            >
              <span className="w-2.5 h-0.5 rounded-full" style={{ background: c.color }} />
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

// ─── 5 new animated sections: Race, Spotlight, Complexity Table, Pseudocode Stepper, Timeline ─

// ─── Sort Race helpers ────────────────────────────────────────────────────────
type SortFrame = {
  arr: number[];
  cmp: [number, number] | null;
  swapped: [number, number] | null;
  done: boolean;
};

function recordBubble(input: number[]): SortFrame[] {
  const a = [...input];
  const frames: SortFrame[] = [];
  frames.push({ arr: [...a], cmp: null, swapped: null, done: false });
  let ops = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - 1 - i; j++) {
      ops++;
      frames.push({ arr: [...a], cmp: [j, j + 1], swapped: null, done: false });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        frames.push({ arr: [...a], cmp: null, swapped: [j, j + 1], done: false });
      }
    }
  }
  frames.push({ arr: [...a], cmp: null, swapped: null, done: true });
  return frames;
}

function recordInsertion(input: number[]): SortFrame[] {
  const a = [...input];
  const frames: SortFrame[] = [];
  frames.push({ arr: [...a], cmp: null, swapped: null, done: false });
  for (let i = 1; i < a.length; i++) {
    let j = i;
    while (j > 0) {
      frames.push({ arr: [...a], cmp: [j - 1, j], swapped: null, done: false });
      if (a[j - 1] > a[j]) {
        [a[j], a[j - 1]] = [a[j - 1], a[j]];
        frames.push({ arr: [...a], cmp: null, swapped: [j - 1, j], done: false });
        j--;
      } else break;
    }
  }
  frames.push({ arr: [...a], cmp: null, swapped: null, done: true });
  return frames;
}

function recordSelection(input: number[]): SortFrame[] {
  const a = [...input];
  const frames: SortFrame[] = [];
  frames.push({ arr: [...a], cmp: null, swapped: null, done: false });
  for (let i = 0; i < a.length; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) {
      frames.push({ arr: [...a], cmp: [m, j], swapped: null, done: false });
      if (a[j] < a[m]) m = j;
    }
    if (m !== i) {
      [a[i], a[m]] = [a[m], a[i]];
      frames.push({ arr: [...a], cmp: null, swapped: [i, m], done: false });
    }
  }
  frames.push({ arr: [...a], cmp: null, swapped: null, done: true });
  return frames;
}

function recordQuick(input: number[]): SortFrame[] {
  const a = [...input];
  const frames: SortFrame[] = [];
  frames.push({ arr: [...a], cmp: null, swapped: null, done: false });
  const qs = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const p = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      frames.push({ arr: [...a], cmp: [j, hi], swapped: null, done: false });
      if (a[j] <= p) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          frames.push({ arr: [...a], cmp: null, swapped: [i, j], done: false });
        }
      }
    }
    if (i + 1 !== hi) {
      [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
      frames.push({ arr: [...a], cmp: null, swapped: [i + 1, hi], done: false });
    }
    qs(lo, i);
    qs(i + 2, hi);
  };
  qs(0, a.length - 1);
  frames.push({ arr: [...a], cmp: null, swapped: null, done: true });
  return frames;
}

function recordMerge(input: number[]): SortFrame[] {
  const a = [...input];
  const frames: SortFrame[] = [];
  frames.push({ arr: [...a], cmp: null, swapped: null, done: false });
  const ms = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid2 = (lo + hi) >> 1;
    ms(lo, mid2);
    ms(mid2 + 1, hi);
    const tmp: number[] = [];
    let l = lo,
      r = mid2 + 1;
    while (l <= mid2 && r <= hi) {
      frames.push({ arr: [...a], cmp: [l, r], swapped: null, done: false });
      if (a[l] <= a[r]) tmp.push(a[l++]);
      else tmp.push(a[r++]);
    }
    while (l <= mid2) tmp.push(a[l++]);
    while (r <= hi) tmp.push(a[r++]);
    for (let k = 0; k < tmp.length; k++) {
      a[lo + k] = tmp[k];
    }
    frames.push({ arr: [...a], cmp: null, swapped: [lo, hi], done: false });
  };
  ms(0, a.length - 1);
  frames.push({ arr: [...a], cmp: null, swapped: null, done: true });
  return frames;
}

const ALGO_META = [
  {
    name: "Bubble",
    color: "#5a7cff",
    glow: "#5a7cff40",
    complexity: "O(n²)",
    record: recordBubble,
  },
  {
    name: "Insertion",
    color: "#ffd34d",
    glow: "#ffd34d40",
    complexity: "O(n²)",
    record: recordInsertion,
  },
  {
    name: "Selection",
    color: "#ff6b5e",
    glow: "#ff6b5e40",
    complexity: "O(n²)",
    record: recordSelection,
  },
  {
    name: "Quick",
    color: "#3ddc97",
    glow: "#3ddc9740",
    complexity: "O(n log n)",
    record: recordQuick,
  },
  {
    name: "Merge",
    color: "#c084fc",
    glow: "#c084fc40",
    complexity: "O(n log n)",
    record: recordMerge,
  },
] as const;

const RACE_N = 18;

function AlgoVizBar({
  frames,
  frameIdx,
  color,
  name,
  complexity,
}: {
  frames: SortFrame[];
  frameIdx: number;
  color: string;
  name: string;
  complexity: string;
}) {
  const f = frames[Math.min(frameIdx, frames.length - 1)];
  const arr = f.arr;
  const maxVal = Math.max(...arr);
  const pct = Math.round((Math.min(frameIdx, frames.length - 1) / (frames.length - 1)) * 100);
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "oklch(0.09 0.02 265)", border: `1px solid ${color}30` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold" style={{ color }}>
            {name}
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: `${color}18`, color }}
          >
            {complexity}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {f.done && (
            <span className="text-[10px] font-mono" style={{ color: "#3ddc97" }}>
              ✓ done
            </span>
          )}
          <span className="text-[10px] font-mono" style={{ color: "oklch(0.45 0.04 255)" }}>
            {pct}%
          </span>
        </div>
      </div>
      {/* Bar visualization */}
      <div className="flex items-end gap-0.5 h-16">
        {arr.map((v, i) => {
          const isCmp = f.cmp && (f.cmp[0] === i || f.cmp[1] === i);
          const isSwp = f.swapped && (f.swapped[0] === i || f.swapped[1] === i);
          const barColor = f.done ? "#3ddc97" : isSwp ? "#ff6b5e" : isCmp ? "#ffd34d" : color;
          const h = Math.max(4, (v / maxVal) * 60);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}px`,
                background: barColor,
                borderRadius: "2px 2px 0 0",
                transition: "height 0.12s ease, background 0.1s",
                boxShadow: isCmp || isSwp ? `0 0 6px ${barColor}` : undefined,
              }}
            />
          );
        })}
      </div>
      {/* Progress track */}
      <div
        className="mt-2 h-1 rounded-full overflow-hidden"
        style={{ background: "oklch(1 0 0 / 8%)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, width: `${pct}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </div>
  );
}

// 1) Live Sort Race
function SortRace() {
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);
  const [speed, setSpeed] = useState(60); // ms per frame
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { allFrames, maxFrames } = useMemo(() => {
    const s = Array.from({ length: RACE_N }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    const af = ALGO_META.map((m) => m.record(s));
    return { allFrames: af, maxFrames: Math.max(...af.map((f) => f.length)) };
  }, [tick]);

  // auto-advance
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setFrameIdx((f) => {
        if (f >= maxFrames - 1) {
          setRunning(false);
          return maxFrames - 1;
        }
        return f + 1;
      });
    }, speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, speed, maxFrames]);

  const reset = () => {
    setRunning(false);
    setFrameIdx(0);
    setTick((t) => t + 1);
  };
  const toggle = () => {
    if (frameIdx >= maxFrames - 1) {
      setFrameIdx(0);
      setRunning(true);
    } else setRunning((r) => !r);
  };

  // winner = algo that finished first (fewest frames)
  const frameCounts = allFrames.map((f) => f.length);
  const winnerIdx = frameCounts.indexOf(Math.min(...frameCounts));

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      className="space-y-4"
    >
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            Live Sort Race
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            5 algorithms, same array — watch them race step-by-step.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Speed */}
          <div
            className="flex items-center gap-1.5 text-[11px] font-mono"
            style={{ color: "oklch(0.55 0.04 255)" }}
          >
            <span>slow</span>
            <input
              type="range"
              min={20}
              max={200}
              step={10}
              value={200 - speed + 20}
              onChange={(e) => setSpeed(200 - Number(e.target.value) + 20)}
              className="w-16 accent-blue-400"
            />
            <span>fast</span>
          </div>
          <button
            onClick={toggle}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
            style={{
              background: running ? "oklch(0.68 0.22 22 / 20%)" : "oklch(0.75 0.18 162 / 20%)",
              color: running ? "oklch(0.82 0.22 22)" : "oklch(0.75 0.18 162)",
              border: `1px solid ${running ? "oklch(0.68 0.22 22 / 35%)" : "oklch(0.75 0.18 162 / 35%)"}`,
            }}
          >
            {running ? "⏸ Pause" : frameIdx >= maxFrames - 1 ? "↺ Replay" : "▶ Play"}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
            style={{
              background: "oklch(0.72 0.19 255 / 14%)",
              color: "oklch(0.72 0.19 255)",
              border: "1px solid oklch(0.72 0.19 255 / 30%)",
            }}
          >
            ⟳ New array
          </button>
        </div>
      </header>

      {/* Winner badge */}
      <AnimatePresence>
        {frameIdx >= maxFrames - 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: `${ALGO_META[winnerIdx].color}14`,
              border: `1px solid ${ALGO_META[winnerIdx].color}40`,
            }}
          >
            <span className="text-lg">🏆</span>
            <div>
              <span className="text-sm font-bold" style={{ color: ALGO_META[winnerIdx].color }}>
                {ALGO_META[winnerIdx].name} Sort
              </span>
              <span className="text-xs ml-2" style={{ color: "oklch(0.6 0.04 255)" }}>
                finished in fewest steps · {ALGO_META[winnerIdx].complexity}
              </span>
            </div>
            <div className="ml-auto flex gap-3 text-[11px] font-mono">
              {ALGO_META.map((m, i) => (
                <span key={m.name} style={{ color: m.color }}>
                  {m.name}: {allFrames[i].length - 1} steps
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global scrubber */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono" style={{ color: "oklch(0.45 0.04 255)" }}>
          step {frameIdx}/{maxFrames - 1}
        </span>
        <input
          type="range"
          min={0}
          max={maxFrames - 1}
          value={frameIdx}
          onChange={(e) => {
            setRunning(false);
            setFrameIdx(Number(e.target.value));
          }}
          className="flex-1 accent-blue-400"
        />
      </div>

      {/* 2D Visualizations grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALGO_META.map((m, i) => (
          <AlgoVizBar
            key={m.name}
            frames={allFrames[i]}
            frameIdx={frameIdx}
            color={m.color}
            name={m.name}
            complexity={m.complexity}
          />
        ))}
        {/* Time complexity comparison chart */}
        <div
          className="rounded-xl p-3 sm:col-span-2 lg:col-span-1"
          style={{ background: "oklch(0.09 0.02 265)", border: "1px solid oklch(1 0 0 / 10%)" }}
        >
          <div className="text-[11px] font-mono mb-2" style={{ color: "oklch(0.55 0.04 255)" }}>
            Steps comparison
          </div>
          <div className="space-y-2">
            {ALGO_META.map((m, i) => {
              const total = allFrames[i].length - 1;
              const maxTotal = Math.max(...allFrames.map((f) => f.length - 1));
              const prog = Math.min(frameIdx, allFrames[i].length - 1) / (allFrames[i].length - 1);
              return (
                <div key={m.name}>
                  <div className="flex justify-between text-[10px] font-mono mb-0.5">
                    <span style={{ color: m.color }}>{m.name}</span>
                    <span style={{ color: "oklch(0.45 0.04 255)" }}>{total} steps</span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden relative"
                    style={{ background: "oklch(1 0 0 / 8%)" }}
                  >
                    {/* total bar faint */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(total / maxTotal) * 100}%`,
                        background: `${m.color}20`,
                        borderRadius: 4,
                      }}
                    />
                    {/* current progress */}
                    <motion.div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        background: m.color,
                        borderRadius: 4,
                        width: `${(total / maxTotal) * 100 * prog}%`,
                        boxShadow: `0 0 6px ${m.color}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

// 2) Algorithm Spotlight (auto-rotating)
const spotlight = [
  {
    name: "Dijkstra",
    color: "oklch(0.75 0.18 310)",
    use: "Shortest path on positively-weighted graphs · GPS, routers",
  },
  {
    name: "A* Search",
    color: "oklch(0.82 0.18 85)",
    use: "Heuristic shortest path · pathfinding in games",
  },
  {
    name: "Quick Sort",
    color: "oklch(0.72 0.19 255)",
    use: "Divide-and-conquer · in-place general-purpose sort",
  },
  { name: "Binary Search", color: "oklch(0.75 0.18 162)", use: "O(log n) lookup in sorted arrays" },
  {
    name: "Bellman-Ford",
    color: "oklch(0.68 0.22 22)",
    use: "Shortest path · handles negative edges, detects cycles",
  },
  {
    name: "Floyd-Warshall",
    color: "oklch(0.72 0.22 180)",
    use: "All-pairs shortest paths via DP · O(n³)",
  },
  {
    name: "Kruskal MST",
    color: "oklch(0.82 0.22 60)",
    use: "Minimum spanning tree using union-find",
  },
];
function Spotlight() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % spotlight.length), 3200);
    return () => clearInterval(id);
  }, []);
  const item = spotlight[i];
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="space-y-4"
    >
      <header>
        <h2
          className="text-xl sm:text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          Algorithm Spotlight
        </h2>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
          Auto-rotating — one classic algorithm at a time.
        </p>
      </header>
      <div
        className="rounded-2xl p-6 relative overflow-hidden h-44 flex items-center"
        style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-25"
          style={{ background: item.color }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <div className="font-mono text-xs mb-1" style={{ color: item.color }}>
              SPOTLIGHT · {String(i + 1).padStart(2, "0")}/{spotlight.length}
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{item.name}</h3>
            <p className="text-sm mt-1" style={{ color: "oklch(0.7 0.04 255)" }}>
              {item.use}
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {spotlight.map((_, k) => (
            <span
              key={k}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: k === i ? item.color : "oklch(1 0 0 / 15%)",
                width: k === i ? 16 : 6,
              }}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

// 3) Complexity comparison table (animated rows)
const COMPLEXITY_TABLE = [
  { name: "Bubble Sort", best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)" },
  { name: "Quick Sort", best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)", space: "O(log n)" },
  { name: "Merge Sort", best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(n)" },
  { name: "Heap Sort", best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(1)" },
  { name: "Binary Search", best: "O(1)", avg: "O(log n)", worst: "O(log n)", space: "O(1)" },
  { name: "BFS / DFS", best: "O(V+E)", avg: "O(V+E)", worst: "O(V+E)", space: "O(V)" },
  { name: "Dijkstra", best: "O(E log V)", avg: "O(E log V)", worst: "O(E log V)", space: "O(V)" },
  { name: "Bellman-Ford", best: "O(VE)", avg: "O(VE)", worst: "O(VE)", space: "O(V)" },
  { name: "Floyd-Warshall", best: "O(V³)", avg: "O(V³)", worst: "O(V³)", space: "O(V²)" },
];
function ComplexityTable() {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      className="space-y-4"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
    >
      <motion.header variants={fadeUp}>
        <h2
          className="text-xl sm:text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          Complexity at a glance
        </h2>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
          How the algorithms stack up.
        </p>
      </motion.header>
      <div
        className="overflow-x-auto rounded-2xl"
        style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <table className="w-full text-xs sm:text-sm">
          <thead style={{ background: "oklch(1 0 0 / 4%)" }}>
            <tr className="text-left" style={{ color: "oklch(0.65 0.04 255)" }}>
              <th className="p-3 font-semibold">Algorithm</th>
              <th className="p-3 font-mono">Best</th>
              <th className="p-3 font-mono">Average</th>
              <th className="p-3 font-mono">Worst</th>
              <th className="p-3 font-mono">Space</th>
            </tr>
          </thead>
          <tbody>
            {COMPLEXITY_TABLE.map((row) => (
              <motion.tr
                key={row.name}
                variants={fadeUp}
                whileHover={{ background: "oklch(0.72 0.19 255 / 8%)" }}
                className="border-t"
                style={{ borderColor: "oklch(1 0 0 / 6%)" }}
              >
                <td className="p-3 font-semibold">{row.name}</td>
                <td className="p-3 font-mono" style={{ color: "oklch(0.75 0.18 162)" }}>
                  {row.best}
                </td>
                <td className="p-3 font-mono" style={{ color: "oklch(0.82 0.18 85)" }}>
                  {row.avg}
                </td>
                <td className="p-3 font-mono" style={{ color: "oklch(0.68 0.22 22)" }}>
                  {row.worst}
                </td>
                <td className="p-3 font-mono" style={{ color: "oklch(0.7 0.04 255)" }}>
                  {row.space}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

// 4) Animated pseudocode stepper
const PSEUDO_STEPS = [
  { line: "function quickSort(a, lo, hi):", note: "Entry point" },
  { line: "  if lo >= hi: return", note: "Base case" },
  { line: "  pivot = a[hi]", note: "Choose last as pivot" },
  { line: "  i = lo - 1", note: "Boundary index" },
  { line: "  for j = lo to hi - 1:", note: "Scan range" },
  { line: "    if a[j] <= pivot: swap(a[++i], a[j])", note: "Partition" },
  { line: "  swap(a[i+1], a[hi])", note: "Place pivot" },
  { line: "  quickSort(a, lo, i);  quickSort(a, i+2, hi)", note: "Recurse" },
];
function PseudoStepper() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % PSEUDO_STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      className="space-y-4"
    >
      <header>
        <h2
          className="text-xl sm:text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          Pseudocode in motion
        </h2>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
          Watch Quick Sort step through its own code.
        </p>
      </header>
      <div
        className="rounded-2xl p-4 sm:p-6"
        style={{ background: "oklch(0.07 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <pre className="text-xs sm:text-sm font-mono leading-7 whitespace-pre-wrap">
          {PSEUDO_STEPS.map((s, k) => (
            <motion.div
              key={k}
              animate={{
                color: k === i ? "oklch(0.95 0.01 255)" : "oklch(0.5 0.04 255)",
                background: k === i ? "oklch(0.72 0.19 255 / 12%)" : "transparent",
                x: k === i ? 4 : 0,
              }}
              transition={{ duration: 0.25 }}
              className="px-2 rounded-md flex items-center justify-between gap-4"
            >
              <span>{s.line}</span>
              {k === i && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: "oklch(0.75 0.18 162)" }}
                >
                  ◀ {s.note}
                </motion.span>
              )}
            </motion.div>
          ))}
        </pre>
      </div>
    </motion.section>
  );
}

// 5) Algorithm timeline (history)
const TIMELINE = [
  { year: "1945", who: "von Neumann", what: "Merge Sort" },
  { year: "1956", who: "Kruskal", what: "Minimum spanning tree" },
  { year: "1959", who: "Dijkstra", what: "Shortest path algorithm" },
  { year: "1960", who: "Hoare", what: "Quick Sort" },
  { year: "1962", who: "Floyd", what: "Floyd-Warshall" },
  { year: "1968", who: "Hart/Nilsson/Raphael", what: "A* Search" },
  { year: "1977", who: "Knuth/Morris/Pratt", what: "KMP string search" },
];
function Timeline() {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      className="space-y-4"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.header variants={fadeUp}>
        <h2
          className="text-xl sm:text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          A short history
        </h2>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
          The minds behind the algorithms you're learning.
        </p>
      </motion.header>
      <div className="relative pl-6">
        <div
          className="absolute left-2 top-2 bottom-2 w-px"
          style={{
            background:
              "linear-gradient(180deg, transparent, oklch(0.72 0.19 255 / 50%), transparent)",
          }}
        />
        <div className="space-y-3">
          {TIMELINE.map((t) => (
            <motion.div
              key={t.year}
              variants={fadeUp}
              whileHover={{ x: 4 }}
              className="relative rounded-xl p-3 pl-4"
              style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <span
                className="absolute -left-4.75 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{
                  background: "oklch(0.72 0.19 255)",
                  boxShadow: "0 0 12px oklch(0.72 0.19 255 / 60%)",
                }}
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: "oklch(0.85 0.15 255)" }}
                >
                  {t.year}
                </span>
                <span className="text-sm font-semibold">{t.what}</span>
                <span className="text-xs" style={{ color: "oklch(0.55 0.04 255)" }}>
                  — {t.who}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

// ─── Interactive stats with count-up + hover detail ─────────────────────────
function useCountUp(target: number, durationMs = 1400, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return value;
}

function StatCard({ s, inView }: { s: (typeof stats)[number]; inView: boolean }) {
  const count = useCountUp(s.numeric ?? 0, 1400, inView);
  const display = s.numeric != null ? `${count}${s.suffix ?? ""}` : s.value;
  return (
    <motion.div
      variants={popIn}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="relative group flex flex-col items-center text-center py-5 px-3 cursor-default overflow-hidden"
      style={{ background: "oklch(0.10 0.02 265)" }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${s.accent}22, transparent 65%)`,
        }}
      />
      <motion.span
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="text-base mb-1"
        style={{ color: s.accent, filter: `drop-shadow(0 0 6px ${s.accent}55)` }}
      >
        {s.icon}
      </motion.span>
      <span
        className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums"
        style={{ color: s.accent, letterSpacing: "-0.03em" }}
      >
        {display}
      </span>
      <span
        className="text-[11px] uppercase tracking-widest mt-1 font-medium"
        style={{ color: "oklch(0.65 0.04 255)" }}
      >
        {s.label}
      </span>
      <motion.span
        initial={{ opacity: 0, height: 0 }}
        whileHover={{ opacity: 1 }}
        className="text-[10.5px] mt-2 leading-snug max-w-[180px]"
        style={{ color: "oklch(0.55 0.04 255)" }}
      >
        {s.detail}
      </motion.span>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
        style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }}
      />
    </motion.div>
  );
}

function InteractiveStats() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { threshold: 0.3 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <motion.div
      ref={ref}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden relative"
      style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 8%)" }}
    >
      {stats.map((s) => (
        <StatCard key={s.label} s={s} inView={inView} />
      ))}
    </motion.div>
  );
}

// ─── Did You Know — rotating algorithm facts ────────────────────────────────
const FACTS: { tag: string; title: string; body: string; accent: string }[] = [
  {
    tag: "Speed",
    title: "Binary search beats linear search by 1,000,000×",
    body: "On a sorted list of 1B items, linear search takes ~1B steps. Binary search takes ~30. That's the power of O(log n).",
    accent: "oklch(0.72 0.19 255)",
  },
  {
    tag: "Origin",
    title: "Dijkstra invented his algorithm in 20 minutes",
    body: "In 1956, while shopping with his fiancée in Amsterdam, Edsger Dijkstra designed shortest paths over coffee. He published it 3 years later.",
    accent: "oklch(0.75 0.18 162)",
  },
  {
    tag: "Recursion",
    title: "Tower of Hanoi with 64 disks takes 585 billion years",
    body: "At 1 move per second, the legendary 64-disk puzzle requires 2⁶⁴−1 moves — longer than the age of the universe.",
    accent: "oklch(0.82 0.18 85)",
  },
  {
    tag: "DP",
    title: "Memoization can turn O(2ⁿ) into O(n)",
    body: "Naive Fibonacci is exponential. Cache results once and the same algorithm becomes linear — same logic, just remembered.",
    accent: "oklch(0.75 0.18 310)",
  },
  {
    tag: "Strings",
    title: "KMP never moves backward in the text",
    body: "Knuth–Morris–Pratt achieves O(n+m) substring search by precomputing a failure table — the text pointer only ever advances.",
    accent: "oklch(0.68 0.22 22)",
  },
  {
    tag: "Sorting",
    title: "Quicksort's worst case is its best case in disguise",
    body: "Quicksort averages O(n log n) but degrades to O(n²) on sorted input — until you pick a random pivot. Randomness fixes it.",
    accent: "oklch(0.72 0.22 180)",
  },
];

function DidYouKnow() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((p) => (p + 1) % FACTS.length), 5000);
    return () => clearInterval(id);
  }, [paused]);
  const fact = FACTS[i];
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="space-y-4"
    >
      <header>
        <h2
          className="text-xl sm:text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          Did you know?
        </h2>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
          Six surprising facts about the algorithms you use every day.
        </p>
      </header>
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="relative rounded-2xl p-6 sm:p-8 overflow-hidden min-h-[210px]"
        style={{
          background: "linear-gradient(135deg, oklch(0.11 0.03 265), oklch(0.09 0.02 265))",
          border: "1px solid oklch(1 0 0 / 10%)",
        }}
      >
        <motion.div
          key={`bg-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1.2 }}
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: fact.accent }}
        />
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-15 pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${fact.accent}, transparent 60%)`,
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
          >
            <span
              className="inline-block text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
              style={{
                background: `${fact.accent}1f`,
                color: fact.accent,
                border: `1px solid ${fact.accent}44`,
              }}
            >
              {fact.tag}
            </span>
            <h3
              className="text-lg sm:text-2xl font-bold tracking-tight mb-2"
              style={{ color: "oklch(0.95 0.01 255)", letterSpacing: "-0.02em" }}
            >
              {fact.title}
            </h3>
            <p
              className="text-sm sm:text-[15px] leading-relaxed max-w-2xl"
              style={{ color: "oklch(0.68 0.03 255)" }}
            >
              {fact.body}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="relative z-10 mt-5 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {FACTS.map((f, idx) => (
              <button
                key={f.title}
                aria-label={`Show fact ${idx + 1}`}
                onClick={() => setI(idx)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: idx === i ? 28 : 10,
                  background: idx === i ? f.accent : "oklch(1 0 0 / 18%)",
                  boxShadow: idx === i ? `0 0 8px ${f.accent}88` : "none",
                }}
              />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setI((p) => (p - 1 + FACTS.length) % FACTS.length)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{
                background: "oklch(1 0 0 / 6%)",
                color: "oklch(0.80 0.02 255)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              ‹
            </motion.button>
            <span
              className="text-[11px] font-mono tabular-nums"
              style={{ color: "oklch(0.50 0.04 255)" }}
            >
              {String(i + 1).padStart(2, "0")} / {String(FACTS.length).padStart(2, "0")}
            </span>
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setI((p) => (p + 1) % FACTS.length)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{
                background: "oklch(1 0 0 / 6%)",
                color: "oklch(0.80 0.02 255)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              ›
            </motion.button>
          </div>
        </div>

        {/* Auto-progress bar */}
        <motion.div
          key={`bar-${i}-${paused ? "p" : "r"}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: paused ? 0 : 1 }}
          transition={{ duration: paused ? 0 : 5, ease: "linear" }}
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
          style={{ background: `linear-gradient(90deg, ${fact.accent}, transparent)` }}
        />
      </div>
    </motion.section>
  );
}



// ─── Original data ─────────────────────────────────────────────────────────
const cards = [
  {
    to: "/cpprunner",
    title: "C++ Runner",
    desc: "Step through C++ line by line — arithmetic, if/else, loops — with live variables & output",
    icon: "{}",
    accent: "oklch(0.72 0.19 255)",
    glow: "oklch(0.72 0.19 255 / 15%)",
    tag: "interactive",
  },
  {
    to: "/gametheory",
    title: "Game Theory",
    desc: "Nash equilibrium, minimax, prisoner's dilemma, fictitious play & more",
    icon: "♟",
    accent: "oklch(0.72 0.19 255)",
    glow: "oklch(0.72 0.19 255 / 15%)",
    tag: "6 algorithms",
  },
  {
    to: "/sorting",
    title: "Sorting",
    desc: "Bubble, Selection, Insertion, Merge, Quick, Heap and 7 more",
    icon: "⟨⟩",
    accent: "oklch(0.72 0.19 255)",
    glow: "oklch(0.72 0.19 255 / 15%)",
    tag: "13 algorithms",
  },
  {
    to: "/searching",
    title: "Searching",
    desc: "Linear, Binary, Jump, Exponential, Ternary, Interpolation",
    icon: "⌕",
    accent: "oklch(0.75 0.18 162)",
    glow: "oklch(0.75 0.18 162 / 15%)",
    tag: "6 algorithms",
  },
  {
    to: "/tree",
    title: "Tree Traversals",
    desc: "BFS, DFS — In / Pre / Post order",
    icon: "⋔",
    accent: "oklch(0.82 0.18 85)",
    glow: "oklch(0.82 0.18 85 / 15%)",
    tag: "4 algorithms",
  },
  {
    to: "/pathfinding",
    title: "Pathfinding",
    desc: "BFS, Dijkstra, and A* on editable grids",
    icon: "◈",
    accent: "oklch(0.68 0.22 22)",
    glow: "oklch(0.68 0.22 22 / 15%)",
    tag: "3 algorithms",
  },
  {
    to: "/graph",
    title: "Graph Algorithms",
    desc: "DFS, BFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Prim, Kruskal",
    icon: "⬡",
    accent: "oklch(0.75 0.18 310)",
    glow: "oklch(0.75 0.18 310 / 15%)",
    tag: "9 algorithms",
  },
  {
    to: "/dp",
    title: "Dynamic Programming",
    desc: "Fibonacci, LCS, Knapsack, Edit Distance, Coin Change, LIS",
    icon: "⊞",
    accent: "oklch(0.72 0.22 180)",
    glow: "oklch(0.72 0.22 180 / 15%)",
    tag: "6 algorithms",
  },
  {
    to: "/strings",
    title: "String Algorithms",
    desc: "Naive, KMP, Rabin-Karp, Z-Algorithm, Boyer-Moore, Manacher",
    icon: "Σ",
    accent: "oklch(0.82 0.22 60)",
    glow: "oklch(0.82 0.22 60 / 15%)",
    tag: "6 algorithms",
  },
  {
    to: "/nqueens",
    title: "N-Queens",
    desc: "Classic backtracking solver on an interactive board",
    icon: "♛",
    accent: "oklch(0.82 0.18 85)",
    glow: "oklch(0.82 0.18 85 / 15%)",
    tag: "Backtracking",
  },
  {
    to: "/knights",
    title: "Knight's Tour",
    desc: "Warnsdorff's heuristic visits every chessboard square",
    icon: "♞",
    accent: "oklch(0.72 0.22 180)",
    glow: "oklch(0.72 0.22 180 / 15%)",
    tag: "Chess",
  },
  {
    to: "/hanoi",
    title: "Tower of Hanoi",
    desc: "Recursive disk moves with an animated 3-peg solution",
    icon: "⌬",
    accent: "oklch(0.75 0.18 310)",
    glow: "oklch(0.75 0.18 310 / 15%)",
    tag: "Recursion",
  },
] as const;

const stats: {
  value: string;
  label: string;
  detail: string;
  numeric?: number;
  suffix?: string;
  icon: string;
  accent: string;
}[] = [
  {
    value: "60+",
    numeric: 60,
    suffix: "+",
    label: "Algorithms",
    detail: "From bubble sort to A* — every classic, step-by-step.",
    icon: "◇",
    accent: "oklch(0.72 0.19 255)",
  },
  {
    value: "10",
    numeric: 10,
    label: "Categories",
    detail: "Sorting, Searching, Graphs, DP, Strings, Trees & more.",
    icon: "⬡",
    accent: "oklch(0.75 0.18 162)",
  },
  {
    value: "60fps",
    numeric: 60,
    suffix: "fps",
    label: "Animations",
    detail: "Buttery smooth playback powered by Framer Motion.",
    icon: "◉",
    accent: "oklch(0.82 0.18 85)",
  },
  {
    value: "⌘",
    label: "C++ Code",
    detail: "Idiomatic C++ STL paired with synced line highlights.",
    icon: "⌘",
    accent: "oklch(0.75 0.18 310)",
  },
];

const features = [
  {
    icon: "▶",
    title: "Step-by-step playback",
    desc: "Play, pause, step forward or back. Adjust speed at any time to slow down the tricky parts.",
  },
  {
    icon: "⌘",
    title: "Live C++ STL code",
    desc: "Each visualization is paired with clean, well-commented C++ using STL you can read, copy, or download.",
  },
  {
    icon: "✦",
    title: "Synced line highlighting",
    desc: "As the visualization runs, the matching line in the C++ source lights up so the algorithm makes sense.",
  },
  {
    icon: "⌗",
    title: "Custom inputs",
    desc: "Type your own arrays, draw obstacles on pathfinding grids, and pick from sample graphs.",
  },
  {
    icon: "⏱",
    title: "Complexity badges",
    desc: "Time and space complexity are shown next to every algorithm so trade-offs are obvious.",
  },
  {
    icon: "📱",
    title: "Fully responsive",
    desc: "Looks and feels great on phone, tablet, laptop, monitor — code panel adapts to your screen.",
  },
];

const howSteps = [
  {
    n: "01",
    title: "Pick a category",
    desc: "Choose Sorting, Searching, Graphs, DP and more from the sidebar.",
  },
  {
    n: "02",
    title: "Pick an algorithm",
    desc: "Each category ships with multiple classic algorithms to compare side-by-side.",
  },
  {
    n: "03",
    title: "Press play",
    desc: "Watch it run. Step backwards, adjust speed, or jump frame-by-frame.",
  },
  {
    n: "04",
    title: "Read the code",
    desc: "The C++ panel highlights the line that is currently executing.",
  },
];

const topics = [
  "Quick Sort",
  "Merge Sort",
  "Heap Sort",
  "Radix Sort",
  "Counting Sort",
  "Binary Search",
  "Jump Search",
  "Interpolation Search",
  "BFS",
  "DFS",
  "Dijkstra",
  "A*",
  "Bellman-Ford",
  "Floyd-Warshall",
  "Prim MST",
  "Kruskal MST",
  "KMP",
  "Rabin-Karp",
  "Z-Algorithm",
  "Boyer-Moore",
  "Manacher",
  "Sieve",
  "GCD",
  "Fast Power",
  "Fenwick Tree",
  "Segment Tree",
  "Fibonacci DP",
  "Knapsack",
  "LCS",
  "Edit Distance",
  "Coin Change",
  "LIS",
  "Matrix Chain",
  "Rod Cutting",
];

// ─── Motion variants ──────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};
const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 18 },
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────
function Index() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  return (
    <div className="space-y-16 sm:space-y-24 py-4 sm:py-8 overflow-hidden">
      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="text-center space-y-5 relative"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <motion.div
            animate={{ y: [0, 24, 0], x: [0, 14, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-25"
            style={{ background: "oklch(0.72 0.19 255)" }}
          />
          <motion.div
            animate={{ y: [0, -18, 0], x: [0, -22, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 right-1/4 w-56 h-56 rounded-full blur-3xl opacity-20"
            style={{ background: "oklch(0.75 0.18 162)" }}
          />
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-170 h-170 rounded-full blur-3xl opacity-10"
            style={{
              background:
                "conic-gradient(from 0deg, oklch(0.72 0.19 255), oklch(0.75 0.18 162), oklch(0.82 0.18 85), oklch(0.72 0.19 255))",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{
              background: "oklch(0.72 0.19 255 / 12%)",
              color: "oklch(0.72 0.19 255)",
              border: "1px solid oklch(0.72 0.19 255 / 25%)",
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "oklch(0.72 0.19 255)" }}
            />
            Interactive Algorithm Learning · with live C++
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight"
          style={{ letterSpacing: "-0.03em" }}
        >
          See algorithms <span className="shimmer-text">think</span>.<br />
          <span
            className="text-2xl sm:text-3xl md:text-4xl"
            style={{ color: "oklch(0.65 0.04 255)" }}
          >
            Read the C++ <span style={{ color: "oklch(0.72 0.19 255)" }}>line-by-line</span>.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mx-auto max-w-xl text-sm sm:text-base"
          style={{ color: "oklch(0.60 0.04 255)" }}
        >
          Step through 60+ classic algorithms in real-time. Every animation is paired with the
          matching C++ STL implementation — and the currently-executing line lights up as you watch.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="flex justify-center gap-2 flex-wrap"
        >
          <Link
            to="/sorting"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: "oklch(0.72 0.19 255)",
              color: "oklch(0.08 0.02 265)",
              boxShadow: "0 0 24px oklch(0.72 0.19 255 / 30%)",
            }}
          >
            Start Visualizing{" "}
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              →
            </motion.span>
          </Link>
          <Link
            to="/graph"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{
              background: "oklch(1 0 0 / 6%)",
              color: "oklch(0.85 0.01 255)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            Try Graph Algorithms
          </Link>
        </motion.div>

        {/* 2D hero — toggleable Quick Sort / Binary Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="mx-auto mt-10 max-w-3xl rounded-2xl overflow-hidden relative"
          style={{
            background: "oklch(0.08 0.02 265)",
            border: "1px solid oklch(1 0 0 / 10%)",
            height: "400px",
          }}
        >
          <div
            className="absolute top-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-30 pointer-events-none"
            style={{ background: "oklch(0.72 0.19 255)", transform: "translate(-30%, -30%)" }}
          />
          <div
            className="absolute bottom-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ background: "oklch(0.75 0.18 162)", transform: "translate(30%, 30%)" }}
          />
          <HeroViz2D />
        </motion.div>
      </motion.section>

      {/* Stats — interactive */}
      <InteractiveStats />


      {/* Algorithm DNA */}
      <AlgoDNA />

      {/* Big-O Playground (new) */}
      <BigOPlayground />

      {/* Cards */}
      <motion.section
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="space-y-4"
      >
        <motion.header variants={fadeUp}>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            Explore by category
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            Ten sections, dozens of algorithms — every one with a synced C++ panel.
          </p>
        </motion.header>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <motion.div
              key={c.to}
              variants={fadeUp}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
            >
              <Link
                to={c.to}
                className="group relative block rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: "oklch(0.12 0.025 265)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    `0 8px 32px ${c.glow}, 0 0 0 1px ${c.accent}30`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`,
                  }}
                />
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <motion.span
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                          className="text-xl"
                          style={{ color: c.accent }}
                        >
                          {c.icon}
                        </motion.span>
                        <h3
                          className="text-base sm:text-lg font-semibold tracking-tight"
                          style={{ letterSpacing: "-0.02em" }}
                        >
                          {c.title}
                        </h3>
                      </div>
                      <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
                        {c.desc}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${c.accent}18`, color: c.accent }}
                    >
                      {c.tag}
                    </span>
                  </div>
                  <div
                    className="mt-4 flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: c.accent }}
                  >
                    Explore{" "}
                    <span className="transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* New animated section #1 */}
      <SortRace />

      {/* A* Pathfinding Three.js */}
      <AStarScene />



      {/* Features */}
      <motion.section
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="space-y-4"
      >
        <motion.header variants={fadeUp}>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            What you get
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            Designed to make algorithms click — not just watch them move.
          </p>
        </motion.header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ scale: 1.03 }}
              className="rounded-2xl p-5 cursor-default"
              style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <motion.div
                whileHover={{ scale: 1.2, rotate: 8 }}
                className="text-xl mb-2 inline-block"
                style={{ color: "oklch(0.72 0.19 255)" }}
              >
                {f.icon}
              </motion.div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">{f.title}</h3>
              <p className="text-xs sm:text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* New animated section #2 */}
      <Spotlight />

      {/* How it works */}
      <motion.section
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="space-y-4"
      >
        <motion.header variants={fadeUp}>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            How it works
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            Four steps from curious to confident.
          </p>
        </motion.header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 relative">
          {howSteps.map((s, i) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 0.15, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, type: "spring" }}
                className="absolute top-2 right-3 text-3xl font-bold"
                style={{ color: "oklch(0.72 0.19 255)" }}
              >
                {s.n}
              </motion.div>
              <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
              <p className="text-xs" style={{ color: "oklch(0.55 0.04 255)" }}>
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* New animated section #3 */}
      <ComplexityTable />

      {/* Topics marquee */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <header>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            Everything covered
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            A peek at the algorithms waiting for you.
          </p>
        </header>
        <div
          className="relative overflow-hidden rounded-2xl py-5"
          style={{
            background: "oklch(0.10 0.02 265)",
            border: "1px solid oklch(1 0 0 / 8%)",
            maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
          }}
        >
          <motion.div
            className="flex gap-2 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          >
            {[...topics, ...topics].map((t, i) => (
              <span
                key={i}
                className="inline-block px-3 py-1.5 rounded-full text-xs font-mono"
                style={{
                  background: "oklch(1 0 0 / 5%)",
                  color: "oklch(0.70 0.04 255)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                }}
              >
                {t}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* New animated section #4 */}
      <PseudoStepper />

      {/* Tech stack */}
      <motion.section
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="space-y-4"
      >
        <motion.header variants={fadeUp}>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            Built with
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>
            Modern tooling for a snappy experience.
          </p>
        </motion.header>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "TanStack Start", c: "oklch(0.72 0.19 255)" },
            { name: "React 19", c: "oklch(0.75 0.18 162)" },
            { name: "TypeScript", c: "oklch(0.72 0.19 255)" },
            { name: "Tailwind CSS", c: "oklch(0.75 0.18 200)" },
            { name: "Framer Motion", c: "oklch(0.82 0.18 85)" },
            { name: "Three.js", c: "oklch(0.82 0.22 60)" },
            { name: "Vite", c: "oklch(0.72 0.22 20)" },
            { name: "C++ STL", c: "oklch(0.72 0.22 180)" },
          ].map((tech) => (
            <motion.span
              key={tech.name}
              variants={popIn}
              whileHover={{ scale: 1.08, y: -2 }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-default"
              style={{ background: `${tech.c}14`, color: tech.c, border: `1px solid ${tech.c}30` }}
            >
              {tech.name}
            </motion.span>
          ))}
        </div>
      </motion.section>

      {/* New animated section #5 */}
      <Timeline />

      {/* New animated section #6 — Did You Know rotating facts */}
      <DidYouKnow />

      {/* ===== Game Theory homepage sections ===== */}
      <GameTheorySpotlight />
      <PayoffMatrixDemo />
      <StrategyShowdown />

      {/* CTA */}
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.12 0.04 265) 0%, oklch(0.10 0.02 265) 100%)",
          border: "1px solid oklch(1 0 0 / 10%)",
        }}
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 -z-10 opacity-25"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, oklch(0.72 0.19 255 / 40%), transparent 50%)",
          }}
        />
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          Ready to see your first algorithm?
        </h2>
        <p className="text-sm mt-2 mx-auto max-w-md" style={{ color: "oklch(0.60 0.04 255)" }}>
          Bubble sort is a great place to start. Then graduate to graphs and DP when you're hooked.
        </p>
        <div className="mt-5 flex justify-center gap-2 flex-wrap">
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/sorting"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "oklch(0.72 0.19 255)", color: "oklch(0.08 0.02 265)" }}
            >
              Open Sorting →
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/graph"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: "oklch(1 0 0 / 6%)",
                color: "oklch(0.85 0.01 255)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              Or jump to Graphs
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}

/* ====================================================================== */
/* Game Theory homepage sections                                          */
/* ====================================================================== */

function GameTheorySpotlight() {
  const items = [
    { icon: "⊞", name: "Nash Equilibrium", desc: "Mutual best-response cells", c: "oklch(0.72 0.19 255)" },
    { icon: "🌲", name: "Minimax", desc: "Optimal play on a game tree", c: "oklch(0.68 0.22 22)" },
    { icon: "🤝", name: "Iterated Dilemma", desc: "Strategy tournament", c: "oklch(0.75 0.18 162)" },
    { icon: "📈", name: "Fictitious Play", desc: "Learning from history", c: "oklch(0.82 0.18 85)" },
    { icon: "🔁", name: "Tit-for-Tat", desc: "Nice, retaliatory, forgiving", c: "oklch(0.75 0.18 310)" },
    { icon: "🍺", name: "El Farol Bar", desc: "Crowds self-organize", c: "oklch(0.72 0.22 180)" },
  ];
  return (
    <motion.section variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} className="space-y-4">
      <motion.header variants={fadeUp} className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-2" style={{ background: "oklch(0.72 0.19 255 / 12%)", color: "oklch(0.72 0.19 255)", border: "1px solid oklch(0.72 0.19 255 / 25%)" }}>♟ Game Theory</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Strategy algorithms, <span style={{ color: "oklch(0.72 0.19 255)" }}>animated</span></h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>Six animated strategy algorithms — each with synced Python code and an explanation.</p>
        </div>
        <Link to="/gametheory" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105" style={{ background: "oklch(0.72 0.19 255)", color: "oklch(0.08 0.02 265)", boxShadow: "0 0 18px oklch(0.72 0.19 255 / 28%)" }}>Open Game Theory →</Link>
      </motion.header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <motion.div key={it.name} variants={fadeUp} whileHover={{ y: -4 }}>
            <Link to="/gametheory" className="block rounded-2xl p-5 h-full" style={{ background: "oklch(0.12 0.025 265)", border: "1px solid oklch(1 0 0 / 8%)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${it.c}22, 0 0 0 1px ${it.c}33`)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "none")}>
              <div className="flex items-center gap-2.5 mb-1.5"><span className="text-xl" style={{ color: it.c }}>{it.icon}</span><h3 className="font-semibold text-sm sm:text-base">{it.name}</h3></div>
              <p className="text-xs sm:text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>{it.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function PayoffMatrixDemo() {
  const [a, setA] = useState<"silent" | "confess" | null>(null);
  const [b, setB] = useState<"silent" | "confess" | null>(null);
  const outcome = (() => {
    if (!a || !b) return null;
    if (a === "silent" && b === "silent") return { a: 1, b: 1, note: "Both cooperate → best collective outcome." };
    if (a === "silent" && b === "confess") return { a: 5, b: 0, note: "A trusts, B betrays → A pays the price." };
    if (a === "confess" && b === "silent") return { a: 0, b: 5, note: "A betrays, B trusts → B pays the price." };
    return { a: 3, b: 3, note: "Both defect → the Nash equilibrium. Worse than cooperating!" };
  })();
  const Btn = ({ val, cur, set, label }: { val: "silent" | "confess"; cur: string | null; set: (v: "silent" | "confess") => void; label: string }) => (
    <button onClick={() => set(val)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105" style={{ background: cur === val ? "oklch(0.72 0.19 255)" : "oklch(1 0 0 / 6%)", color: cur === val ? "oklch(0.08 0.02 265)" : "oklch(0.7 0.04 255)", border: "1px solid oklch(1 0 0 / 10%)" }}>{label}</button>
  );
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }} className="space-y-4">
      <header>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Play the Prisoner's Dilemma</h2>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>Pick a choice for each prisoner and watch the payoff. Years in prison — lower is better.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] items-start rounded-2xl p-5" style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
          <div />
          {["B: Silent", "B: Confess"].map((c) => (<div key={c} className="text-center text-xs font-medium pb-1" style={{ color: "oklch(0.6 0.04 255)" }}>{c}</div>))}
          {(["silent", "confess"] as const).map((ra) => (
            <>
              <div key={ra} className="flex items-center text-xs font-medium pr-2" style={{ color: "oklch(0.6 0.04 255)" }}>A: {ra === "silent" ? "Silent" : "Confess"}</div>
              {(["silent", "confess"] as const).map((cb) => {
                const lit = a === ra && b === cb;
                const yrs = ra === "silent" && cb === "silent" ? "1 / 1" : ra === "silent" && cb === "confess" ? "5 / 0" : ra === "confess" && cb === "silent" ? "0 / 5" : "3 / 3";
                return (<motion.div key={cb} animate={{ scale: lit ? 1.05 : 1 }} className="rounded-xl p-4 text-center font-mono font-bold" style={{ background: lit ? "oklch(0.72 0.19 255 / 22%)" : "oklch(1 0 0 / 4%)", border: `2px solid ${lit ? "oklch(0.72 0.19 255)" : "oklch(1 0 0 / 8%)"}`, boxShadow: lit ? "0 0 18px oklch(0.72 0.19 255 / 45%)" : "none", color: "oklch(0.85 0.02 255)" }}>{yrs}</motion.div>);
              })}
            </>
          ))}
        </div>
        <div className="space-y-3 min-w-[220px]">
          <div className="space-y-1.5"><div className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(0.5 0.04 255)" }}>Prisoner A</div><div className="flex gap-1.5"><Btn val="silent" cur={a} set={setA} label="Stay Silent" /><Btn val="confess" cur={a} set={setA} label="Confess" /></div></div>
          <div className="space-y-1.5"><div className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(0.5 0.04 255)" }}>Prisoner B</div><div className="flex gap-1.5"><Btn val="silent" cur={b} set={setB} label="Stay Silent" /><Btn val="confess" cur={b} set={setB} label="Confess" /></div></div>
          <AnimatePresence mode="wait">{outcome && (<motion.div key={outcome.note} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl px-3 py-2.5 text-xs" style={{ background: "oklch(0.72 0.19 255 / 12%)", border: "1px solid oklch(0.72 0.19 255 / 30%)", color: "oklch(0.85 0.02 255)" }}><div className="font-mono mb-1">A: {outcome.a} yr · B: {outcome.b} yr</div>{outcome.note}</motion.div>)}</AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}

function StrategyShowdown() {
  const strategies = useMemo(() => [
    { name: "Tit-for-Tat", c: "oklch(0.75 0.18 310)" },
    { name: "Always Defect", c: "oklch(0.68 0.22 22)" },
    { name: "Grudger", c: "oklch(0.82 0.18 85)" },
    { name: "Always Cooperate", c: "oklch(0.75 0.18 162)" },
    { name: "Random", c: "oklch(0.72 0.22 180)" },
  ], []);
  const targets = useMemo(() => [504, 421, 489, 398, 440], []);
  const [vals, setVals] = useState(() => strategies.map(() => 0));
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true); }, { threshold: 0.3 }); obs.observe(el); return () => obs.disconnect(); }, []);
  useEffect(() => { if (!seen) return; let frame = 0; const id = window.setInterval(() => { frame++; setVals(targets.map((t) => Math.min(t, Math.round((t * frame) / 40)))); if (frame >= 40) window.clearInterval(id); }, 40); return () => window.clearInterval(id); }, [seen, targets]);
  const max = Math.max(...targets);
  return (
    <motion.section ref={ref} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }} className="space-y-4">
      <header>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.025em" }}>Strategy showdown</h2>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 255)" }}>A round-robin Iterated Prisoner's Dilemma — the simple, forgiving Tit-for-Tat tends to come out on top.</p>
      </header>
      <div className="rounded-2xl p-5 space-y-3" style={{ background: "oklch(0.10 0.02 265)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        {strategies.map((st, i) => (
          <div key={st.name} className="flex items-center gap-3">
            <span className="w-32 text-xs font-medium shrink-0 text-right" style={{ color: "oklch(0.7 0.04 255)" }}>{st.name}</span>
            <div className="flex-1 h-7 rounded-md overflow-hidden" style={{ background: "oklch(1 0 0 / 5%)" }}>
              <div className="h-full rounded-md flex items-center justify-end pr-2 transition-[width] duration-100 ease-out" style={{ width: `${(vals[i] / max) * 100}%`, background: `linear-gradient(90deg, ${st.c}, ${st.c})`, boxShadow: `0 0 12px ${st.c}55` }}><span className="text-[10px] font-mono font-bold text-white">{vals[i]}</span></div>
            </div>
          </div>
        ))}
        <div className="pt-1"><Link to="/gametheory" className="text-xs font-medium" style={{ color: "oklch(0.72 0.19 255)" }}>Run the full tournament step-by-step →</Link></div>
      </div>
    </motion.section>
  );
}
