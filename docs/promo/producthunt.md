# ProductHunt submission

## Name
Promptlint

## Tagline (60 chars max)
Static linter for AI prompts — save tokens, catch bugs

## Topic / Category
Developer Tools, Artificial Intelligence

## Description (260 chars max)
Static analyzer for AI prompts. Catches contradictions, redundancy, ambiguity, oversized examples, and politeness fluff. CLI + MCP server for Claude Code / Cursor. Pure JS, zero network calls, MIT-licensed. Save tokens before they ship.

## First comment (post as the maker right after launch)

Hi PH 👋 — I made promptlint because every system prompt I read had at least one silent contradiction in it.

If you set `"be concise"` and `"be thorough"` in the same prompt, the model has to pick one — but you keep paying tokens for both, every single request.

Promptlint runs static analysis on prompt text:

- **contradiction** (error) — paired opposites across 6 axes (length, tone, frequency, prohibition, commenting, asking)
- **redundancy** (warn) — duplicate-meaning sentences via Jaccard similarity
- **ambiguous-pronoun** (info) — `it`/`this` with no referent
- **long-example** (warn) — code blocks over 30 lines
- **trailing-fluff** (info) — `please`/`thanks`/`I hope this helps`

Output: score, issue list, sentence-aware trimmed text. Pure JS, no LLM calls, no network.

CLI: `node src/cli.mjs prompt.md`
MCP: `claude mcp add promptlint -- node $PWD/src/mcp.mjs`

Repo: https://github.com/sean-sunagaku/promptlint-mcp

Pro tier (team rule dictionary, CI, lint history) is on the roadmap. Today's release is free/OSS.

Meta detail: I built it with an AI auto-improvement loop (one Claude plays Customer, another plays Developer, three rounds). The loop framework is also open-source.

Happy to add new rules — drop the contradiction pair you've actually been bitten by.

## Maker reply template (for "What inspired you?")
Reading a friend's system prompt that asked the model to be concise and thorough at the same time. They had been wondering why answers felt random. promptlint takes 30 seconds to run and would have caught it on day one.

## Maker reply template (for "What's next?")
Pro tier with team-shared rule dictionary, CI integration, and a token-savings dashboard. Tracking interest at github.com/sean-sunagaku/promptlint-mcp/issues/1.

## Image / asciinema TODO
- 1280×800 OG image showing a colored CLI report with score 14/100 and the two `error` contradictions (placeholder — generate from `examples/bad-prompt.md` output)
- Optional asciinema cast of `node src/cli.mjs examples/bad-prompt.md`
