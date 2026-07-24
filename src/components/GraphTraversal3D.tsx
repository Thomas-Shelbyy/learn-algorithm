/**
 * GraphTraversal3D — BFS / DFS Binary-Tree Visualizer (Three.js)
 *
 * Drop-in replacement.  Usage:
 *   import { GraphTraversal3D } from "./GraphTraversal3D";
 *   <GraphTraversal3D />
 *
 * Features
 *  • Proper binary tree layout (not a messy graph)
 *  • BFS  — queue-based level-order traversal, cyan wave
 *  • DFS  — recursive stack traversal, amber/orange wave
 *  • Step-by-step mode + auto-play with speed slider
 *  • Click any node to set it as the traversal root
 *  • Drag to orbit · scroll to zoom
 *  • Glowing edges, floating node spheres, visit-order labels
 *  • Particle backdrop, fog, rim lights
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ─── Tree definition ─────────────────────────────────────────────────────────

interface TreeNode {
  id: number;
  label: string;
  left: number | null;
  right: number | null;
  parent: number | null;
  depth: number;
  x: number; // layout x [-1..1] normalized
  y: number; // layout y
}

function buildTree(): TreeNode[] {
  // 15-node complete binary tree
  const labels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];
  const nodes: TreeNode[] = labels.map((label, id) => ({
    id,
    label,
    left: 2 * id + 1 < 15 ? 2 * id + 1 : null,
    right: 2 * id + 2 < 15 ? 2 * id + 2 : null,
    parent: id === 0 ? null : Math.floor((id - 1) / 2),
    depth: Math.floor(Math.log2(id + 1)),
    x: 0,
    y: 0,
  }));

  // Reingold-Tilford-ish x placement
  const depthCount: Record<number, number> = {};
  const depthIndex: Record<number, number> = {};
  nodes.forEach((n) => {
    depthCount[n.depth] = (depthCount[n.depth] || 0) + 1;
    depthIndex[n.depth] = 0;
  });
  nodes.forEach((n) => {
    const idx = depthIndex[n.depth]++;
    const total = depthCount[n.depth];
    n.x = total === 1 ? 0 : (idx / (total - 1)) * 2 - 1;
    n.y = -n.depth;
  });
  return nodes;
}

// ─── Traversal generators ─────────────────────────────────────────────────────

function bfsOrder(nodes: TreeNode[], rootId: number): number[] {
  const order: number[] = [];
  const queue = [rootId];
  const visited = new Set<number>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    const n = nodes[id];
    if (n.left !== null) queue.push(n.left);
    if (n.right !== null) queue.push(n.right);
  }
  return order;
}

function dfsOrder(nodes: TreeNode[], rootId: number): number[] {
  const order: number[] = [];
  const stack = [rootId];
  const visited = new Set<number>();
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    const n = nodes[id];
    // push right first so left is processed first
    if (n.right !== null) stack.push(n.right);
    if (n.left !== null) stack.push(n.left);
  }
  return order;
}

// ─── Three.js scene scale helpers ────────────────────────────────────────────

const SCALE_X = 4.2;
const SCALE_Y = 1.8;
const NODE_RADIUS = 0.22;

function nodePos(n: TreeNode): THREE.Vector3 {
  return new THREE.Vector3(n.x * SCALE_X, n.y * SCALE_Y + 2.4, 0);
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const C_BASE = new THREE.Color("#1a2a4a");
const C_VISITED = new THREE.Color("#3ddc97");
const C_ACTIVE = new THREE.Color("#ffd34d");
const C_BFS_WAVE = new THREE.Color("#38bdf8"); // cyan
const C_DFS_WAVE = new THREE.Color("#fb923c"); // orange
const C_EDGE_BASE = new THREE.Color("#1e3060");
const C_EDGE_LIT = new THREE.Color("#60a5fa");
const C_ROOT_RING = new THREE.Color("#c084fc"); // purple

// ─── Component ───────────────────────────────────────────────────────────────

type TraversalMode = "BFS" | "DFS";

export function GraphTraversal3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    visitedSet: Set<number>;
    activeId: number;
    orderArray: number[];
    stepIndex: number;
    rootId: number;
    mode: TraversalMode;
    autoPlay: boolean;
    speed: number; // ms per step
    nodeMeshes: THREE.Mesh[];
    nodeMats: THREE.MeshStandardMaterial[];
    edgeMats: Array<{ mat: THREE.LineBasicMaterial; a: number; b: number }>;
    visitLabels: THREE.Sprite[];
    nodes: TreeNode[];
    hovered: number;
    frame: number;
    targetYaw: number;
    targetPitch: number;
    targetZoom: number;
    currentZoom: number;
    dragging: boolean;
    movedPx: number;
    lastX: number;
    lastY: number;
    autoTimer: ReturnType<typeof setTimeout> | null;
    rebuildCb: (() => void) | null;
    stepCb: (() => void) | null;
  }>({
    visitedSet: new Set(),
    activeId: -1,
    orderArray: [],
    stepIndex: 0,
    rootId: 0,
    mode: "BFS",
    autoPlay: true,
    speed: 600,
    nodeMeshes: [],
    nodeMats: [],
    edgeMats: [],
    visitLabels: [],
    nodes: [],
    hovered: -1,
    frame: 0,
    targetYaw: 0,
    targetPitch: 0.08,
    targetZoom: 8,
    currentZoom: 8,
    dragging: false,
    movedPx: 0,
    lastX: 0,
    lastY: 0,
    autoTimer: null,
    rebuildCb: null,
    stepCb: null,
  });

  const [mode, setMode] = useState<TraversalMode>("BFS");
  const [rootId, setRootId] = useState(0);
  const [speed, setSpeed] = useState(600);
  const [autoPlay, setAutoPlay] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [orderLen, setOrderLen] = useState(15);
  const [visitedIds, setVisitedIds] = useState<number[]>([]);
  const [activeId, setActiveId] = useState(-1);
  const [isDone, setIsDone] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  // Sync react state → ref
  useEffect(() => {
    stateRef.current.mode = mode;
  }, [mode]);
  useEffect(() => {
    stateRef.current.rootId = rootId;
  }, [rootId]);
  useEffect(() => {
    stateRef.current.speed = speed;
  }, [speed]);
  useEffect(() => {
    stateRef.current.autoPlay = autoPlay;
  }, [autoPlay]);

  // ── Three.js bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 600;
    const H = el.clientHeight || 380;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color("#040814"), 12, 28);
    const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 100);
    camera.position.set(0, 1, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 8, 5);
    scene.add(key);
    const rimBlue = new THREE.PointLight(new THREE.Color("#38bdf8"), 18, 22);
    rimBlue.position.set(-6, 4, -3);
    scene.add(rimBlue);
    const rimAmber = new THREE.PointLight(new THREE.Color("#fb923c"), 10, 18);
    rimAmber.position.set(6, -2, 4);
    scene.add(rimAmber);

    // World group (for orbit)
    const world = new THREE.Group();
    scene.add(world);

    // Particle backdrop
    const pCount = 300;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 22;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color("#7aa7ff"),
      size: 0.032,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    world.add(new THREE.Points(pGeo, pMat));

    // Build tree data
    const nodes = buildTree();
    stateRef.current.nodes = nodes;

    // ── Edges ──────────────────────────────────────────────────────────────
    const edgeGroup = new THREE.Group();
    world.add(edgeGroup);
    const edgeMats: typeof stateRef.current.edgeMats = [];

    nodes.forEach((n) => {
      if (n.parent === null) return;
      const p = nodes[n.parent];
      const pv = nodePos(p);
      const nv = nodePos(n);

      // Tube-ish glow using wide line
      const geo = new THREE.BufferGeometry().setFromPoints([pv, nv]);
      const mat = new THREE.LineBasicMaterial({
        color: C_EDGE_BASE.clone(),
        linewidth: 2,
        transparent: true,
        opacity: 0.7,
      });
      edgeGroup.add(new THREE.Line(geo, mat));
      edgeMats.push({ mat, a: n.parent, b: n.id });

      // Thinner bright glow on top
      const mat2 = new THREE.LineBasicMaterial({
        color: C_EDGE_BASE.clone(),
        linewidth: 1,
        transparent: true,
        opacity: 0.3,
      });
      edgeGroup.add(new THREE.Line(geo, mat2));
    });
    stateRef.current.edgeMats = edgeMats;

    // ── Node meshes ─────────────────────────────────────────────────────────
    const nodeGroup = new THREE.Group();
    world.add(nodeGroup);
    const nodeGeo = new THREE.SphereGeometry(NODE_RADIUS, 20, 16);
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeMats: THREE.MeshStandardMaterial[] = [];
    const visitLabels: THREE.Sprite[] = [];

    // Root ring glow
    const ringGeo = new THREE.TorusGeometry(NODE_RADIUS + 0.12, 0.04, 8, 36);
    const ringMat = new THREE.MeshStandardMaterial({
      color: C_ROOT_RING,
      emissive: C_ROOT_RING,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85,
    });
    const rootRing = new THREE.Mesh(ringGeo, ringMat);
    nodeGroup.add(rootRing);

    nodes.forEach((n) => {
      const mat = new THREE.MeshStandardMaterial({
        color: C_BASE.clone(),
        emissive: C_BASE.clone(),
        emissiveIntensity: 0.25,
        roughness: 0.28,
        metalness: 0.55,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      const pos = nodePos(n);
      mesh.position.copy(pos);
      nodeGroup.add(mesh);
      nodeMeshes.push(mesh);
      nodeMats.push(mat);

      // Label sprite (letter)
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 64, 64);
      ctx.font = "bold 36px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, 32, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.set(0.32, 0.32, 1);
      nodeGroup.add(sprite);

      // Visit-order sprite (number badge, initially hidden)
      const vCanvas = document.createElement("canvas");
      vCanvas.width = 48;
      vCanvas.height = 48;
      const vCtx = vCanvas.getContext("2d")!;
      vCtx.clearRect(0, 0, 48, 48);
      const vTex = new THREE.CanvasTexture(vCanvas);
      const vSpriteMat = new THREE.SpriteMaterial({
        map: vTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const vSprite = new THREE.Sprite(vSpriteMat);
      vSprite.position.set(pos.x + 0.22, pos.y + 0.22, pos.z + 0.1);
      vSprite.scale.set(0.28, 0.28, 1);
      nodeGroup.add(vSprite);
      // Store canvas/ctx on sprite for later updates
      (vSprite as any).__canvas = vCanvas;
      (vSprite as any).__ctx = vCtx;
      (vSprite as any).__tex = vTex;
      visitLabels.push(vSprite);
    });

    stateRef.current.nodeMeshes = nodeMeshes;
    stateRef.current.nodeMats = nodeMats;
    stateRef.current.visitLabels = visitLabels;

    // ── Traversal state helpers ─────────────────────────────────────────────
    function clearTraversal() {
      stateRef.current.visitedSet = new Set();
      stateRef.current.activeId = -1;
      stateRef.current.stepIndex = 0;
      stateRef.current.orderArray = [];
      setStepIndex(0);
      setActiveId(-1);
      setVisitedIds([]);
      setIsDone(false);

      // Reset node colors
      nodeMats.forEach((m) => {
        m.color.copy(C_BASE);
        m.emissive.copy(C_BASE);
        m.emissiveIntensity = 0.25;
      });
      // Reset edge colors
      edgeMats.forEach(({ mat }) => {
        mat.color.copy(C_EDGE_BASE);
        mat.opacity = 0.7;
      });
      // Clear visit-order labels
      visitLabels.forEach((s) => {
        (s.material as THREE.SpriteMaterial).opacity = 0;
      });
    }

    function startTraversal() {
      clearTraversal();
      const { rootId: rid, mode: m, nodes: ns } = stateRef.current;
      const order = m === "BFS" ? bfsOrder(ns, rid) : dfsOrder(ns, rid);
      stateRef.current.orderArray = order;
      setOrderLen(order.length);
    }

    function advanceStep() {
      const s = stateRef.current;
      const { orderArray, stepIndex, visitedSet, visitLabels: vl } = s;
      if (stepIndex >= orderArray.length) {
        setIsDone(true);
        if (s.autoTimer) {
          clearTimeout(s.autoTimer);
          s.autoTimer = null;
        }
        return;
      }
      const id = orderArray[stepIndex];
      const rank = stepIndex + 1;

      // Mark visited
      visitedSet.add(id);
      s.activeId = id;
      s.stepIndex = stepIndex + 1;
      setStepIndex(stepIndex + 1);
      setActiveId(id);
      setVisitedIds([...visitedSet]);

      // Color node
      const waveColor = s.mode === "BFS" ? C_BFS_WAVE : C_DFS_WAVE;
      nodeMats[id].color.copy(waveColor);
      nodeMats[id].emissive.copy(waveColor);
      nodeMats[id].emissiveIntensity = 1.6;

      // Prev active → visited green
      if (stepIndex > 0) {
        const prev = orderArray[stepIndex - 1];
        nodeMats[prev].color.copy(C_VISITED);
        nodeMats[prev].emissive.copy(C_VISITED);
        nodeMats[prev].emissiveIntensity = 0.5;
      }

      // Edge lighting: illuminate path edge from parent
      const ns = s.nodes;
      const par = ns[id].parent;
      if (par !== null) {
        edgeMats.forEach((e) => {
          if ((e.a === par && e.b === id) || (e.a === id && e.b === par)) {
            e.mat.color.copy(C_EDGE_LIT);
            e.mat.opacity = 1.0;
          }
        });
      }

      // Visit-order badge
      const badge = vl[id];
      const bCanvas = (badge as any).__canvas as HTMLCanvasElement;
      const bCtx = (badge as any).__ctx as CanvasRenderingContext2D;
      const bTex = (badge as any).__tex as THREE.CanvasTexture;
      bCtx.clearRect(0, 0, 48, 48);
      bCtx.beginPath();
      bCtx.arc(24, 24, 22, 0, Math.PI * 2);
      bCtx.fillStyle = s.mode === "BFS" ? "#38bdf8" : "#fb923c";
      bCtx.fill();
      bCtx.font = "bold 22px monospace";
      bCtx.fillStyle = "#050d1a";
      bCtx.textAlign = "center";
      bCtx.textBaseline = "middle";
      bCtx.fillText(String(rank), 24, 24);
      bTex.needsUpdate = true;
      (badge.material as THREE.SpriteMaterial).opacity = 1;
    }

    function scheduleNext() {
      const s = stateRef.current;
      if (!s.autoPlay) return;
      if (s.autoTimer) clearTimeout(s.autoTimer);
      if (s.stepIndex >= s.orderArray.length) return;
      s.autoTimer = setTimeout(() => {
        advanceStep();
        scheduleNext();
      }, s.speed);
    }

    stateRef.current.rebuildCb = () => {
      if (stateRef.current.autoTimer) clearTimeout(stateRef.current.autoTimer);
      startTraversal();
      if (stateRef.current.autoPlay) scheduleNext();
    };
    stateRef.current.stepCb = () => {
      if (stateRef.current.autoTimer) {
        clearTimeout(stateRef.current.autoTimer);
        stateRef.current.autoTimer = null;
      }
      advanceStep();
    };

    // Initial start
    startTraversal();
    scheduleNext();

    // ── Interaction ─────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2(-10, -10);
    const dom = renderer.domElement;
    dom.style.touchAction = "none";

    const onPD = (e: PointerEvent) => {
      stateRef.current.dragging = true;
      stateRef.current.movedPx = 0;
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    };
    const onPM = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const s = stateRef.current;
      if (s.dragging) {
        const dx = e.clientX - s.lastX;
        const dy = e.clientY - s.lastY;
        s.movedPx += Math.abs(dx) + Math.abs(dy);
        s.targetYaw += dx * 0.005;
        s.targetPitch = THREE.MathUtils.clamp(s.targetPitch + dy * 0.004, -0.25, 0.45);
        s.lastX = e.clientX;
        s.lastY = e.clientY;
      }
    };
    const onPU = (e: PointerEvent) => {
      const s = stateRef.current;
      if (s.dragging && s.movedPx < 5) {
        // Click: detect node hit → set as root
        raycaster.setFromCamera(pointerNDC, camera);
        const hits = raycaster.intersectObjects(nodeMeshes, false);
        if (hits.length) {
          const idx = nodeMeshes.indexOf(hits[0].object as THREE.Mesh);
          if (idx !== -1) {
            stateRef.current.rootId = idx;
            setRootId(idx);
            stateRef.current.rebuildCb?.();
          }
        }
      }
      s.dragging = false;
      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {}
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stateRef.current.targetZoom = THREE.MathUtils.clamp(
        stateRef.current.targetZoom + e.deltaY * 0.01,
        4,
        14,
      );
    };

    dom.addEventListener("pointerdown", onPD);
    dom.addEventListener("pointermove", onPM);
    dom.addEventListener("pointerup", onPU);
    dom.addEventListener("wheel", onWheel, { passive: false });

    // ── Render loop ──────────────────────────────────────────────────────────
    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      const s = stateRef.current;
      s.frame++;

      // Zoom lerp
      s.currentZoom += (s.targetZoom - s.currentZoom) * 0.08;
      camera.position.setLength(s.currentZoom);

      // Orbit
      const idle = s.dragging ? 0 : Math.sin(s.frame * 0.003) * 0.04;
      world.rotation.y += (s.targetYaw + idle - world.rotation.y) * 0.07;
      world.rotation.x += (s.targetPitch - world.rotation.x) * 0.07;
      camera.lookAt(0, 1, 0);

      // Raycaster hover
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(nodeMeshes, false);
      const hov = hits.length ? nodeMeshes.indexOf(hits[0].object as THREE.Mesh) : -1;
      s.hovered = hov;

      // Root ring
      const rPos = nodePos(nodes[s.rootId]);
      rootRing.position.copy(rPos);
      rootRing.rotation.z = s.frame * 0.018;
      rootRing.rotation.y = s.frame * 0.009;

      // Animate active node pulse
      nodeMats.forEach((mat, i) => {
        const isActive = i === s.activeId;
        const isVisited = s.visitedSet.has(i);
        const isHov = i === hov;
        const waveColor = s.mode === "BFS" ? C_BFS_WAVE : C_DFS_WAVE;

        let targetEmi = 0.25;
        if (isActive) {
          const pulse = 1.4 + Math.sin(s.frame * 0.22) * 0.4;
          mat.emissiveIntensity += (pulse - mat.emissiveIntensity) * 0.3;
        } else if (isVisited) {
          targetEmi = isHov ? 1.0 : 0.5;
          mat.emissiveIntensity += (targetEmi - mat.emissiveIntensity) * 0.12;
        } else if (isHov) {
          mat.emissive.lerp(new THREE.Color("#ffffff"), 0.3);
          mat.emissiveIntensity += (0.8 - mat.emissiveIntensity) * 0.18;
        } else {
          mat.emissive.lerp(C_BASE, 0.08);
          mat.emissiveIntensity += (targetEmi - mat.emissiveIntensity) * 0.08;
        }

        // Hover scale
        const targetScale = isHov ? 1.18 : isActive ? 1.12 : 1.0;
        nodeMeshes[i].scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.18);
      });

      // Edge pulse for active path
      edgeMats.forEach(({ mat, a, b }) => {
        const eitherActive = a === s.activeId || b === s.activeId;
        if (eitherActive) {
          const p = 0.8 + Math.sin(s.frame * 0.18) * 0.2;
          mat.opacity = p;
        }
      });

      pMat.opacity = 0.32 + 0.08 * Math.sin(s.frame * 0.007);

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth || 1,
        h = el.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (stateRef.current.autoTimer) clearTimeout(stateRef.current.autoTimer);
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("pointerdown", onPD);
      dom.removeEventListener("pointermove", onPM);
      dom.removeEventListener("pointerup", onPU);
      dom.removeEventListener("wheel", onWheel);
      nodeGeo.dispose();
      ringGeo.dispose();
      pGeo.dispose();
      pMat.dispose();
      ringMat.dispose();
      nodeMats.forEach((m) => m.dispose());
      edgeMats.forEach(({ mat }) => mat.dispose());
      visitLabels.forEach((s) => {
        (s.material as THREE.SpriteMaterial).map?.dispose();
        (s.material as THREE.SpriteMaterial).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);

  // ── Sync autoPlay changes to the running scene ──────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    s.autoPlay = autoPlay;
    if (autoPlay && s.orderArray.length > 0 && s.stepIndex < s.orderArray.length) {
      const tick = () => {
        if (!stateRef.current.autoPlay) return;
        stateRef.current.stepCb?.();
        if (stateRef.current.stepIndex < stateRef.current.orderArray.length) {
          stateRef.current.autoTimer = setTimeout(tick, stateRef.current.speed);
        }
      };
      if (s.autoTimer) clearTimeout(s.autoTimer);
      s.autoTimer = setTimeout(tick, s.speed);
    } else if (!autoPlay && s.autoTimer) {
      clearTimeout(s.autoTimer);
      s.autoTimer = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  // ── Handle mode / rootId / restart ──────────────────────────────────────
  const rebuild = useCallback(() => {
    stateRef.current.rebuildCb?.();
    setIsDone(false);
  }, []);

  const handleModeChange = (m: TraversalMode) => {
    setMode(m);
    stateRef.current.mode = m;
    setTimeout(() => rebuild(), 0);
  };

  const handleRestart = () => {
    rebuild();
    setIsDone(false);
  };

  const handleStep = () => {
    setAutoPlay(false);
    stateRef.current.stepCb?.();
  };

  const waveColor = mode === "BFS" ? "#38bdf8" : "#fb923c";
  const waveLabel = mode === "BFS" ? "Queue (FIFO)" : "Stack (LIFO)";

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        height: 380,
        background: "oklch(0.07 0.025 265)",
        border: "1px solid oklch(1 0 0 / 10%)",
      }}
    >
      {/* Three.js canvas */}
      <div ref={mountRef} className="absolute inset-0" style={{ cursor: "crosshair" }} />

      {/* ── Top bar ── */}
      <div className="absolute top-3 left-0 right-0 flex items-center justify-center gap-2 z-10 flex-wrap px-3">
        {/* Mode buttons */}
        {(["BFS", "DFS"] as TraversalMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className="px-3 py-1 rounded-full text-[11px] font-mono transition-all hover:scale-105 active:scale-95"
            style={{
              background: m === mode ? `${waveColor}22` : "oklch(1 0 0 / 5%)",
              color: m === mode ? waveColor : "oklch(0.55 0.04 255)",
              border: `1px solid ${m === mode ? waveColor + "55" : "oklch(1 0 0 / 10%)"}`,
              fontWeight: m === mode ? 700 : 400,
            }}
          >
            {m}
          </button>
        ))}

        {/* Step button */}
        <button
          onClick={handleStep}
          disabled={isDone || stepIndex >= orderLen}
          className="px-3 py-1 rounded-full text-[11px] font-mono transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
          style={{
            background: "oklch(0.75 0.18 85 / 14%)",
            color: "oklch(0.82 0.18 85)",
            border: "1px solid oklch(0.82 0.18 85 / 30%)",
          }}
        >
          ⏭ Step
        </button>

        {/* Auto-play toggle */}
        <button
          onClick={() => setAutoPlay((p) => !p)}
          className="px-3 py-1 rounded-full text-[11px] font-mono transition-all hover:scale-105"
          style={{
            background: autoPlay ? "oklch(0.75 0.18 162 / 14%)" : "oklch(1 0 0 / 5%)",
            color: autoPlay ? "oklch(0.75 0.18 162)" : "oklch(0.55 0.04 255)",
            border: `1px solid ${autoPlay ? "oklch(0.75 0.18 162 / 30%)" : "oklch(1 0 0 / 10%)"}`,
          }}
        >
          {autoPlay ? "⏸ Pause" : "▶ Play"}
        </button>

        {/* Restart */}
        <button
          onClick={handleRestart}
          className="px-3 py-1 rounded-full text-[11px] font-mono transition-all hover:scale-105"
          style={{
            background: "oklch(0.68 0.22 22 / 12%)",
            color: "oklch(0.75 0.18 22)",
            border: "1px solid oklch(0.68 0.22 22 / 30%)",
          }}
        >
          ↺ Restart
        </button>
      </div>

      {/* ── Speed slider ── */}
      <div
        className="absolute top-12 right-3 flex items-center gap-2 z-10"
        style={{ pointerEvents: "auto" }}
      >
        <span className="text-[9px] font-mono" style={{ color: "oklch(0.40 0.04 255)" }}>
          slow
        </span>
        <input
          type="range"
          min={120}
          max={1200}
          step={60}
          value={1320 - speed}
          onChange={(e) => setSpeed(1320 - Number(e.target.value))}
          style={{ width: 68, accentColor: waveColor, cursor: "pointer" }}
        />
        <span className="text-[9px] font-mono" style={{ color: "oklch(0.40 0.04 255)" }}>
          fast
        </span>
      </div>

      {/* ── HUD: step counter + data structure label ── */}
      <div className="absolute top-12 left-3 flex items-center gap-2 z-10">
        <span
          className="px-2 py-0.5 rounded-md text-[10px] font-mono"
          style={{
            background: "oklch(0.06 0.02 265 / 88%)",
            color: waveColor,
            border: `1px solid ${waveColor}33`,
          }}
        >
          step {stepIndex} / {orderLen}
        </span>
        <span
          className="px-2 py-0.5 rounded-md text-[10px] font-mono hidden sm:inline"
          style={{
            background: "oklch(0.06 0.02 265 / 88%)",
            color: "oklch(0.55 0.04 255)",
            border: "1px solid oklch(1 0 0 / 10%)",
          }}
        >
          {waveLabel}
        </span>
        {isDone && (
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-mono animate-pulse"
            style={{ background: "#3ddc9720", color: "#3ddc97", border: "1px solid #3ddc9730" }}
          >
            ✓ done
          </span>
        )}
      </div>

      {/* ── Visit queue/stack display ── */}
      <div className="absolute bottom-9 left-3 right-3 flex flex-wrap justify-center gap-1 pointer-events-none z-10">
        {visitedIds.slice(-12).map((id, rank) => {
          const isLatest = id === activeId;
          return (
            <span
              key={`${id}-${rank}`}
              className="inline-flex items-center justify-center text-[10px] font-mono rounded"
              style={{
                width: 22,
                height: 22,
                background: isLatest ? waveColor : "#3ddc9722",
                color: isLatest ? "#050d1a" : "#3ddc97",
                border: `1px solid ${isLatest ? waveColor : "#3ddc9740"}`,
                fontWeight: isLatest ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              {stateRef.current.nodes[id]?.label ?? id}
            </span>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4 pointer-events-none z-10">
        {[
          { dot: waveColor, label: "Active" },
          { dot: "#3ddc97", label: "Visited" },
          { dot: "#c084fc", label: "Root ◎" },
          { dot: "#60a5fa", label: "Edge lit" },
        ].map(({ dot, label }) => (
          <span
            key={label}
            className="flex items-center gap-1 text-[9px] font-mono"
            style={{ color: "oklch(0.45 0.04 255)" }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
            {label}
          </span>
        ))}
      </div>

      {/* ── Hint ── */}
      <div
        className="absolute top-3 right-3 text-[9px] font-mono pointer-events-none z-10"
        style={{ color: "oklch(0.32 0.04 255)" }}
      >
        click node = set root · drag = orbit · scroll = zoom
      </div>
    </div>
  );
}

export default GraphTraversal3D;
