// Lightweight C++ syntax highlighter.
// SSR-safe (pure string -> token array, no DOM access), zero dependencies.
// Designed for AlgoViz code panels: tokenises a single line and returns
// span descriptors that the renderer turns into <span> elements.

export type CppTokenKind =
  | "keyword"
  | "type"
  | "stl"
  | "preproc"
  | "string"
  | "char"
  | "comment"
  | "number"
  | "operator"
  | "punct"
  | "func"
  | "ident"
  | "ws";

export interface CppToken {
  kind: CppTokenKind;
  text: string;
}

const KEYWORDS = new Set([
  "alignas","alignof","and","auto","break","case","catch","class","co_await",
  "co_return","co_yield","concept","const","consteval","constexpr","constinit",
  "const_cast","continue","decltype","default","delete","do","dynamic_cast",
  "else","enum","explicit","export","extern","false","for","friend","goto",
  "if","inline","mutable","namespace","new","noexcept","not","nullptr",
  "operator","or","private","protected","public","register","reinterpret_cast",
  "requires","return","sizeof","static","static_assert","static_cast","struct",
  "switch","template","this","thread_local","throw","true","try","typedef",
  "typeid","typename","union","using","virtual","volatile","while","xor",
]);

const TYPES = new Set([
  "bool","char","char8_t","char16_t","char32_t","double","float","int","long",
  "short","signed","unsigned","void","wchar_t","size_t","ssize_t","int8_t",
  "int16_t","int32_t","int64_t","uint8_t","uint16_t","uint32_t","uint64_t",
]);

// STL containers / common stdlib identifiers — coloured separately so reading
// container-heavy code (vector<int>, unordered_map, etc.) feels natural.
const STL = new Set([
  "vector","string","array","deque","list","forward_list","map","unordered_map",
  "set","unordered_set","multimap","multiset","unordered_multimap","unordered_multiset",
  "stack","queue","priority_queue","pair","tuple","bitset","optional","variant",
  "shared_ptr","unique_ptr","weak_ptr","function","initializer_list","span",
  "string_view","numeric_limits","iterator","reverse_iterator",
  "cout","cin","cerr","endl","ostream","istream","stringstream","ofstream","ifstream",
  "std","swap","sort","stable_sort","reverse","min","max","abs","gcd","lcm","iota",
  "accumulate","find","find_if","count","count_if","lower_bound","upper_bound",
  "binary_search","next_permutation","prev_permutation","unique","copy","fill",
  "make_pair","make_tuple","push_back","pop_back","push_front","pop_front",
  "emplace","emplace_back","push","pop","top","front","back","empty","size",
  "begin","end","rbegin","rend","insert","erase","clear","resize","reserve",
  "LLONG_MAX","LLONG_MIN","INT_MAX","INT_MIN","UINT_MAX","NULL",
]);

// Single-line tokenizer. Multi-line constructs (block comments / raw strings)
// are handled by passing a small running state from line to line.
export interface CppLineState {
  inBlockComment: boolean;
}

export const initialCppState = (): CppLineState => ({ inBlockComment: false });

export function tokenizeCppLine(line: string, state: CppLineState): CppToken[] {
  const tokens: CppToken[] = [];
  let i = 0;
  const n = line.length;

  // continuation of a /* ... */ block from a previous line
  if (state.inBlockComment) {
    const end = line.indexOf("*/");
    if (end === -1) {
      tokens.push({ kind: "comment", text: line });
      return tokens;
    }
    tokens.push({ kind: "comment", text: line.slice(0, end + 2) });
    state.inBlockComment = false;
    i = end + 2;
  }

  while (i < n) {
    const c = line[i];
    const c2 = line.slice(i, i + 2);

    // whitespace (preserve verbatim — caller relies on it for indentation)
    if (c === " " || c === "\t") {
      let j = i;
      while (j < n && (line[j] === " " || line[j] === "\t")) j++;
      tokens.push({ kind: "ws", text: line.slice(i, j) });
      i = j;
      continue;
    }

    // line comment
    if (c2 === "//") {
      tokens.push({ kind: "comment", text: line.slice(i) });
      break;
    }
    // block comment
    if (c2 === "/*") {
      const end = line.indexOf("*/", i + 2);
      if (end === -1) {
        tokens.push({ kind: "comment", text: line.slice(i) });
        state.inBlockComment = true;
        return tokens;
      }
      tokens.push({ kind: "comment", text: line.slice(i, end + 2) });
      i = end + 2;
      continue;
    }

    // preprocessor (#include, #define, ...)
    if (c === "#" && (i === 0 || /^\s*$/.test(line.slice(0, i)))) {
      // include the rest of the line as preproc but still split strings inside <...>
      const rest = line.slice(i);
      tokens.push({ kind: "preproc", text: rest });
      break;
    }

    // strings
    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (line[j] === "\\" && j + 1 < n) { j += 2; continue; }
        if (line[j] === '"') { j++; break; }
        j++;
      }
      tokens.push({ kind: "string", text: line.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (line[j] === "\\" && j + 1 < n) { j += 2; continue; }
        if (line[j] === "'") { j++; break; }
        j++;
      }
      tokens.push({ kind: "char", text: line.slice(i, j) });
      i = j;
      continue;
    }

    // numeric literal
    if (/[0-9]/.test(c) || (c === "." && i + 1 < n && /[0-9]/.test(line[i + 1]))) {
      let j = i + 1;
      while (j < n && /[0-9a-fA-FxXbBoOuUlLzZ._']/.test(line[j])) j++;
      tokens.push({ kind: "number", text: line.slice(i, j) });
      i = j;
      continue;
    }

    // identifier / keyword
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      // peek for `(` (after optional whitespace) -> function call/decl
      let k = j;
      while (k < n && line[k] === " ") k++;
      const isCall = line[k] === "(";
      let kind: CppTokenKind = "ident";
      if (KEYWORDS.has(word)) kind = "keyword";
      else if (TYPES.has(word)) kind = "type";
      else if (STL.has(word)) kind = "stl";
      else if (isCall) kind = "func";
      tokens.push({ kind, text: word });
      i = j;
      continue;
    }

    // operators / punctuation
    if (/[+\-*/%=&|^~!<>?:]/.test(c)) {
      // greedy 2- or 3-char operators
      const three = line.slice(i, i + 3);
      const two = line.slice(i, i + 2);
      const longOps = new Set([
        "<<=", ">>=", "...", "->*", "::*",
      ]);
      const twoOps = new Set([
        "==","!=","<=",">=","&&","||","<<",">>","->","::","++","--",
        "+=","-=","*=","/=","%=","&=","|=","^=",
      ]);
      if (longOps.has(three)) { tokens.push({ kind: "operator", text: three }); i += 3; continue; }
      if (twoOps.has(two)) { tokens.push({ kind: "operator", text: two }); i += 2; continue; }
      tokens.push({ kind: "operator", text: c });
      i += 1;
      continue;
    }
    if (/[(){}\[\];,.]/.test(c)) {
      tokens.push({ kind: "punct", text: c });
      i += 1;
      continue;
    }

    // unknown — pass through
    tokens.push({ kind: "ident", text: c });
    i += 1;
  }

  return tokens;
}

// Vibrant-but-readable palette tuned for the existing dark UI.
export const CPP_TOKEN_COLORS: Record<CppTokenKind, string> = {
  keyword:  "oklch(0.78 0.18 320)",  // magenta-violet
  type:     "oklch(0.82 0.16 200)",  // cyan
  stl:      "oklch(0.83 0.14 165)",  // teal-green
  preproc:  "oklch(0.62 0.06 255)",  // slate (with comment-ish hue)
  string:   "oklch(0.82 0.14 95)",   // amber
  char:     "oklch(0.82 0.14 95)",
  comment:  "oklch(0.48 0.04 255)",  // muted slate
  number:   "oklch(0.80 0.16 50)",   // orange
  operator: "oklch(0.78 0.10 30)",   // soft red
  punct:    "oklch(0.65 0.03 255)",
  func:     "oklch(0.86 0.16 85)",   // warm yellow
  ident:    "oklch(0.86 0.02 255)",
  ws:       "transparent",
};
