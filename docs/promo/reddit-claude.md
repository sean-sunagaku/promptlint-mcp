# Reddit — r/ClaudeAI

## Title
I built an MCP server that lints your Claude system prompts (catches contradictions, saves tokens)

## Body

Sharing a small open-source thing: **promptlint-mcp**.

It's a Model Context Protocol server (and CLI) that statically analyzes prompt text and flags:

- **Contradictions** — `"be concise"` + `"be thorough"` in the same prompt silently kills accuracy and you keep paying tokens for both
- **Near-duplicate sentences** — you wrote the same instruction twice with different wording
- **Ambiguous pronouns** — `"use it"` / `"handle that"` with no referent in scope
- **Oversized code examples** — Claude doesn't need 50 lines of pasted code in the system prompt
- **Politeness fluff** — `Please`, `Thanks`, `I hope this helps`, `Let me know if…`

Output is a score (0–100), an issue list with line numbers, and a sentence-aware trimmed version. The trimmer never returns empty (drops `"Thank you for helping"` but keeps `"Refactor the code."`).

Zero network. Zero LLM calls. MIT.

### Use it

```sh
git clone https://github.com/sean-sunagaku/promptlint-mcp.git
cd promptlint-mcp && npm install
claude mcp add promptlint -- node "$(pwd)/src/mcp.mjs"
```

Then your Claude Code session can call `lint_prompt` and `trim_prompt` on its own subagent prompts before spawning them.

### Repo
https://github.com/sean-sunagaku/promptlint-mcp

### How it was built (meta)
End-to-end via an AI auto-improvement loop: one Claude session plays "Customer AI" and writes feedback after using the tool; another plays "Developer AI" and patches code. Three rounds. Each round is a commit in the history. Loop framework: https://github.com/sean-sunagaku/ai-auto-improve-app

What contradiction pair would you add to the default rules?
