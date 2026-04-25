# PR text for awesome-mcp lists

Target lists (open a PR per repo):

- https://github.com/punkpeye/awesome-mcp-servers
- https://github.com/wong2/awesome-mcp-servers
- https://github.com/appcypher/awesome-mcp-servers
- https://github.com/modelcontextprotocol/servers (community section if applicable)

## PR title
Add promptlint-mcp (static linter for AI prompts)

## PR body
Adds [`promptlint-mcp`](https://github.com/sean-sunagaku/promptlint-mcp), a static linter for AI prompts.

It detects contradictions, redundancy, ambiguous pronouns, oversized examples, and politeness fluff in system prompts and agent instructions. Returns a score + issue list + sentence-aware trimmed text. Zero network, zero LLM calls. CLI + MCP server. MIT.

Tools exposed:
- `lint_prompt(text)` → score, issues, trimmed text, token savings
- `trim_prompt(text)` → mechanically trimmed prompt (preserves quoted / backticked / fenced content)

Tested with Claude Code via `claude mcp add`.

## Bullet to insert (typical category: developer tools / static analysis / utilities)

```md
- [promptlint-mcp](https://github.com/sean-sunagaku/promptlint-mcp) - Static linter for AI prompts. Catches contradictions, redundancy, ambiguity, long examples, and politeness fluff. CLI + MCP server. Zero network, MIT.
```

## Alternative shorter bullet (for tight lists)

```md
- [promptlint-mcp](https://github.com/sean-sunagaku/promptlint-mcp) - Lint AI prompts: contradictions, fluff, token savings. Pure static, zero network.
```
