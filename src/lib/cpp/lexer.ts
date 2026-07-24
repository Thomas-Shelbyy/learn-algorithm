// Lexer for the teaching C++ subset.
export type TokType = "num" | "str" | "char" | "id" | "op" | "eof";
export interface Tok { t: TokType; v: string; line: number; col: number; }

const KEYWORDS = new Set([
  "int", "long", "short", "float", "double", "bool", "char", "string", "void", "auto", "unsigned", "const",
  "if", "else", "for", "while", "do", "switch", "case", "default", "break", "continue", "return",
  "true", "false", "struct", "class", "enum", "public", "private", "protected",
  "new", "delete", "using", "namespace", "vector", "pair", "sizeof",
]);

const THREE = ["<<=", ">>=", "..."];
const TWO = ["==", "!=", "<=", ">=", "&&", "||", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "++", "--", "<<", ">>", "->", "::"];

export function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0, line = 1, col = 1;
  const push = (t: TokType, v: string, c: number) => out.push({ t, v, line, col: c });
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\n") { line++; col = 1; i++; continue; }
    if (ch === " " || ch === "\t" || ch === "\r") { i++; col++; continue; }
    // preprocessor / include line — skip to EOL
    if (ch === "#") { while (i < src.length && src[i] !== "\n") i++; continue; }
    // comments
    if (ch === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (ch === "/" && src[i + 1] === "*") { i += 2; col += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") { line++; col = 1; } i++; } i += 2; continue; }
    // string
    if (ch === '"') {
      const c0 = col; let s = ""; i++; col++;
      while (i < src.length && src[i] !== '"') { if (src[i] === "\\") { s += esc(src[i + 1]); i += 2; col += 2; } else { s += src[i++]; col++; } }
      i++; col++; push("str", s, c0); continue;
    }
    // char literal
    if (ch === "'") {
      const c0 = col; let s = ""; i++; col++;
      while (i < src.length && src[i] !== "'") { if (src[i] === "\\") { s += esc(src[i + 1]); i += 2; col += 2; } else { s += src[i++]; col++; } }
      i++; col++; push("char", s, c0); continue;
    }
    // number
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const c0 = col; let n = "";
      while (i < src.length && /[0-9.eExXa-fA-F]/.test(src[i])) { n += src[i++]; col++; }
      push("num", n, c0); continue;
    }
    // identifier / keyword
    if (/[A-Za-z_]/.test(ch)) {
      const c0 = col; let id = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) { id += src[i++]; col++; }
      push("id", id, c0); continue;
    }
    // operators
    const three = src.slice(i, i + 3);
    if (THREE.includes(three)) { push("op", three, col); i += 3; col += 3; continue; }
    const two = src.slice(i, i + 2);
    if (TWO.includes(two)) { push("op", two, col); i += 2; col += 2; continue; }
    push("op", ch, col); i++; col++;
  }
  out.push({ t: "eof", v: "", line, col });
  return out;
}

export function isKeyword(v: string) { return KEYWORDS.has(v); }
function esc(c: string): string { return c === "n" ? "\n" : c === "t" ? "\t" : c === "0" ? "\0" : c === "\\" ? "\\" : c === "'" ? "'" : c === '"' ? '"' : c ?? ""; }
