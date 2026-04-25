# Changelog

All notable changes to `promptlint-mcp` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1] — 2026-04-24

### Fixed

- **`contradiction` / `asking`**: extended the pair's `a` and `b` arrays so
  `Never ask clarifying questions. Always ask for clarification.` is now
  detected (previously scored 100/0 — silent false-negative). Added
  `never ask clarifying`, `never ask any`, `do not ask any`,
  `don't ask anything` on the forbid side and `ask for clarification`,
  `ask clarifying`, `clarify with`, `request clarification` on the allow
  side.
- **`ruleRedundancy` O(n²) perf**: tokenization is now hoisted once per
  sentence before the pair-wise Jaccard loop (was re-running `tokenizeWords`
  inside the inner loop). Self-lint 10x input went from ~32s to ~26ms.
  For very long inputs (>200 sentences) the scan falls back to an
  adjacent-pair window (±10) and emits an `info` issue so the degradation
  is visible.
- **Trim / XML tag preservation**: `<rule>...</rule>` and similar structured
  tags are no longer mangled to `<Rule>...</rule>` by the post-trim
  re-capitalize step. Any sentence that starts with `<` now bypasses the
  first-letter-uppercase transform, which also protects `<system>`,
  `<thinking>`, `<example>` style Anthropic-structured prompts.
- **Trim / JSON + YAML indentation**: the prose trimmer no longer collapses
  significant whitespace in structured inputs. A new `looksJsonLike()`
  heuristic (first char `{`/`[` or >30% structural/key-value lines) causes
  `lint()` to return the original text verbatim as `trimmed` and flag the
  result with `jsonLikeInput: true`. Safe drop-in for MCP agents that feed
  JSON or YAML system prompts through the linter.

### Added

- **README**: `Quick demo` section directly below the tagline, showing the
  actual `node src/cli.mjs examples/bad-prompt.md` output plus a `--trim`
  before/after example. Includes a TODO marker for the asciinema cast.
- **README**: shields.io badges (MIT, Node >=18, MCP compatible, release
  v0.1.1) rendered immediately under the title.
- **`CHANGELOG.md`**: this file. Keep-a-Changelog format.
- **`package.json`**: `prepublishOnly` script (self-lint + trivial smoke
  `lint('test')`) and a `bugs.url` field pointing at the GitHub issue
  tracker.

### Changed

- **`package.json`**: version bumped to `0.1.1`.

## [0.1.0] — 2026-04-24

Initial public release.

### Added

- Pure-JS static analyzer for English AI prompts (zero runtime deps
  other than the MCP SDK).
- Five rules: `contradiction` (error), `redundancy` (warn),
  `long-example` (warn), `ambiguous-pronoun` (info),
  `trailing-fluff` (info).
- Six contradiction pair labels: `length`, `tone`, `frequency`,
  `prohibition`, `commenting`, `asking`.
- Sentence-aware trimmer with fenced-code-block masking, inline
  quote / backtick masking, verb-based sentence preservation, and a
  non-empty-output safety fallback (`trimmerFallback: true`).
- Severity-based score ceilings (red zone ≤59 on any error, yellow
  zone ≤79 on ≥2 warns) plus flat per-issue deduction.
- CLI in three modes: default human report (3-line header, colored
  severity tags, suggestions, samples), `--json`, `--trim`.
- CLI flags: `--rules`, `--help`, `-`/stdin, `NO_COLOR` auto-detect.
- Exit-code contract: `0` clean, `1` at least one error, `2` bad usage.
- MCP server (`src/mcp.mjs`) exposing `lint_prompt` and `trim_prompt`
  tools. Each returns a two-part `text` content array: a human
  one-liner plus the full JSON (for `JSON.parse` by agents).
- `examples/good-prompt.md` (score 100/100) and `examples/bad-prompt.md`
  (score 14/100) as regression anchors.
- Docs: `README.md` with Why / Install / CLI / MCP / Rules / Pricing /
  Development / Community sections, plus `docs/promo/` drafts.

[0.1.1]: https://github.com/sean-sunagaku/promptlint-mcp/releases/tag/v0.1.1
[0.1.0]: https://github.com/sean-sunagaku/promptlint-mcp/releases/tag/v0.1.0
