// AST node definitions for the teaching C++ subset.

export type TypeName =
  | "int" | "long" | "short" | "float" | "double" | "bool" | "char" | "string" | "void" | "auto";

export interface VarType { base: TypeName; isVector?: boolean; isRef?: boolean; isConst?: boolean; dims?: Expr[]; }

// ---- Expressions ----
export type Expr =
  | { k: "num"; v: number; line: number }
  | { k: "str"; v: string; line: number }
  | { k: "char"; v: string; line: number }
  | { k: "bool"; v: boolean; line: number }
  | { k: "var"; name: string; line: number }
  | { k: "index"; obj: Expr; idx: Expr; line: number }
  | { k: "member"; obj: Expr; prop: string; line: number }
  | { k: "call"; callee: Expr; args: Expr[]; line: number }
  | { k: "un"; op: string; e: Expr; prefix: boolean; line: number }
  | { k: "bin"; op: string; a: Expr; b: Expr; line: number }
  | { k: "assign"; op: string; target: Expr; value: Expr; line: number }
  | { k: "ternary"; cond: Expr; then: Expr; els: Expr; line: number }
  | { k: "comma"; items: Expr[]; line: number }
  | { k: "initlist"; items: Expr[]; line: number };

// ---- Statements ----
export type Stmt =
  | { k: "varDecl"; type: VarType; decls: { name: string; init?: Expr; dims?: Expr[] }[]; line: number }
  | { k: "exprStmt"; e: Expr; line: number }
  | { k: "block"; body: Stmt[]; line: number }
  | { k: "if"; cond: Expr; then: Stmt; els?: Stmt; line: number }
  | { k: "while"; cond: Expr; body: Stmt; line: number }
  | { k: "doWhile"; cond: Expr; body: Stmt; line: number; condLine: number }
  | { k: "for"; init?: Stmt; cond?: Expr; post?: Expr; body: Stmt; line: number }
  | { k: "switch"; disc: Expr; cases: { test?: Expr; body: Stmt[] }[]; line: number }
  | { k: "break"; line: number }
  | { k: "continue"; line: number }
  | { k: "return"; e?: Expr; line: number }
  | { k: "cout"; parts: Expr[]; line: number }
  | { k: "cin"; targets: Expr[]; line: number }
  | { k: "funcDecl"; name: string; ret: VarType; params: { type: VarType; name: string }[]; body: Stmt[]; line: number }
  | { k: "empty"; line: number };

export interface Program { funcs: Record<string, Extract<Stmt, { k: "funcDecl" }>>; globals: Stmt[]; }
