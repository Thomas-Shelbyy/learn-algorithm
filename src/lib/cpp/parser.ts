import { lex, type Tok } from "./lexer";
import type { Expr, Program, Stmt, TypeName, VarType } from "./ast";

export class CompileError extends Error {
  line: number;
  constructor(msg: string, line: number) { super(msg); this.line = line; }
}

const TYPE_WORDS = new Set(["int", "long", "short", "float", "double", "bool", "char", "string", "void", "auto", "unsigned"]);

export class Parser {
  toks: Tok[]; p = 0;
  constructor(src: string) { this.toks = lex(src); }

  peek(o = 0) { return this.toks[this.p + o]; }
  next() { return this.toks[this.p++]; }
  at(v: string) { return this.toks[this.p]?.v === v; }
  atType() { return TYPE_WORDS.has(this.toks[this.p]?.v) || this.at("const") || this.at("vector"); }
  eat(v: string) { const t = this.toks[this.p]; if (t.v !== v) throw new CompileError(`Expected '${v}' but found '${t.v || "end of file"}'`, t.line); this.p++; return t; }
  line() { return this.toks[this.p]?.line ?? 0; }

  parse(): Program {
    const funcs: Program["funcs"] = {};
    const globals: Stmt[] = [];
    // skip 'using namespace std;' etc
    while (!this.at("")) {
      if (this.peek().t === "eof") break;
      if (this.at("using")) { while (!this.at(";") && this.peek().t !== "eof") this.next(); if (this.at(";")) this.next(); continue; }
      // function or global decl?
      const save = this.p;
      const fn = this.tryParseFunction();
      if (fn) { funcs[fn.name] = fn; continue; }
      this.p = save;
      // global statement
      if (this.peek().t === "eof") break;
      globals.push(this.parseStmt());
    }
    if (!funcs["main"]) throw new CompileError("No 'int main()' function found.", 0);
    return { funcs, globals };
  }

  // returns funcDecl if the upcoming tokens look like a function definition
  tryParseFunction(): Extract<Stmt, { k: "funcDecl" }> | null {
    const start = this.p;
    if (!this.atType()) return null;
    const ret = this.parseType();
    if (this.peek().t !== "id") { this.p = start; return null; }
    const name = this.peek().v;
    if (this.peek(1)?.v !== "(") { this.p = start; return null; }
    this.next(); // name
    this.eat("(");
    const params: { type: VarType; name: string }[] = [];
    if (!this.at(")")) {
      do {
        const ptype = this.parseType();
        const pname = this.next().v;
        // array param like int a[]
        if (this.at("[")) { this.eat("["); if (!this.at("]")) this.parseExpr(); this.eat("]"); ptype.isVector = true; }
        params.push({ type: ptype, name: pname });
      } while (this.at(",") && this.eat(","));
    }
    this.eat(")");
    if (!this.at("{")) { this.p = start; return null; }
    const line = this.line();
    const body = this.parseBlockBody();
    return { k: "funcDecl", name, ret, params, body, line };
  }

  parseType(): VarType {
    let isConst = false;
    if (this.at("const")) { this.next(); isConst = true; }
    if (this.at("unsigned")) this.next();
    if (this.at("vector")) {
      this.next(); this.eat("<"); const inner = this.parseType(); this.eat(">");
      return { base: inner.base, isVector: true, isConst };
    }
    let base = this.next().v as TypeName;
    if (base === ("long" as TypeName) && this.at("long")) this.next();
    const t: VarType = { base, isConst };
    return t;
  }

  parseBlockBody(): Stmt[] {
    this.eat("{");
    const body: Stmt[] = [];
    while (!this.at("}") && this.peek().t !== "eof") body.push(this.parseStmt());
    this.eat("}");
    return body;
  }

  parseStmt(): Stmt {
    const v = this.peek().v;
    const line = this.line();
    if (v === "{") return { k: "block", body: this.parseBlockBody(), line };
    if (v === ";") { this.next(); return { k: "empty", line }; }
    if (v === "if") return this.parseIf();
    if (v === "for") return this.parseFor();
    if (v === "while") return this.parseWhile();
    if (v === "do") return this.parseDoWhile();
    if (v === "switch") return this.parseSwitch();
    if (v === "break") { this.next(); this.semi(); return { k: "break", line }; }
    if (v === "continue") { this.next(); this.semi(); return { k: "continue", line }; }
    if (v === "return") { this.next(); let e: Expr | undefined; if (!this.at(";")) e = this.parseExpr(); this.semi(); return { k: "return", e, line }; }
    if (v === "cout") return this.parseCout();
    if (v === "cin") return this.parseCin();
    // declaration?
    if (this.atType() && this.looksLikeDecl()) return this.parseVarDecl();
    // expression statement
    const e = this.parseExpr();
    this.semi();
    return { k: "exprStmt", e, line };
  }

  looksLikeDecl(): boolean {
    // type followed by identifier
    const save = this.p;
    try {
      if (this.at("const")) this.next();
      if (this.at("unsigned")) this.next();
      if (this.at("vector")) { this.p = save; return true; }
      if (!TYPE_WORDS.has(this.peek().v)) { this.p = save; return false; }
      this.next();
      const ok = this.peek().t === "id";
      this.p = save;
      return ok;
    } catch { this.p = save; return false; }
  }

  parseVarDecl(): Stmt {
    const line = this.line();
    const type = this.parseType();
    const decls: { name: string; init?: Expr; dims?: Expr[] }[] = [];
    do {
      const name = this.next().v;
      const dims: Expr[] = [];
      while (this.at("[")) { this.eat("["); dims.push(this.at("]") ? { k: "num", v: 0, line } : this.parseExpr()); this.eat("]"); }
      let init: Expr | undefined;
      if (this.at("=")) { this.next(); init = this.parseAssignRHS(); }
      else if (this.at("(")) { // constructor-style vector<int> v(n)
        this.eat("("); const args: Expr[] = []; if (!this.at(")")) { do { args.push(this.parseExpr()); } while (this.at(",") && this.eat(",")); } this.eat(")");
        init = { k: "call", callee: { k: "var", name: "__ctor__", line }, args, line };
      }
      decls.push({ name, init, dims: dims.length ? dims : undefined });
    } while (this.at(",") && this.eat(","));
    this.semi();
    return { k: "varDecl", type, decls, line };
  }

  parseAssignRHS(): Expr {
    if (this.at("{")) return this.parseInitList();
    return this.parseAssign();
  }
  parseInitList(): Expr {
    const line = this.line();
    this.eat("{"); const items: Expr[] = [];
    if (!this.at("}")) { do { items.push(this.at("{") ? this.parseInitList() : this.parseExpr()); } while (this.at(",") && this.eat(",")); }
    this.eat("}");
    return { k: "initlist", items, line };
  }

  parseIf(): Stmt {
    const line = this.line();
    this.eat("if"); this.eat("("); const cond = this.parseExpr(); this.eat(")");
    const then = this.parseStmt();
    let els: Stmt | undefined;
    if (this.at("else")) { this.next(); els = this.parseStmt(); }
    return { k: "if", cond, then, els, line };
  }
  parseWhile(): Stmt {
    const line = this.line();
    this.eat("while"); this.eat("("); const cond = this.parseExpr(); this.eat(")");
    return { k: "while", cond, body: this.parseStmt(), line };
  }
  parseDoWhile(): Stmt {
    const line = this.line();
    this.eat("do"); const body = this.parseStmt(); this.eat("while"); this.eat("(");
    const condLine = this.line(); const cond = this.parseExpr(); this.eat(")"); this.semi();
    return { k: "doWhile", cond, body, line, condLine };
  }
  parseFor(): Stmt {
    const line = this.line();
    this.eat("for"); this.eat("(");
    let init: Stmt | undefined;
    if (this.at(";")) { this.next(); }
    else if (this.atType() && this.looksLikeDecl()) init = this.parseVarDecl();
    else { const e = this.parseExpr(); this.semi(); init = { k: "exprStmt", e, line }; }
    let cond: Expr | undefined;
    if (!this.at(";")) cond = this.parseExpr();
    this.eat(";");
    let post: Expr | undefined;
    if (!this.at(")")) post = this.parseExpr();
    this.eat(")");
    return { k: "for", init, cond, post, body: this.parseStmt(), line };
  }
  parseSwitch(): Stmt {
    const line = this.line();
    this.eat("switch"); this.eat("("); const disc = this.parseExpr(); this.eat(")"); this.eat("{");
    const cases: { test?: Expr; body: Stmt[] }[] = [];
    while (!this.at("}") && this.peek().t !== "eof") {
      let test: Expr | undefined;
      if (this.at("case")) { this.next(); test = this.parseExpr(); this.eat(":"); }
      else if (this.at("default")) { this.next(); this.eat(":"); }
      else throw new CompileError(`Expected 'case' or 'default' in switch`, this.line());
      const body: Stmt[] = [];
      while (!this.at("case") && !this.at("default") && !this.at("}") && this.peek().t !== "eof") body.push(this.parseStmt());
      cases.push({ test, body });
    }
    this.eat("}");
    return { k: "switch", disc, cases, line };
  }
  parseCout(): Stmt {
    const line = this.line();
    this.eat("cout"); const parts: Expr[] = [];
    while (this.at("<<")) { this.eat("<<"); parts.push(this.parseAdd()); }
    this.semi();
    return { k: "cout", parts, line };
  }
  parseCin(): Stmt {
    const line = this.line();
    this.eat("cin"); const targets: Expr[] = [];
    while (this.at(">>")) { this.eat(">>"); targets.push(this.parseUnary()); }
    this.semi();
    return { k: "cin", targets, line };
  }
  semi() { if (this.at(";")) this.next(); else throw new CompileError(`Missing ';'`, this.line()); }

  // ---- Expression precedence ----
  parseExpr(): Expr {
    let e = this.parseAssign();
    if (this.at(",")) {
      const items = [e];
      while (this.at(",")) { this.next(); items.push(this.parseAssign()); }
      return { k: "comma", items, line: e.line };
    }
    return e;
  }
  parseAssign(): Expr {
    const left = this.parseTernaryLevel();
    if (["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>="].includes(this.peek().v)) {
      const op = this.next().v;
      const value = this.parseAssign();
      return { k: "assign", op, target: left, value, line: left.line };
    }
    return left;
  }
  parseTernaryLevel(): Expr {
    const cond = this.parseOr();
    if (this.at("?")) { this.next(); const then = this.parseAssign(); this.eat(":"); const els = this.parseAssign(); return { k: "ternary", cond, then, els, line: cond.line }; }
    return cond;
  }
  parseOr(): Expr { let a = this.parseAnd(); while (this.at("||")) { const line = a.line; this.next(); a = { k: "bin", op: "||", a, b: this.parseAnd(), line }; } return a; }
  parseAnd(): Expr { let a = this.parseBitOr(); while (this.at("&&")) { const line = a.line; this.next(); a = { k: "bin", op: "&&", a, b: this.parseBitOr(), line }; } return a; }
  parseBitOr(): Expr { let a = this.parseBitXor(); while (this.at("|")) { const line = a.line; this.next(); a = { k: "bin", op: "|", a, b: this.parseBitXor(), line }; } return a; }
  parseBitXor(): Expr { let a = this.parseBitAnd(); while (this.at("^")) { const line = a.line; this.next(); a = { k: "bin", op: "^", a, b: this.parseBitAnd(), line }; } return a; }
  parseBitAnd(): Expr { let a = this.parseEq(); while (this.at("&")) { const line = a.line; this.next(); a = { k: "bin", op: "&", a, b: this.parseEq(), line }; } return a; }
  parseEq(): Expr { let a = this.parseRel(); while (this.at("==") || this.at("!=")) { const line = a.line; const op = this.next().v; a = { k: "bin", op, a, b: this.parseRel(), line }; } return a; }
  parseRel(): Expr { let a = this.parseShift(); while (this.at("<") || this.at(">") || this.at("<=") || this.at(">=")) { const line = a.line; const op = this.next().v; a = { k: "bin", op, a, b: this.parseShift(), line }; } return a; }
  parseShift(): Expr { let a = this.parseAdd(); while (this.at("<<") || this.at(">>")) { const line = a.line; const op = this.next().v; a = { k: "bin", op, a, b: this.parseAdd(), line }; } return a; }
  parseAdd(): Expr { let a = this.parseMul(); while (this.at("+") || this.at("-")) { const line = a.line; const op = this.next().v; a = { k: "bin", op, a, b: this.parseMul(), line }; } return a; }
  parseMul(): Expr { let a = this.parseUnary(); while (this.at("*") || this.at("/") || this.at("%")) { const line = a.line; const op = this.next().v; a = { k: "bin", op, a, b: this.parseUnary(), line }; } return a; }
  parseUnary(): Expr {
    const line = this.line();
    if (this.at("!") || this.at("-") || this.at("+") || this.at("~")) { const op = this.next().v; return { k: "un", op, e: this.parseUnary(), prefix: true, line }; }
    if (this.at("++") || this.at("--")) { const op = this.next().v; return { k: "un", op, e: this.parseUnary(), prefix: true, line }; }
    return this.parsePostfix();
  }
  parsePostfix(): Expr {
    let e = this.parsePrimary();
    for (;;) {
      const line = this.line();
      if (this.at("[")) { this.next(); const idx = this.parseExpr(); this.eat("]"); e = { k: "index", obj: e, idx, line }; }
      else if (this.at(".") || this.at("->")) { this.next(); const prop = this.next().v; e = { k: "member", obj: e, prop, line }; }
      else if (this.at("(")) { this.next(); const args: Expr[] = []; if (!this.at(")")) { do { args.push(this.parseAssign()); } while (this.at(",") && this.eat(",")); } this.eat(")"); e = { k: "call", callee: e, args, line }; }
      else if (this.at("++") || this.at("--")) { const op = this.next().v; e = { k: "un", op, e, prefix: false, line }; }
      else break;
    }
    return e;
  }
  parsePrimary(): Expr {
    const t = this.peek();
    const line = t.line;
    if (t.v === "(") { this.next(); const e = this.parseExpr(); this.eat(")"); return e; }
    if (t.t === "num") { this.next(); return { k: "num", v: parseFloat(t.v), line }; }
    if (t.t === "str") { this.next(); return { k: "str", v: t.v, line }; }
    if (t.t === "char") { this.next(); return { k: "char", v: t.v, line }; }
    if (t.v === "true") { this.next(); return { k: "bool", v: true, line }; }
    if (t.v === "false") { this.next(); return { k: "bool", v: false, line }; }
    if (t.v === "{") return this.parseInitList();
    if (t.t === "id") {
      this.next();
      // qualified name std::sort -> sort
      let name = t.v;
      while (this.at("::")) { this.next(); name = this.next().v; }
      return { k: "var", name, line };
    }
    throw new CompileError(`Unexpected token '${t.v || "end of file"}'`, line);
  }
}

export function parse(src: string): Program { return new Parser(src).parse(); }
