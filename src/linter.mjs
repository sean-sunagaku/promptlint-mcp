// promptlint — core static analyzer for AI prompts.
// Pure JS, no deps. Rules are plain functions that return issue[].

// ---------- Token estimation ----------
// Approximate: ASCII ~4 chars/token, non-ASCII ~1 char/token.
export function estimateTokens(text) {
  if (!text) return 0;
  const ascii = text.match(/[\x00-\x7F]/g)?.length ?? 0;
  const nonAscii = text.length - ascii;
  return Math.ceil(ascii / 4) + nonAscii;
}

// ---------- Helpers ----------
// Mask inline quote / backtick spans in `text` with equal-length runs of a
// single non-terminator character (underscore), so that subsequent splits on
// sentence terminators (. ! ? etc.) do NOT cut inside a quoted/backticked
// span. Indexes and total length are preserved. Single quotes are deliberately
// left alone because they double as apostrophes in English contractions.
function maskQuotedSpansForSplit(text) {
  return text.replace(/`[^`\n]*`|"[^"\n]*"/g, (m) => m.replace(/[^\n]/g, "_"));
}

function splitSentences(text) {
  // Split on line breaks, CJK/Latin sentence enders. Keep non-trivial pieces.
  // Quote-aware: mask inline quoted/backticked spans first so a period inside
  // a "..." or `...` doesn't split the surrounding sentence. We split on the
  // masked copy, then map the slices back onto the original text by offset.
  const masked = maskQuotedSpansForSplit(text);
  const splitter = /[\n。.!?！？]+/g;
  const out = [];
  let lastIdx = 0;
  let m;
  while ((m = splitter.exec(masked)) !== null) {
    const slice = text.slice(lastIdx, m.index).trim();
    if (slice.length > 12) out.push(slice);
    lastIdx = m.index + m[0].length;
  }
  const tail = text.slice(lastIdx).trim();
  if (tail.length > 12) out.push(tail);
  return out;
}

function tokenizeWords(s) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const uni = sa.size + sb.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

// Replace fenced code blocks with equivalently-sized whitespace so that
// positions / line numbers still match, but rules targeting prose prose
// won't match code content. Preserves newlines inside the fence.
function maskCodeBlocks(text) {
  const fenceRe = /```[\s\S]*?```/g;
  return text.replace(fenceRe, (m) =>
    m.replace(/[^\n]/g, " ")
  );
}

// ---------- Rule: redundancy ----------
// Near-duplicate sentences (Jaccard > 0.6) indicate the same instruction twice.
// Perf: tokenize each sentence once up-front (prior versions re-tokenized in
// the inner loop → O(n²) × tokenize cost). For very long inputs (>200 sents)
// the pair-wise scan itself becomes the bottleneck, so we fall back to a
// windowed adjacent scan and emit a single info issue so the behavior is
// visible in the output.
const REDUNDANCY_PAIRWISE_LIMIT = 200;
const REDUNDANCY_WINDOW = 10;
function ruleRedundancy(text) {
  const issues = [];
  const sents = splitSentences(text);
  const n = sents.length;
  // Hoist tokenization out of the O(n²) loop.
  const tokens = new Array(n);
  for (let i = 0; i < n; i++) tokens[i] = tokenizeWords(sents[i]);

  const seen = new Set();
  const pushPair = (i, j, sim) => {
    const key = `${Math.min(i, j)}:${Math.max(i, j)}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({
      rule: "redundancy",
      severity: "warn",
      message: `Near-duplicate sentences (similarity ${sim.toFixed(2)})`,
      samples: [sents[i], sents[j]],
      suggestion: "Keep one, delete the other, or merge them.",
    });
  };

  if (n > REDUNDANCY_PAIRWISE_LIMIT) {
    // Long input: windowed scan only (i, i+1..i+window).
    for (let i = 0; i < n; i++) {
      const a = tokens[i];
      if (a.length < 4) continue;
      const jEnd = Math.min(n, i + 1 + REDUNDANCY_WINDOW);
      for (let j = i + 1; j < jEnd; j++) {
        const b = tokens[j];
        if (b.length < 4) continue;
        const sim = jaccard(a, b);
        if (sim > 0.6) pushPair(i, j, sim);
      }
    }
    issues.push({
      rule: "redundancy",
      severity: "info",
      message: `redundancy: skipped pair-wise scan on N>${REDUNDANCY_PAIRWISE_LIMIT} sentences for perf`,
      suggestion:
        "Input is very long; only adjacent sentences (window=10) were compared.",
    });
    return issues;
  }

  for (let i = 0; i < n; i++) {
    const a = tokens[i];
    if (a.length < 4) continue;
    for (let j = i + 1; j < n; j++) {
      const b = tokens[j];
      if (b.length < 4) continue;
      const sim = jaccard(a, b);
      if (sim > 0.6) pushPair(i, j, sim);
    }
  }
  return issues;
}

// ---------- Rule: ambiguous pronoun ----------
// Flags "it/this/that/these/those" that have no nearby concrete referent.
// Referent must be mid-sentence capitalized noun, quoted term, backticked
// term, or snake_case identifier — start-of-sentence capitalization does NOT
// count (otherwise every English sentence trivially satisfies the check).
function ruleAmbiguousPronoun(text) {
  const issues = [];
  const PRONOUN_RE = /\b(it|this|that|these|those)\b/gi;
  const lines = text.split("\n");
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(PRONOUN_RE)) {
      const before = line.slice(Math.max(0, m.index - 80), m.index);
      // Strip the leading capital of the current sentence so we don't count
      // it as a referent. "(?:^|[.!?]\s+)[A-Z]\w*" captures the sentence-start
      // capital and is removed before checking for mid-sentence referents.
      const stripped = before.replace(/(^|[.!?]\s+)[A-Z][a-zA-Z0-9_]*/g, "$1");
      // Mid-sentence referent heuristics: backticked, quoted, snake_case,
      // or a capitalized word that survives the strip above (proper noun
      // appearing NOT at sentence start).
      const hasReferent =
        /`[^`]+`/.test(stripped) ||
        /"[^"]+"/.test(stripped) ||
        /\b[a-z]+_[a-z_]+\b/.test(stripped) ||
        /\s[A-Z][a-zA-Z0-9_]+/.test(stripped);
      if (!hasReferent) {
        issues.push({
          rule: "ambiguous-pronoun",
          severity: "info",
          message: `Pronoun "${m[0]}" has no clear referent (line ${idx + 1})`,
          line: idx + 1,
          suggestion:
            'Replace with a concrete noun, e.g. "this" → "the config file".',
        });
      }
    }
  });
  return issues;
}

// ---------- Rule: long example ----------
// Code/quote blocks longer than threshold chars are usually trimmable.
// Threshold is ~1200 chars ≈ 30 lines × ~40 chars, matching the suggestion.
function ruleLongExample(text) {
  const issues = [];
  const codeBlockRe = /```[\s\S]*?```/g;
  for (const m of text.matchAll(codeBlockRe)) {
    const lines = m[0].split("\n").length;
    if (m[0].length > 1200 || lines > 30) {
      issues.push({
        rule: "long-example",
        severity: "warn",
        message: `Code example is ${m[0].length} chars / ${lines} lines long`,
        suggestion:
          "Examples over ~30 lines are almost always trimmable. Keep only the shape.",
      });
    }
  }
  // Block quotes
  const quoteLines = text.split("\n").filter((l) => l.startsWith(">"));
  if (quoteLines.length > 15) {
    issues.push({
      rule: "long-example",
      severity: "warn",
      message: `Block quote spans ${quoteLines.length} lines`,
      suggestion: "Summarize instead of pasting a full quote.",
    });
  }
  return issues;
}

// ---------- Rule: contradiction ----------
const CONTRADICTION_PAIRS = [
  {
    a: ["concise", "terse", "brief", "short", "succinct"],
    b: [
      "detailed",
      "thorough",
      "comprehensive",
      "in-depth",
      "extensive",
      "elaborate",
    ],
    label: "length",
  },
  {
    a: ["formal"],
    b: ["casual", "friendly", "informal", "playful"],
    label: "tone",
  },
  {
    a: ["always "],
    b: ["sometimes", "occasionally", "when appropriate"],
    label: "frequency",
  },
  {
    a: ["never "],
    b: ["if needed", "when appropriate", "sometimes"],
    label: "prohibition",
  },
  {
    a: ["do not add comments", "don't comment", "no comments"],
    b: [
      "explain each step",
      "document every",
      "comment every",
      "with comments",
    ],
    label: "commenting",
  },
  {
    a: [
      "do not ask",
      "don't ask",
      "never ask",
      "never ask any",
      "do not ask any",
      "don't ask anything",
      "never ask clarifying",
    ],
    b: [
      "ask the user",
      "clarify with the user",
      "confirm with the user",
      "ask for clarification",
      "ask clarifying",
      "clarify with",
      "confirm with",
      "request clarification",
    ],
    label: "asking",
  },
];

function ruleContradiction(text) {
  const lower = text.toLowerCase();
  const issues = [];
  for (const pair of CONTRADICTION_PAIRS) {
    const aHit = pair.a.find((w) => lower.includes(w));
    const bHit = pair.b.find((w) => lower.includes(w));
    if (aHit && bHit) {
      issues.push({
        rule: "contradiction",
        severity: "error",
        message: `Contradicting directives (${pair.label}): "${aHit.trim()}" vs "${bHit.trim()}"`,
        suggestion:
          "Pick one, or scope each with a clear condition (e.g. by task type).",
      });
    }
  }
  return issues;
}

// ---------- Trailing fluff patterns ----------
// Used by both ruleTrailingFluff (detection) and trim (removal).
// Each pattern's intent is documented: "phrase" removes just the token,
// "clause" removes to the end of the clause/sentence.
const FLUFF_PATTERNS = [
  { re: /\b(thank you|thanks)\b[.!]?/gi, label: "thanks", kind: "phrase" },
  // Match "please"/"kindly" followed by whitespace OR sentence-ending
  // punctuation OR end-of-string. Previously required a trailing space, which
  // let "Please." slip by. The lookahead keeps the match single-token so we
  // don't swallow surrounding context — just the politeness word itself.
  { re: /\b(please|kindly)(?=[\s.!?,;:]|$)/gi, label: "please", kind: "phrase" },
  { re: /\bI hope (this|that) helps\b\.?/gi, label: "hope-helps", kind: "phrase" },
  { re: /\blet me know if\b[^\n.]*[.!]?/gi, label: "let-me-know", kind: "clause" },
  { re: /\bfeel free to\b[^\n.]*[.!]?/gi, label: "feel-free", kind: "clause" },
  { re: /\byou('re| are) welcome\b\.?/gi, label: "welcome", kind: "phrase" },
  { re: /\b(sorry|apologies|my apologies)\b[^\n.]*[.!]?/gi, label: "apology", kind: "clause" },
  { re: /\b(certainly|absolutely|of course)[,!]\s*/gi, label: "affirmative-fluff", kind: "phrase" },
];

// Emit one issue per fluff match (capped per label) so score scales with
// fluff density: 10 "please" occurrences deduct ~30 points, not 3.
const FLUFF_ISSUES_PER_LABEL_CAP = 10;
function ruleTrailingFluff(text) {
  const issues = [];
  for (const { re, label } of FLUFF_PATTERNS) {
    const matches = [...text.matchAll(re)];
    if (matches.length === 0) continue;
    const emitted = Math.min(matches.length, FLUFF_ISSUES_PER_LABEL_CAP);
    for (let k = 0; k < emitted; k++) {
      const m = matches[k];
      issues.push({
        rule: "trailing-fluff",
        severity: "info",
        message:
          matches.length > emitted && k === emitted - 1
            ? `"${label}" fluff (match ${k + 1} of ${matches.length}, cap reached)`
            : `"${label}" fluff (match ${k + 1} of ${matches.length})`,
        samples: [m[0]],
        suggestion: "Delete. AIs do not need politeness tokens.",
      });
    }
  }
  return issues;
}

// ---------- Trimmer ----------
// Sentence-aware fluff removal. For each sentence:
//   1. Run fluff regexes.
//   2. If removal would leave only a fragment (< 3 meaningful words), drop the
//      whole sentence. This prevents orphans like " again!" or
//      "be concise..." with a lost leading capital.
//   3. Otherwise, remove the fluff tokens and re-capitalize the first letter
//      of the surviving sentence.
// Fenced code blocks are preserved as-is.
function trim(text) {
  if (!text) return "";

  // Split into segments: fenced code blocks vs prose.
  const fenceRe = /```[\s\S]*?```/g;
  const segments = [];
  let lastIdx = 0;
  for (const m of text.matchAll(fenceRe)) {
    if (m.index > lastIdx) {
      segments.push({ kind: "prose", text: text.slice(lastIdx, m.index) });
    }
    segments.push({ kind: "code", text: m[0] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    segments.push({ kind: "prose", text: text.slice(lastIdx) });
  }

  const trimmedSegments = segments.map((seg) => {
    if (seg.kind === "code") return seg.text;
    return trimProse(seg.text);
  });

  let t = trimmedSegments.join("");
  // Collapse spaces/tabs (but not newlines); collapse 3+ newlines to 2.
  t = t.replace(/[ \t]+/g, " ");
  // Remove leading spaces at start of lines (left behind by fluff removal).
  t = t.replace(/^[ \t]+/gm, "");
  t = t.replace(/[ \t]+$/gm, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// Curated imperative / common-action verb list. A sentence containing any of
// these (in any inflected form we can cheaply match) is substantive enough to
// keep, regardless of its word count. This replaces a prior "meaningful word
// count >= 3" heuristic that over-eagerly dropped legitimate 2-word imperatives
// like "refactor the code" (where "the" is a stopword).
const KEEP_VERBS = new Set([
  "refactor", "handle", "fix", "update", "create", "add", "remove", "check",
  "run", "use", "read", "write", "return", "print", "answer", "explain",
  "implement", "respond", "reply", "ask", "send", "log", "save", "delete",
  "rename", "move", "copy", "list", "show", "verify", "validate", "be", "do",
  "make", "keep", "avoid", "skip", "build", "test", "set", "get", "call",
  "parse", "format", "review", "analyze", "generate", "describe", "summarize",
  "find", "search", "fetch", "load", "store", "push", "pull", "commit",
  "merge", "split", "combine", "filter", "sort", "map", "reduce", "compute",
  "calculate", "convert", "transform", "translate", "compare", "match",
  "include", "exclude", "require", "allow", "deny", "accept", "reject",
  "confirm", "cancel", "stop", "start", "pause", "resume", "enable", "disable",
  "open", "close", "insert", "replace", "restore", "upgrade", "downgrade",
  "install", "uninstall", "configure", "customize", "extend", "shorten",
  "trim", "clean", "clear", "reset", "initialize", "finalize", "consider",
  "think", "decide", "choose", "pick", "select", "prefer", "know", "tell",
  "help", "assist", "suggest", "recommend", "warn", "note", "mention",
  "assume", "ignore", "follow", "obey", "apply", "adopt", "enforce", "ensure",
]);

// Fast inflection-aware keep check:
// - exact match in KEEP_VERBS, or
// - strip common suffixes (s, ed, ing, es, ied) and check base form.
function containsKeepVerb(s) {
  const words = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (const w of words) {
    if (KEEP_VERBS.has(w)) return true;
    // Try common inflection stripping.
    if (w.length > 3) {
      if (w.endsWith("ing")) {
        const base = w.slice(0, -3);
        if (KEEP_VERBS.has(base)) return true;
        // "running" → drop doubled consonant
        if (base.length > 1 && base[base.length - 1] === base[base.length - 2]) {
          if (KEEP_VERBS.has(base.slice(0, -1))) return true;
        }
        // "making" → "make"
        if (KEEP_VERBS.has(base + "e")) return true;
      }
      if (w.endsWith("ed")) {
        const base = w.slice(0, -2);
        if (KEEP_VERBS.has(base)) return true;
        if (KEEP_VERBS.has(base + "e")) return true;
        // "ied" → "y"
        if (w.endsWith("ied") && w.length > 3 && KEEP_VERBS.has(w.slice(0, -3) + "y"))
          return true;
      }
      if (w.endsWith("es")) {
        if (KEEP_VERBS.has(w.slice(0, -2))) return true;
        if (KEEP_VERBS.has(w.slice(0, -1))) return true; // "parses" → "parse"
      }
      if (w.endsWith("s") && !w.endsWith("ss")) {
        if (KEEP_VERBS.has(w.slice(0, -1))) return true;
      }
    }
  }
  return false;
}

// Split prose into sentence-like chunks, preserving the delimiter characters
// (so "Hello! World." → ["Hello!", " World."]). Keeps leading/trailing
// whitespace attached to segments so we can rejoin without losing structure.
// Quote-aware: a period / ! / ? inside a "..." double-quoted span or a
// `...` backticked span does NOT end a sentence. We mask those spans to
// equal-length underscore runs before running the splitter regex, then map
// each chunk's offsets back onto the unmasked original so the returned pieces
// contain the verbatim original characters.
function splitSentencesPreservingDelims(text) {
  const masked = maskQuotedSpansForSplit(text);
  // Match chunks of (non-terminators)(terminators)? plus any trailing whitespace.
  const re = /[^.!?\n]*(?:[.!?]+|\n|$)[ \t]*/g;
  const out = [];
  let m;
  let lastStart = 0;
  while ((m = re.exec(masked)) !== null) {
    if (m[0].length === 0) {
      if (re.lastIndex === lastStart) re.lastIndex++;
      continue;
    }
    const start = m.index;
    const end = re.lastIndex;
    // Pull from the ORIGINAL (unmasked) text so quoted contents survive intact.
    out.push(text.slice(start, end));
    lastStart = end;
    if (re.lastIndex >= masked.length) break;
  }
  return out;
}

// Patterns that, when matching at the START of a sentence, indicate the whole
// sentence is politeness-fluff and should be dropped even if substantive-
// looking words follow. E.g. "Thank you for helping the user with this task."
// is entirely a thanks sentence, not a substantive instruction.
const SENTENCE_DROP_STARTERS = [
  /^\s*(thank you|thanks)\b/i,
  /^\s*I hope (this|that) helps\b/i,
  /^\s*(you're|you are) welcome\b/i,
  /^\s*(sorry|apologies|my apologies)\b/i,
  /^\s*(certainly|absolutely|of course)\b/i,
  /^\s*let me know if\b/i,
  /^\s*feel free to\b/i,
];

// Mask double-quoted spans ("…") and inline backtick spans (`…`) in a sentence
// with same-length placeholders so fluff regex inside them doesn't match.
// Returns [maskedText, restoreFn] — restoreFn substitutes original spans back
// into the (possibly-mutated) output.
function maskInlineQuotesAndBackticks(s) {
  const spans = [];
  // Match inline backtick spans first (they can contain quotes), then double
  // quotes. Single quotes are deliberately NOT masked because they double as
  // apostrophes in English contractions (e.g. "don't", "I'm").
  const re = /`[^`\n]*`|"[^"\n]*"/g;
  let masked = "";
  let lastIdx = 0;
  for (const m of s.matchAll(re)) {
    masked += s.slice(lastIdx, m.index);
    const placeholder = "" + String(spans.length).padStart(4, "0") + "";
    spans.push({ placeholder, original: m[0] });
    masked += placeholder;
    lastIdx = m.index + m[0].length;
  }
  masked += s.slice(lastIdx);
  const restore = (out) => {
    let r = out;
    for (const { placeholder, original } of spans) {
      r = r.split(placeholder).join(original);
    }
    return r;
  };
  return [masked, restore];
}

function trimProse(prose) {
  const sentences = splitSentencesPreservingDelims(prose);
  const kept = [];

  for (const sent of sentences) {
    // Mask quotes / inline backticks before ANY fluff handling, including the
    // whole-sentence-drop starter check. This keeps things like
    //   Consider: "Thank you for your help" is a fluff string.
    // from being dropped or gutted.
    const [maskedSent, restore] = maskInlineQuotesAndBackticks(sent);

    // Whole-sentence drop: only if the *masked* sentence starts with fluff.
    const startsWithFluff = SENTENCE_DROP_STARTERS.some((re) => re.test(maskedSent));
    if (startsWithFluff) {
      const trailingNewlines = sent.match(/\n+$/)?.[0] ?? "";
      kept.push(trailingNewlines);
      continue;
    }

    let s = maskedSent;
    let anyFluff = false;

    for (const { re } of FLUFF_PATTERNS) {
      if (re.test(s)) {
        anyFluff = true;
        re.lastIndex = 0;
        s = s.replace(re, "");
      }
      re.lastIndex = 0;
    }

    if (!anyFluff) {
      // Nothing changed; restore placeholders and keep original.
      kept.push(sent);
      continue;
    }

    // After fluff removal: decide whether to drop the whole sentence.
    // Keep the sentence if it contains a known action verb (imperative or
    // otherwise). Otherwise treat the residue as fluff fragment and drop.
    const cleaned = s.replace(/[ \t]+/g, " ").trim();
    const cleanedWithoutPunct = cleaned.replace(/^[^\p{L}\p{N}]+/u, "");
    const restoredForCheck = restore(cleanedWithoutPunct);
    const hasVerb = containsKeepVerb(restoredForCheck);

    if (!hasVerb) {
      // Drop the whole sentence — keeps newlines from the original if any.
      const trailingNewlines = sent.match(/\n+$/)?.[0] ?? "";
      kept.push(trailingNewlines);
      continue;
    }

    // Re-capitalize first alphabetic letter of what's left.
    //
    // XML/HTML tag guard: if the sentence (after leading whitespace) starts
    // with '<', skip the re-capitalize step entirely. This preserves tag names
    // like <rule>, <system>, <thinking>, <example> — common in Anthropic-style
    // structured prompts — which would otherwise be mangled to <Rule>, <System>
    // etc. by the generic "uppercase the first letter post-trim" step.
    let rebuilt = s.replace(/[ \t]+/g, " ");
    rebuilt = rebuilt.replace(/^[ \t]+/, "");
    const startsWithTag = /^\s*</.test(rebuilt);
    if (!startsWithTag) {
      rebuilt = rebuilt.replace(
        /^([^\p{L}]*)(\p{Ll})/u,
        (_, lead, ch) => lead + ch.toUpperCase()
      );
    }
    // Preserve original trailing newlines.
    const trailingNewlines = sent.match(/\n+$/)?.[0] ?? "";
    if (trailingNewlines && !rebuilt.endsWith(trailingNewlines)) {
      rebuilt = rebuilt.replace(/\n+$/, "") + trailingNewlines;
    }
    // Restore quoted/backticked spans in the surviving sentence.
    rebuilt = restore(rebuilt);
    kept.push(rebuilt);
  }

  return kept.join("");
}

// ---------- Score ----------
// Severity-based hard ceilings:
//   - Any error issue     → score capped at 59 (red zone).
//   - 2+ warn issues      → score capped at 79 (yellow zone).
// Plus a flat deduction per issue:
//   score = 100 - (errors*25 + warns*10 + infos*3), floored at 0,
//   then ceiled by the severity rule above.
function scoreOf(issues) {
  let errors = 0, warns = 0, infos = 0;
  for (const i of issues) {
    if (i.severity === "error") errors++;
    else if (i.severity === "warn") warns++;
    else if (i.severity === "info") infos++;
  }
  let score = 100 - (errors * 25 + warns * 10 + infos * 3);
  if (errors > 0) score = Math.min(score, 59);
  else if (warns >= 2) score = Math.min(score, 79);
  return Math.max(0, score);
}

// Heuristic: is the input a JSON / structured payload where whitespace /
// indentation carries meaning and running the prose trimmer would flatten
// it? Triggers on:
//   - first non-whitespace char is '{' or '['
//   - OR more than 30% of non-empty lines start with '{', '[', ':', '"',
//     '}', ']', or look like a "key": value / key: value pair.
// When true, trim() is skipped and the result is flagged `jsonLikeInput:true`.
function looksJsonLike(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (trimmed[0] === "{" || trimmed[0] === "[") return true;
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return false;
  let structural = 0;
  // Key-value heuristic: '"key":' or 'key:' at the start (YAML/JSON-ish).
  const kvRe = /^\s*("?[\w-]+"?\s*:)/;
  for (const line of lines) {
    const s = line.trimStart();
    const c = s[0];
    if (c === "{" || c === "[" || c === "}" || c === "]" || c === '"' || c === ":") {
      structural++;
      continue;
    }
    if (kvRe.test(line)) {
      structural++;
    }
  }
  return structural / lines.length > 0.3;
}

// ---------- Public API ----------
export function lint(text) {
  const input = typeof text === "string" ? text : "";
  // Masked copy has fenced code blocks replaced with whitespace. Prose rules
  // (ambiguous-pronoun, redundancy, trailing-fluff) use this so they don't
  // fire on code. long-example uses the original to count code blocks.
  const masked = maskCodeBlocks(input);
  const issues = [
    ...ruleRedundancy(masked),
    ...ruleAmbiguousPronoun(masked),
    ...ruleLongExample(input),
    ...ruleContradiction(masked),
    ...ruleTrailingFluff(masked),
  ];
  // JSON/YAML safety: if the input looks structured (indentation carries
  // meaning), skip the prose trim entirely — collapsing whitespace would
  // break JSON.parse downstream and garble YAML.
  const jsonLikeInput = looksJsonLike(input);
  let trimmed = jsonLikeInput ? input : trim(input);
  // Safety fallback: if the input had content but the trimmer produced an
  // empty string, return the original input instead. A "safe drop-in" trimmer
  // must never turn a non-empty prompt into a blank — the downstream LLM
  // should always receive the user's intent, even if uncompressed.
  let trimmerFallback = false;
  if (input.trim().length > 0 && trimmed.trim().length === 0) {
    trimmed = input;
    trimmerFallback = true;
  }
  const tokensBefore = estimateTokens(input);
  const tokensAfter = estimateTokens(trimmed);
  const saved = Math.max(0, tokensBefore - tokensAfter);
  const savedPercent =
    tokensBefore === 0 ? 0 : Math.round((saved * 100) / tokensBefore);
  const result = {
    score: scoreOf(issues),
    issues,
    trimmed,
    tokensBefore,
    tokensAfter,
    saved,
    savedPercent,
  };
  if (trimmerFallback) {
    result.trimmerFallback = true;
  }
  if (jsonLikeInput) {
    result.jsonLikeInput = true;
  }
  if (input.trim().length === 0) {
    result.note = "empty input";
  }
  return result;
}

export const RULES = [
  "redundancy",
  "ambiguous-pronoun",
  "long-example",
  "contradiction",
  "trailing-fluff",
];

export { CONTRADICTION_PAIRS };
