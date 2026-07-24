// Runtime value model.
export type CppVal =
  | { t: "int"; v: number }
  | { t: "double"; v: number }
  | { t: "bool"; v: boolean }
  | { t: "char"; v: string }
  | { t: "string"; v: string }
  | { t: "array"; el: string; v: CppVal[] }   // fixed-size array (also used for vector)
  | { t: "vector"; el: string; v: CppVal[] }
  | { t: "void" };

export function isNum(x: CppVal): x is Extract<CppVal, { t: "int" | "double" }> { return x.t === "int" || x.t === "double"; }

export function num(x: CppVal): number {
  if (x.t === "int" || x.t === "double") return x.v;
  if (x.t === "bool") return x.v ? 1 : 0;
  if (x.t === "char") return x.v.charCodeAt(0) || 0;
  return 0;
}
export function bool(x: CppVal): boolean {
  if (x.t === "bool") return x.v;
  if (x.t === "int" || x.t === "double") return x.v !== 0;
  if (x.t === "char") return (x.v.charCodeAt(0) || 0) !== 0;
  if (x.t === "string") return x.v.length > 0;
  return false;
}
export function disp(x: CppVal): string {
  switch (x.t) {
    case "int": return String(Math.trunc(x.v));
    case "double": return Number.isInteger(x.v) ? String(x.v) : String(+x.v.toFixed(6));
    case "bool": return x.v ? "1" : "0";
    case "char": return x.v;
    case "string": return x.v;
    case "array": case "vector": return "[" + x.v.map(disp).join(", ") + "]";
    default: return "";
  }
}
export function defaultVal(base: string): CppVal {
  if (base === "double" || base === "float") return { t: "double", v: 0 };
  if (base === "bool") return { t: "bool", v: false };
  if (base === "char") return { t: "char", v: "\0" };
  if (base === "string") return { t: "string", v: "" };
  return { t: "int", v: 0 };
}
export function makeNum(base: string, n: number): CppVal {
  if (base === "double" || base === "float") return { t: "double", v: n };
  return { t: "int", v: Math.trunc(n) };
}
export function clone(x: CppVal): CppVal {
  if (x.t === "array" || x.t === "vector") return { ...x, v: x.v.map(clone) };
  return { ...x };
}
