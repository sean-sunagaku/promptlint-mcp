# Reddit — r/LocalLLaMA

## Title
Static linter for system prompts — catches contradictions, no API keys, runs offline

## Body

Built a small static analyzer for prompt text. Useful regardless of which model you run — it never calls an LLM, never hits the network.

**What it catches:**

- Contradicting directives (`"be concise"` + `"be thorough"`, `"never ask"` + `"ask when unclear"`)
- Near-duplicate sentences (Jaccard sim > 0.6, code-block-masked so example code doesn't false-positive)
- Ambiguous `it/this/that` without a mid-sentence referent
- Code examples over 30 lines (almost always trimmable to shape-only)
- Politeness fluff (please / thanks / I hope this helps)

**Output:** score 0–100, issue list with rule IDs and severities (`error` / `warn` / `info`), and a trimmed version. Trimmer is sentence- and verb-aware — short imperatives like `"Refactor the code."` are kept; only fluff sentences get dropped.

**How it ships:**

- CLI: `node src/cli.mjs <file>`, `--json`, `--trim`, stdin (`-`)
- MCP server: tools `lint_prompt` and `trim_prompt`, register once with `claude mcp add` and your agent can self-lint subagent prompts

**Constraints:**

- Pure JS, ~300 lines core
- Only dep: `@modelcontextprotocol/sdk` (for the MCP server; CLI works without it)
- Node 18+
- MIT

**Repo:** https://github.com/sean-sunagaku/promptlint-mcp

If you run a local model and have a system prompt you keep tweaking, `node src/cli.mjs your-prompt.md` is a 5-second sanity check.

Open to rule contributions — open an issue describing the pattern you want flagged.
