# promptlint-mcp

[![npm](https://img.shields.io/npm/v/promptlint-mcp.svg?label=npm)](https://www.npmjs.com/package/promptlint-mcp)
[![npm downloads](https://img.shields.io/npm/dm/promptlint-mcp.svg?label=downloads)](https://www.npmjs.com/package/promptlint-mcp)
[![GitHub stars](https://img.shields.io/github/stars/sean-sunagaku/promptlint-mcp.svg?style=flat&label=stars)](https://github.com/sean-sunagaku/promptlint-mcp/stargazers)
![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Node 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![MCP compatible](https://img.shields.io/badge/MCP-compatible-blue.svg)

Lint AI prompts like code. Save tokens. Catch contradictions.

A static analyzer for AI prompts — system prompts, agent instructions, tool
descriptions — that runs as a **CLI** and as an **MCP server** so Claude Code
(or any MCP-aware agent) can lint prompts before sending them.

---

## Quick demo

Run promptlint on a typical (silently broken) system prompt:

<!-- TODO: record an asciinema cast of the three CLI modes (default / --json
     / --trim) and link here as `[![asciicast](...)](...)` once uploaded.
     The text block below is the verbatim `NO_COLOR=1` output — it ships the
     idea without needing the cast to land first. -->

```text
$ node src/cli.mjs examples/bad-prompt.md

promptlint examples/bad-prompt.md
  score  14/100
  tokens 367 → 307 (-60, 16% saved)
  issues 14

  info   [ambiguous-pronoun] Pronoun "that" has no clear referent (line 1)
         → Replace with a concrete noun, e.g. "this" → "the config file".
  ...
  error  [contradiction] Contradicting directives (length): "concise" vs "detailed"
         → Pick one, or scope each with a clear condition (e.g. by task type).
  error  [contradiction] Contradicting directives (commenting): "do not add comments" vs "explain each step"
         → Pick one, or scope each with a clear condition (e.g. by task type).
  info   [trailing-fluff] "please" fluff (match 1 of 1)
         → Delete. AIs do not need politeness tokens.
         · Please
  ...
```

Two `error`-level contradictions caught, score clamped to 14/100, 60 tokens (16%) reclaimable via `--trim`.

And here's `--trim` in action on a small input:

```text
$ echo "You are a helpful assistant. Please always be concise. Thank you for your help! When the user asks a question, handle it carefully." | node src/cli.mjs - --trim

You are a helpful assistant. Always be concise. When the user asks a question, handle it carefully.
```

See [`docs/promo/`](./docs/promo/) for posting drafts and the (TODO) asciinema cast.

---

## Why

- **Contradictions**: `"be concise"` + `"be thorough"` ships silently and
  wastes tokens on every request. promptlint flags paired opposites
  (length / tone / frequency / commenting / asking) as `error`.
- **Redundancy**: near-duplicate sentences (Jaccard > 0.6) get one `warn`
  apiece — delete one.
- **Ambiguous pronouns**: `"use it"` / `"handle that"` without a mid-sentence
  referent is flagged with a line number. Start-of-sentence capitals do NOT
  count as referents, so normal English doesn't false-positive.
- **Long code examples**: fenced code blocks over ~1200 chars or 30 lines
  trigger a `warn` — examples are almost always trimmable to shape-only.
- **Politeness fluff**: `Please` / `Thanks` / `I hope this helps` / `Let me
  know if…` / `Feel free to…` are detected, counted, and (with `--trim`)
  stripped while keeping your actual imperatives intact.

Scope: **English prompts, prose — not source code.** A Japanese prompt or a
file of JavaScript will look clean even if it isn't.

---

## Install

Install both the CLI and the MCP server in one go:

```sh
npm install -g promptlint-mcp
```

Two binaries are placed on your `$PATH`:

| Bin | What it is |
| --- | ---------- |
| `promptlint`     | the CLI (lint a file or stdin) |
| `promptlint-mcp` | the MCP server (stdio transport) |

### Run without installing

```sh
# CLI: lint a file
npx -p promptlint-mcp promptlint <file>

# CLI: lint stdin
echo "be concise and thorough" | npx -p promptlint-mcp promptlint -

# MCP server (auto-launched by Claude Code via mcp config; see below)
npx -y promptlint-mcp
```

### From source (hacking on it)

```sh
git clone https://github.com/sean-sunagaku/promptlint-mcp.git
cd promptlint-mcp
npm install
node src/cli.mjs examples/bad-prompt.md
```

Requires Node **>= 18**. Zero runtime deps other than the MCP SDK.

---

## CLI usage

### Default human report

```sh
node src/cli.mjs examples/bad-prompt.md
```

```
promptlint examples/bad-prompt.md
  score  14/100
  tokens 367 → 307 (-60, 16% saved)
  issues 14

  info   [ambiguous-pronoun] Pronoun "that" has no clear referent (line 1)
         → Replace with a concrete noun, e.g. "this" → "the config file".
  ...
  error  [contradiction] Contradicting directives (length): "concise" vs "detailed"
         → Pick one, or scope each with a clear condition (e.g. by task type).
  error  [contradiction] Contradicting directives (commenting): "do not add comments" vs "explain each step"
         → Pick one, or scope each with a clear condition (e.g. by task type).
  info   [trailing-fluff] "thanks" fluff (match 1 of 2)
         → Delete. AIs do not need politeness tokens.
         · Thank you
  info   [trailing-fluff] "please" fluff (match 1 of 1)
         → Delete. AIs do not need politeness tokens.
         · Please
  info   [trailing-fluff] "hope-helps" fluff (match 1 of 1)
         → Delete. AIs do not need politeness tokens.
         · I hope this helps
  ...
```

A clean prompt (see `examples/good-prompt.md`) returns `score 100/100` with
zero issues — silence is a feature.

### `--json` for machine consumption

```sh
node src/cli.mjs examples/bad-prompt.md --json
```

```json
{
  "score": 14,
  "issues": [
    {
      "rule": "ambiguous-pronoun",
      "severity": "info",
      "message": "Pronoun \"that\" has no clear referent (line 1)",
      "line": 1,
      "suggestion": "Replace with a concrete noun, e.g. \"this\" → \"the config file\"."
    },
    {
      "rule": "contradiction",
      "severity": "error",
      "message": "Contradicting directives (length): \"concise\" vs \"detailed\"",
      "suggestion": "Pick one, or scope each with a clear condition (e.g. by task type)."
    }
  ],
  "trimmed": "…",
  "tokensBefore": 367,
  "tokensAfter": 307,
  "saved": 60,
  "savedPercent": 16
}
```

Empty input adds `"note": "empty input"`. Pure-fluff input (e.g. `"Thanks!"`)
that would otherwise trim to empty instead returns the original with
`"trimmerFallback": true` — a safe drop-in never hands a blank prompt to your
LLM.

### `--trim` to print trimmed output (for piping)

```sh
echo "You are a helpful coding assistant. Please always be concise. Thank you for your help! When the user asks a question, handle it carefully. If they provide code, review it. Let me know if anything is unclear. I hope this helps!" \
  | node src/cli.mjs - --trim
```

```
You are a helpful coding assistant. Always be concise. When the user asks a question, handle it carefully. If they provide code, review it.
```

Fenced code blocks are preserved verbatim. Quoted strings (`"…"`) and inline
backticks (`` `…` ``) are masked before fluff removal so example text survives
untouched.

### Stdin

```sh
cat prompt.md | node src/cli.mjs -
```

The report header shows `promptlint <stdin>`.

### Other flags

```sh
node src/cli.mjs --rules      # list the 5 rule IDs, one per line
node src/cli.mjs --help       # usage
```

### Exit codes

| Code | Meaning |
| ---- | ------- |
| 0 | no errors (warn/info ok) |
| 1 | at least one `error`-severity issue |
| 2 | bad usage (missing file, read failure, etc.) |

---

## MCP server usage

Register with Claude Code in one command (no clone, no global install needed):

```sh
claude mcp add promptlint -- npx -y promptlint-mcp
```

Or add this to `~/.claude.json` (user scope) or project `.mcp.json`
(project scope):

```json
{
  "mcpServers": {
    "promptlint": {
      "command": "npx",
      "args": ["-y", "promptlint-mcp"]
    }
  }
}
```

If you've globally installed the package, the absolute-path form also works
and skips `npx`'s first-run download:

```json
{
  "mcpServers": {
    "promptlint": {
      "command": "promptlint-mcp"
    }
  }
}
```

### Tools exposed

| Tool | Input | Returns |
| ---- | ----- | ------- |
| `lint_prompt` | `{ text: string }` | Two `text` content items: `[0]` human one-line summary (`"score: X/100 · issues: N · tokens: A → B …"`), `[1]` full JSON of the `lint()` result (parse with `JSON.parse(result.content[1].text)`). |
| `trim_prompt` | `{ text: string }` | Two `text` content items: `[0]` the trimmed prompt, `[1]` a savings footer (`"Saved N tokens (P%). Original: A, trimmed: B."`). Does NOT resolve contradictions, redundancy, or ambiguity — run `lint_prompt` for those. |

Both tools are pure / idempotent. No network, no filesystem, no state.

---

## Rules

| ID | Severity | What it catches | Example trigger |
| -- | -------- | --------------- | --------------- |
| `contradiction` | `error` | Paired opposing directives on length / tone / frequency / prohibition / commenting / asking | `"be concise"` + `"be thorough"` |
| `redundancy` | `warn` | Two sentences with Jaccard word-set similarity > 0.6 | Two paragraphs that both say "respond in English" with different wording |
| `long-example` | `warn` | Fenced code block > 1200 chars or > 30 lines | A 40-line helper function pasted inline |
| `ambiguous-pronoun` | `info` | `it` / `this` / `that` / `these` / `those` with no mid-sentence concrete referent | `"Use it to figure out what to do."` |
| `trailing-fluff` | `info` | Politeness / filler: `please`, `thanks`, `I hope this helps`, `let me know if…`, `feel free to…`, `sorry`, `certainly/absolutely/of course` | `"Please refactor the code. Thanks!"` |

Score formula: `100 - (errors*25 + warns*10 + infos*3)`, then clamped to `<=59`
if any error exists and `<=79` if 2+ warnings exist. Severity ceilings are a
traffic-light: any error = red zone, regardless of count.

---

## Pricing & Roadmap

**Free (OSS, MIT)**
- CLI (`node src/cli.mjs`) — all three modes (report / JSON / trim), all 5 rules.
- MCP server (`node src/mcp.mjs`) — both tools, unlimited use.
- No account, no telemetry, no network.

**Pro (planned, $9/mo)**
- Team-shared custom rule dictionary (your project's bannned phrases, required
  headers, forbidden contradictions).
- Per-project lint history with diff view.
- Cross-project token-savings dashboard ("your team saved 1.2M tokens this
  month").

Pro is **not shipped yet**. No signup form today —
[👍 the early-access issue (#1)](https://github.com/sean-sunagaku/promptlint-mcp/issues/1)
to register interest. We DM invites in 👍 order.

---

## Development

### Smoke test

```sh
npm run lint:self         # lints examples/bad-prompt.md
```

Expected: exit 1 (2 `error` contradictions), score in the low teens, all
rules firing. If this drifts, a rule regressed.

### Baseline

`examples/good-prompt.md` must always score **100/100** with **0 issues**. If
a change breaks that, the change is wrong.

### Adding a rule

Rules live in `src/linter.mjs`. Each rule is a plain function:

```js
function ruleFooBar(text) {
  // return an array of { rule, severity, message, samples?, suggestion, line? }
  return [];
}
```

Add it to the `issues` array inside `lint()` and append its ID to the `RULES`
export. If it targets prose (not code), run it against the `maskCodeBlocks()`
copy so fenced examples don't trigger it. If it needs sentence splitting,
reuse `splitSentences` (quote-aware) or `splitSentencesPreservingDelims`
(quote-aware, keeps delimiters for the trimmer).

### Contradictions

Extend `CONTRADICTION_PAIRS` at the top of `src/linter.mjs`. Each entry is:

```js
{ a: ["keyword-a", ...], b: ["keyword-b", ...], label: "short-label" }
```

Existing labels: `length`, `tone`, `frequency`, `prohibition`, `commenting`,
`asking`.

---

## Community

- 💬 [Discussions](https://github.com/sean-sunagaku/promptlint-mcp/discussions) — questions, ideas, prompt war stories
- 🐛 [Issues](https://github.com/sean-sunagaku/promptlint-mcp/issues) — bugs, feature requests
  - [#1 Pro early access](https://github.com/sean-sunagaku/promptlint-mcp/issues/1) (pinned)
  - [#2 Roadmap](https://github.com/sean-sunagaku/promptlint-mcp/issues/2)
  - [#3 Known issues / day-2 backlog](https://github.com/sean-sunagaku/promptlint-mcp/issues/3)
- ⭐ Star the repo if it saves you tokens — discovery helps other AI users find it.

## How this was built

This package was produced end-to-end by two AI agent teams:

- **[ai-auto-improve-app](https://github.com/sean-sunagaku/ai-auto-improve-app)** — built and polished the product. Customer AI uses the tool and writes feedback → Developer AI patches the code → repeat. Each round's commit (`round-001` … `round-003`) is the developer-AI's response to that round's customer-AI feedback.
- **[ai-launch-team](https://github.com/sean-sunagaku/ai-launch-team)** — published and distributed it. 5 sub-agents handled npm publish, GitHub Release, awesome-mcp PRs, Discussions threads, social copy drafts, and SVG/PNG asset generation.

Combined, this took the product from "empty repo" to "v0.1.2 on npm + 2 awesome-mcp PRs + 2 Discussions seed threads + 4 Issues + full social drafts" with the only manual step being the platform-mandated SMS / OTP authentications (X account creation, npm 2FA setup) — the rest was AI.

## License

MIT — see [LICENSE](./LICENSE).
