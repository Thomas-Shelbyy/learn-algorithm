import type { Expr, Program, Stmt, VarType } from "./ast";
import { CompileError, parse } from "./parser";
import {
  bool, clone, CppVal, defaultVal, disp, makeNum, num,
} from "./values";

export class RuntimeError extends Error { line: number; constructor(m: string, line: number) { super(m); this.line = line; } }
class BreakSignal { }
class ContinueSignal { }
class ReturnSignal { v: CppVal; constructor(v: CppVal) { this.v = v; } }

export interface Frame { func: string; scopes: Map<string, CppVal>[]; }
export interface Step {
  line: number;
  output: string;
  note: string;
  stack: { func: string; vars: [string, string][] }[]; // display snapshot
}

const MAX_STEPS = 6000;
const MAX_DEPTH = 600;

export interface RunResult { steps: Step[]; error?: string; needInput?: boolean; }

export class Interpreter {
  prog: Program;
  out = "";
  steps: Step[] = [];
  frames: Frame[] = [];
  inputs: string[];
  inputPos = 0;
  budget = 200000;

  constructor(prog: Program, input: string) {
    this.prog = prog;
    this.inputs = input.split(/\s+/).filter((s) => s.length > 0);
  }

  // ---- scope helpers ----
  get top() { return this.frames[this.frames.length - 1]; }
  pushScope() { this.top.scopes.push(new Map()); }
  popScope() { this.top.scopes.pop(); }
  declare(name: string, v: CppVal) { this.top.scopes[this.top.scopes.length - 1].set(name, v); }
  lookupRef(name: string): { scope: Map<string, CppVal> } | null {
    const f = this.top;
    for (let i = f.scopes.length - 1; i >= 0; i--) if (f.scopes[i].has(name)) return { scope: f.scopes[i] };
    if (this.globals.has(name)) return { scope: this.globals };
    return null;
  }
  globals = new Map<string, CppVal>();
  getVar(name: string, line: number): CppVal {
    const r = this.lookupRef(name);
    if (!r) throw new RuntimeError(`Undefined variable '${name}'`, line);
    return r.scope.get(name)!;
  }
  setVar(name: string, v: CppVal, line: number) {
    const r = this.lookupRef(name);
    if (!r) throw new RuntimeError(`Undefined variable '${name}'`, line);
    r.scope.set(name, v);
  }

  snap(line: number, note: string) {
    if (--this.budget < 0) throw new RuntimeError("Execution budget exceeded (possible infinite loop).", line);
    const stack = this.frames.map((f) => {
      const vars: [string, string][] = [];
      for (const sc of f.scopes) for (const [k, val] of sc) vars.push([k, disp(val)]);
      return { func: f.func, vars };
    });
    this.steps.push({ line, output: this.out, note, stack });
    if (this.steps.length > MAX_STEPS) throw new RuntimeError("Too many steps to visualize — try smaller inputs.", line);
  }

  run() {
    // globals first
    this.frames.push({ func: "<globals>", scopes: [this.globals] });
    this.snap(-1, "Program start");
    for (const g of this.prog.globals) this.exec(g);
    this.frames.pop();
    // call main
    this.callFunction("main", [], 0);
    this.snap(-2, "Program finished");
  }

  callFunction(name: string, args: CppVal[], line: number): CppVal {
    const fn = this.prog.funcs[name];
    if (!fn) throw new RuntimeError(`Undefined function '${name}'`, line);
    if (this.frames.length > MAX_DEPTH) throw new RuntimeError("Stack overflow (recursion too deep).", line);
    const frame: Frame = { func: name, scopes: [new Map()] };
    this.frames.push(frame);
    fn.params.forEach((pm, i) => frame.scopes[0].set(pm.name, args[i] ? clone(args[i]) : defaultVal(pm.type.base)));
    let ret: CppVal = { t: "void" };
    try {
      for (const s of fn.body) this.exec(s);
    } catch (e) {
      if (e instanceof ReturnSignal) ret = e.v;
      else { this.frames.pop(); throw e; }
    }
    this.frames.pop();
    return ret;
  }

  exec(s: Stmt) {
    switch (s.k) {
      case "empty": return;
      case "block": { this.pushScope(); try { for (const x of s.body) this.exec(x); } finally { this.popScope(); } return; }
      case "varDecl": return this.execDecl(s);
      case "exprStmt": { this.evalExpr(s.e); this.snap(s.line, describe(s.e)); return; }
      case "cout": {
        let line = "";
        for (const part of s.parts) line += disp(this.evalExpr(part));
        this.out += line;
        this.snap(s.line, "Print to stdout");
        return;
      }
      case "cin": {
        for (const tgt of s.targets) {
          const raw = this.inputs[this.inputPos++];
          const cur = this.evalLValue(tgt);
          const old = cur.get();
          let nv: CppVal;
          if (old.t === "string") nv = { t: "string", v: raw ?? "" };
          else if (old.t === "char") nv = { t: "char", v: (raw ?? "")[0] ?? "\0" };
          else if (old.t === "double") nv = { t: "double", v: parseFloat(raw ?? "0") || 0 };
          else if (old.t === "bool") nv = { t: "bool", v: (raw ?? "") === "1" || raw === "true" };
          else nv = { t: "int", v: Math.trunc(parseFloat(raw ?? "0")) || 0 };
          cur.set(nv);
        }
        this.snap(s.line, "Read from input (cin)");
        return;
      }
      case "if": {
        this.snap(s.line, "Evaluate if-condition");
        if (bool(this.evalExpr(s.cond))) this.exec(s.then);
        else if (s.els) this.exec(s.els);
        return;
      }
      case "while": {
        while (true) {
          this.snap(s.line, "Check while-condition");
          if (!bool(this.evalExpr(s.cond))) break;
          try { this.exec(s.body); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case "doWhile": {
        while (true) {
          try { this.exec(s.body); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) { /* fallthrough to cond */ } else throw e; }
          this.snap(s.condLine, "Check do-while condition");
          if (!bool(this.evalExpr(s.cond))) break;
        }
        return;
      }
      case "for": {
        this.pushScope();
        try {
          if (s.init) this.exec(s.init);
          while (true) {
            this.snap(s.line, "Check for-condition");
            if (s.cond && !bool(this.evalExpr(s.cond))) break;
            try { this.exec(s.body); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) { /* go to post */ } else throw e; }
            if (s.post) this.evalExpr(s.post);
          }
        } finally { this.popScope(); }
        return;
      }
      case "switch": {
        const d = num(this.evalExpr(s.disc));
        let matched = false;
        try {
          for (const c of s.cases) {
            if (!matched) { if (c.test === undefined) matched = true; else if (num(this.evalExpr(c.test)) === d) matched = true; }
            if (matched) { this.snap(s.line, "switch case"); for (const st of c.body) this.exec(st); }
          }
        } catch (e) { if (!(e instanceof BreakSignal)) throw e; }
        return;
      }
      case "break": this.snap(s.line, "break"); throw new BreakSignal();
      case "continue": this.snap(s.line, "continue"); throw new ContinueSignal();
      case "return": { const v = s.e ? this.evalExpr(s.e) : { t: "void" } as CppVal; this.snap(s.line, "return"); throw new ReturnSignal(v); }
      case "funcDecl": return; // handled at top level
    }
  }

  execDecl(s: Extract<Stmt, { k: "varDecl" }>) {
    for (const d of s.decls) {
      let val: CppVal;
      if (s.type.isVector) {
        let arr: CppVal[] = [];
        if (d.init) {
          if (d.init.k === "initlist") arr = d.init.items.map((it) => this.evalExpr(it));
          else if (d.init.k === "call" && d.init.callee.k === "var" && d.init.callee.name === "__ctor__") {
            const n = num(this.evalExpr(d.init.args[0]));
            const fill = d.init.args[1] ? this.evalExpr(d.init.args[1]) : defaultVal(s.type.base);
            arr = Array.from({ length: n }, () => clone(fill));
          }
        }
        val = { t: "vector", el: s.type.base, v: arr };
      } else if (d.dims && d.dims.length) {
        val = this.makeArray(s.type.base, d.dims, 0, d.init);
      } else {
        val = d.init ? coerce(this.evalExpr(d.init), s.type) : defaultVal(s.type.base);
      }
      this.declare(d.name, val);
    }
    this.snap(s.line, `Declare ${s.decls.map((d) => d.name).join(", ")}`);
  }

  makeArray(base: string, dims: Expr[], depth: number, init?: Expr): CppVal {
    const n = num(this.evalExpr(dims[depth]));
    if (depth === dims.length - 1) {
      let v: CppVal[] = Array.from({ length: n }, () => defaultVal(base));
      if (init && init.k === "initlist") init.items.forEach((it, i) => { if (i < n) v[i] = this.evalExpr(it); });
      return { t: "array", el: base, v };
    }
    const v = Array.from({ length: n }, () => this.makeArray(base, dims, depth + 1));
    return { t: "array", el: base, v };
  }

  // ---- lvalue resolution (for assignment, ++/--, cin) ----
  evalLValue(e: Expr): { get: () => CppVal; set: (v: CppVal) => void } {
    if (e.k === "var") {
      const name = e.name;
      return { get: () => this.getVar(name, e.line), set: (v) => this.setVar(name, v, e.line) };
    }
    if (e.k === "index") {
      const container = this.evalExpr(e.obj);
      const idx = num(this.evalExpr(e.idx));
      if (container.t === "string") {
        const obj = e.obj;
        return {
          get: () => ({ t: "char", v: container.v[idx] ?? "\0" }),
          set: (v) => { const s = this.evalExpr(obj); if (s.t === "string") { const arr = s.v.split(""); arr[idx] = disp(v)[0] ?? "\0"; const ns = arr.join(""); this.assignBack(obj, { t: "string", v: ns }); } },
        };
      }
      if (container.t !== "array" && container.t !== "vector") throw new RuntimeError("Indexing a non-array value", e.line);
      if (idx < 0 || idx >= container.v.length) throw new RuntimeError(`Array index ${idx} out of bounds (size ${container.v.length})`, e.line);
      return { get: () => container.v[idx], set: (v) => { container.v[idx] = coerceEl(v, container.el); } };
    }
    throw new RuntimeError("Invalid assignment target", e.line);
  }

  assignBack(target: Expr, v: CppVal) {
    if (target.k === "var") this.setVar(target.name, v, target.line);
    else this.evalLValue(target).set(v);
  }

  // ---- expression evaluation ----
  evalExpr(e: Expr): CppVal {
    switch (e.k) {
      case "num": return Number.isInteger(e.v) ? { t: "int", v: e.v } : { t: "double", v: e.v };
      case "str": return { t: "string", v: e.v };
      case "char": return { t: "char", v: e.v };
      case "bool": return { t: "bool", v: e.v };
      case "var": if (e.name === "endl") return { t: "string", v: "\n" }; return this.getVar(e.name, e.line);
      case "index": return this.evalLValue(e).get();
      case "initlist": return { t: "array", el: "auto", v: e.items.map((x) => this.evalExpr(x)) };
      case "comma": { let last: CppVal = { t: "void" }; for (const it of e.items) last = this.evalExpr(it); return last; }
      case "ternary": return bool(this.evalExpr(e.cond)) ? this.evalExpr(e.then) : this.evalExpr(e.els);
      case "assign": return this.evalAssign(e);
      case "un": return this.evalUnary(e);
      case "bin": return this.evalBinary(e);
      case "member": return this.evalMember(e, []);
      case "call": return this.evalCall(e);
    }
  }

  evalAssign(e: Extract<Expr, { k: "assign" }>): CppVal {
    const lv = this.evalLValue(e.target);
    let rhs = this.evalExpr(e.value);
    if (e.op !== "=") {
      const cur = lv.get();
      const op = e.op.slice(0, -1);
      rhs = applyBin(op, cur, rhs, e.line);
    }
    // keep target's type flavor for ints
    const cur = lv.get();
    if ((cur.t === "int") && (rhs.t === "double")) rhs = { t: "int", v: Math.trunc(rhs.v) };
    else if (cur.t === "double" && (rhs.t === "int")) rhs = { t: "double", v: rhs.v };
    lv.set(rhs);
    return rhs;
  }

  evalUnary(e: Extract<Expr, { k: "un" }>): CppVal {
    if (e.op === "++" || e.op === "--") {
      const lv = this.evalLValue(e.e);
      const old = lv.get();
      const delta = e.op === "++" ? 1 : -1;
      const nv = old.t === "double" ? { t: "double" as const, v: old.v + delta } : { t: "int" as const, v: num(old) + delta };
      lv.set(nv);
      return e.prefix ? nv : old;
    }
    const v = this.evalExpr(e.e);
    if (e.op === "-") return v.t === "double" ? { t: "double", v: -v.v } : { t: "int", v: -num(v) };
    if (e.op === "+") return v;
    if (e.op === "!") return { t: "bool", v: !bool(v) };
    if (e.op === "~") return { t: "int", v: ~num(v) };
    return v;
  }

  evalBinary(e: Extract<Expr, { k: "bin" }>): CppVal {
    if (e.op === "&&") return { t: "bool", v: bool(this.evalExpr(e.a)) && bool(this.evalExpr(e.b)) };
    if (e.op === "||") return { t: "bool", v: bool(this.evalExpr(e.a)) || bool(this.evalExpr(e.b)) };
    return applyBin(e.op, this.evalExpr(e.a), this.evalExpr(e.b), e.line);
  }

  // member call like v.push_back(x), s.length(), s.substr(...)
  evalMember(e: Extract<Expr, { k: "member" }>, _args: CppVal[]): CppVal {
    // bare member access without call — return a marker resolved by call
    const obj = this.evalExpr(e.obj);
    return obj; // size() etc handled in evalCall
  }

  evalCall(e: Extract<Expr, { k: "call" }>): CppVal {
    // method call: obj.method(args)
    if (e.callee.k === "member") {
      const m = e.callee;
      const args = e.args.map((a) => this.evalExpr(a));
      return this.callMethod(m.obj, m.prop, args, e.line);
    }
    // free function
    if (e.callee.k === "var") {
      const name = e.callee.name;
      const args = e.args.map((a) => this.evalExpr(a));
      const builtin = this.callBuiltin(name, e.args, args, e.line);
      if (builtin !== undefined) return builtin;
      if (this.prog.funcs[name]) {
        const r = this.callFunction(name, args, e.line);
        this.snap(e.line, `Returned from ${name}()`);
        return r;
      }
      throw new RuntimeError(`Undefined function '${name}'`, e.line);
    }
    throw new RuntimeError("Invalid function call", e.line);
  }

  callMethod(objExpr: Expr, method: string, args: CppVal[], line: number): CppVal {
    const obj = this.evalExpr(objExpr);
    // vector / array methods
    if (obj.t === "vector" || obj.t === "array") {
      const arr = obj.v;
      switch (method) {
        case "push_back": arr.push(coerceEl(args[0], obj.el)); return { t: "void" };
        case "pop_back": arr.pop(); return { t: "void" };
        case "size": return { t: "int", v: arr.length };
        case "empty": return { t: "bool", v: arr.length === 0 };
        case "clear": arr.length = 0; return { t: "void" };
        case "front": return arr[0] ?? defaultVal(obj.el);
        case "back": return arr[arr.length - 1] ?? defaultVal(obj.el);
        case "resize": { const n = num(args[0]); while (arr.length < n) arr.push(defaultVal(obj.el)); arr.length = n; return { t: "void" }; }
        case "begin": case "end": return { t: "int", v: method === "begin" ? 0 : arr.length };
      }
    }
    if (obj.t === "string") {
      const s = obj.v;
      switch (method) {
        case "length": case "size": return { t: "int", v: s.length };
        case "empty": return { t: "bool", v: s.length === 0 };
        case "substr": { const start = num(args[0]); const len = args[1] !== undefined ? num(args[1]) : undefined; return { t: "string", v: len === undefined ? s.slice(start) : s.substr(start, len) }; }
        case "find": { const idx = s.indexOf(disp(args[0])); return { t: "int", v: idx }; }
        case "append": { const nv = s + disp(args[0]); this.assignBack(objExpr, { t: "string", v: nv }); return { t: "string", v: nv }; }
        case "push_back": { const nv = s + disp(args[0]); this.assignBack(objExpr, { t: "string", v: nv }); return { t: "void" }; }
        case "insert": { const pos = num(args[0]); const nv = s.slice(0, pos) + disp(args[1]) + s.slice(pos); this.assignBack(objExpr, { t: "string", v: nv }); return { t: "void" }; }
        case "erase": { const pos = num(args[0]); const len = args[1] !== undefined ? num(args[1]) : s.length - pos; const nv = s.slice(0, pos) + s.slice(pos + len); this.assignBack(objExpr, { t: "string", v: nv }); return { t: "void" }; }
        case "at": return { t: "char", v: s[num(args[0])] ?? "\0" };
        case "c_str": return { t: "string", v: s };
      }
    }
    throw new RuntimeError(`Unknown method '${method}'`, line);
  }

  // builtins: returns undefined if not a builtin
  callBuiltin(name: string, argExprs: Expr[], args: CppVal[], line: number): CppVal | undefined {
    const f = Math;
    switch (name) {
      case "abs": case "fabs": return { t: args[0]?.t === "double" ? "double" : "int", v: Math.abs(num(args[0])) } as CppVal;
      case "sqrt": return { t: "double", v: Math.sqrt(num(args[0])) };
      case "pow": return { t: "double", v: Math.pow(num(args[0]), num(args[1])) };
      case "floor": return { t: "int", v: Math.floor(num(args[0])) };
      case "ceil": return { t: "int", v: Math.ceil(num(args[0])) };
      case "round": return { t: "int", v: Math.round(num(args[0])) };
      case "log": return { t: "double", v: Math.log(num(args[0])) };
      case "log2": return { t: "double", v: Math.log2(num(args[0])) };
      case "sin": return { t: "double", v: f.sin(num(args[0])) };
      case "cos": return { t: "double", v: f.cos(num(args[0])) };
      case "min": return pickMinMax(args, true);
      case "max": return pickMinMax(args, false);
      case "gcd": { let a = Math.abs(num(args[0])), b = Math.abs(num(args[1])); while (b) { [a, b] = [b, a % b]; } return { t: "int", v: a }; }
      case "swap": { this.builtinSwap(argExprs[0], argExprs[1]); return { t: "void" }; }
      case "sort": { this.builtinSort(argExprs[0], false); return { t: "void" }; }
      case "reverse": { this.builtinReverse(argExprs[0]); return { t: "void" }; }
      case "to_string": return { t: "string", v: disp(args[0]) };
      case "stoi": return { t: "int", v: Math.trunc(parseFloat(disp(args[0]))) || 0 };
      case "stod": return { t: "double", v: parseFloat(disp(args[0])) || 0 };
      case "__ctor__": return undefined;
      case "endl": return { t: "string", v: "\n" };
    }
    return undefined;
  }

  builtinSwap(a: Expr, b: Expr) {
    const la = this.evalLValue(a), lb = this.evalLValue(b);
    const va = clone(la.get()), vb = clone(lb.get());
    la.set(vb); lb.set(va);
  }
  builtinSort(arrExpr: Expr, _desc: boolean) {
    const v = this.evalExpr(arrExpr);
    if (v.t !== "vector" && v.t !== "array") throw new RuntimeError("sort() expects a vector/array", arrExpr.line);
    v.v.sort((x, y) => num(x) - num(y) || disp(x).localeCompare(disp(y)));
  }
  builtinReverse(arrExpr: Expr) {
    const v = this.evalExpr(arrExpr);
    if (v.t !== "vector" && v.t !== "array") throw new RuntimeError("reverse() expects a vector/array", arrExpr.line);
    v.v.reverse();
  }
}

// ---- helpers ----
function pickMinMax(args: CppVal[], min: boolean): CppVal {
  // min(a,b) or min({...}) or min(vector)
  let vals: CppVal[] = args;
  if (args.length === 1 && (args[0].t === "vector" || args[0].t === "array")) vals = args[0].v;
  let best = vals[0];
  for (const x of vals) { if (min ? num(x) < num(best) : num(x) > num(best)) best = x; }
  return best;
}

function coerce(v: CppVal, type: VarType): CppVal {
  if (type.base === "int" || type.base === "long" || type.base === "short") return { t: "int", v: Math.trunc(num(v)) };
  if (type.base === "double" || type.base === "float") return { t: "double", v: num(v) };
  if (type.base === "bool") return { t: "bool", v: bool(v) };
  if (type.base === "char") return v.t === "char" ? v : { t: "char", v: String.fromCharCode(num(v)) };
  if (type.base === "string") return { t: "string", v: disp(v) };
  return v;
}
function coerceEl(v: CppVal, el: string): CppVal {
  if (el === "int" || el === "long" || el === "short") return { t: "int", v: Math.trunc(num(v)) };
  if (el === "double" || el === "float") return { t: "double", v: num(v) };
  if (el === "bool") return { t: "bool", v: bool(v) };
  if (el === "char") return v.t === "char" ? v : { t: "char", v: disp(v)[0] ?? "\0" };
  if (el === "string") return { t: "string", v: disp(v) };
  return v;
}

function applyBin(op: string, a: CppVal, b: CppVal, line: number): CppVal {
  // string concat
  if (op === "+" && (a.t === "string" || b.t === "string")) return { t: "string", v: disp(a) + disp(b) };
  if (a.t === "string" || b.t === "string") {
    const sa = disp(a), sb = disp(b);
    switch (op) {
      case "==": return { t: "bool", v: sa === sb };
      case "!=": return { t: "bool", v: sa !== sb };
      case "<": return { t: "bool", v: sa < sb };
      case ">": return { t: "bool", v: sa > sb };
      case "<=": return { t: "bool", v: sa <= sb };
      case ">=": return { t: "bool", v: sa >= sb };
    }
  }
  const x = num(a), y = num(b);
  const dbl = a.t === "double" || b.t === "double";
  const N = (n: number): CppVal => (dbl ? { t: "double", v: n } : { t: "int", v: Math.trunc(n) });
  switch (op) {
    case "+": return N(x + y);
    case "-": return N(x - y);
    case "*": return N(x * y);
    case "/": if (y === 0) throw new RuntimeError("Division by zero", line); return dbl ? { t: "double", v: x / y } : { t: "int", v: Math.trunc(x / y) };
    case "%": if (y === 0) throw new RuntimeError("Modulo by zero", line); return { t: "int", v: Math.trunc(x) % Math.trunc(y) };
    case "==": return { t: "bool", v: x === y };
    case "!=": return { t: "bool", v: x !== y };
    case "<": return { t: "bool", v: x < y };
    case ">": return { t: "bool", v: x > y };
    case "<=": return { t: "bool", v: x <= y };
    case ">=": return { t: "bool", v: x >= y };
    case "&": return { t: "int", v: x & y };
    case "|": return { t: "int", v: x | y };
    case "^": return { t: "int", v: x ^ y };
    case "<<": return { t: "int", v: x << y };
    case ">>": return { t: "int", v: x >> y };
  }
  throw new RuntimeError(`Unknown operator '${op}'`, line);
}

function describe(e: Expr): string {
  if (e.k === "assign") return `Assign ${e.target.k === "var" ? e.target.name : "value"}`;
  if (e.k === "un" && (e.op === "++" || e.op === "--")) return `${e.op} ${e.e.k === "var" ? e.e.name : ""}`.trim();
  if (e.k === "call" && e.callee.k === "var") return `Call ${e.callee.name}()`;
  if (e.k === "call" && e.callee.k === "member") return `Call .${e.callee.prop}()`;
  return "Evaluate expression";
}

export function runCpp(src: string, input: string): RunResult {
  let prog: Program;
  try { prog = parse(src); }
  catch (e) { const err = e as CompileError; return { steps: [], error: `Compile error${err.line ? ` (line ${err.line})` : ""}: ${err.message}` }; }
  const interp = new Interpreter(prog, input);
  try { interp.run(); return { steps: interp.steps }; }
  catch (e) {
    const err = e as RuntimeError;
    interp.steps.push({ line: err.line ?? -1, output: interp.out, note: "Runtime error", stack: [] });
    return { steps: interp.steps, error: `Runtime error${err.line ? ` (line ${err.line})` : ""}: ${err.message}` };
  }
}
