export type TreeNode = {
  id: number;
  value: number;
  left?: TreeNode;
  right?: TreeNode;
  x: number;
  y: number;
};

export function buildBST(values: number[]): TreeNode | undefined {
  let id = 0;
  let root: TreeNode | undefined;
  const insert = (node: TreeNode | undefined, v: number): TreeNode => {
    if (!node) return { id: id++, value: v, x: 0, y: 0 };
    if (v < node.value) node.left = insert(node.left, v);
    else node.right = insert(node.right, v);
    return node;
  };
  for (const v of values) root = insert(root, v);
  if (root) layout(root);
  return root;
}

function layout(root: TreeNode) {
  // compute in-order x, depth y
  let i = 0;
  const assign = (n: TreeNode, depth: number) => {
    if (n.left) assign(n.left, depth + 1);
    n.x = i++;
    n.y = depth;
    if (n.right) assign(n.right, depth + 1);
  };
  assign(root, 0);
}

export function flatten(root?: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const dfs = (n?: TreeNode) => {
    if (!n) return;
    out.push(n);
    dfs(n.left);
    dfs(n.right);
  };
  dfs(root);
  return out;
}

export type TraversalStep = { visiting: number; visited: number[] };

export function* inorder(n?: TreeNode, visited: number[] = []): Generator<TraversalStep> {
  if (!n) return;
  yield* inorder(n.left, visited);
  visited.push(n.id);
  yield { visiting: n.id, visited: [...visited] };
  yield* inorder(n.right, visited);
}
export function* preorder(n?: TreeNode, visited: number[] = []): Generator<TraversalStep> {
  if (!n) return;
  visited.push(n.id);
  yield { visiting: n.id, visited: [...visited] };
  yield* preorder(n.left, visited);
  yield* preorder(n.right, visited);
}
export function* postorder(n?: TreeNode, visited: number[] = []): Generator<TraversalStep> {
  if (!n) return;
  yield* postorder(n.left, visited);
  yield* postorder(n.right, visited);
  visited.push(n.id);
  yield { visiting: n.id, visited: [...visited] };
}
export function* bfs(root?: TreeNode): Generator<TraversalStep> {
  if (!root) return;
  const q: TreeNode[] = [root];
  const visited: number[] = [];
  while (q.length) {
    const n = q.shift()!;
    visited.push(n.id);
    yield { visiting: n.id, visited: [...visited] };
    if (n.left) q.push(n.left);
    if (n.right) q.push(n.right);
  }
}

export const TRAVERSALS = { BFS: bfs, "DFS-In": inorder, "DFS-Pre": preorder, "DFS-Post": postorder } as const;
export type TraversalName = keyof typeof TRAVERSALS;