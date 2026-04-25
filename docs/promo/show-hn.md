# Show HN

## Title
Show HN: Promptlint – static linter for AI prompts (CLI + MCP server)

## URL
https://github.com/sean-sunagaku/promptlint-mcp

## Text (optional, only if no URL — leave blank if URL is filled)
*Skip — URL post.*

## First comment (post immediately after submission)

I built this because every system prompt I read had at least one contradiction sitting silently in it ("be concise" + "be thorough", "do not comment" + "explain each step"). The model picks one, but you pay tokens for both.

Five rules, ~300 lines of Node, zero network, MIT:

- **contradiction** — paired opposing directives across length/tone/frequency/prohibition/commenting/asking
- **redundancy** — near-duplicate sentences via Jaccard similarity (code-block-masked so examples don't false-positive)
- **ambiguous-pronoun** — `it/this/that` without a mid-sentence referent
- **long-example** — fenced code over ~30 lines / 1200 chars
- **trailing-fluff** — please / thanks / I hope this helps / let me know if…

It ships as a CLI (`--json` / `--trim` / stdin) and as a Model Context Protocol server, so Claude Code / Cursor agents can lint prompts before passing them to a subagent.

The trimmer is sentence-aware and verb-aware: it drops "Thank you for helping" but keeps "Refactor the code." Pure-fluff input returns the original with `trimmerFallback: true` so you never accidentally hand a blank prompt to your LLM.

Meta-note: I built it with an AI auto-improvement loop — one Claude session plays "Customer AI" and writes feedback after using the tool; another plays "Developer AI" and patches the code. Three rounds got it from "trust 2/5, trim destroys sentences" to ship-ready. The loop framework is open-sourced separately: https://github.com/sean-sunagaku/ai-auto-improve-app

Pro tier (team rule dictionary, lint history, CI integration) is planned. Today everything is free/OSS.

Happy to add contradiction pairs you've been bitten by — drop them in the comments or open an issue.
