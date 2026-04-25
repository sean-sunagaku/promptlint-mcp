# X — 3-tweet thread

## Tweet 1
Most "prompt engineering" advice is vibes. So I wrote a static linter for AI prompts.

It catches the boring stuff: contradictions, redundancy, ambiguous pronouns, oversized examples, politeness fluff.

CLI + MCP server. Zero network, zero LLM calls.
https://github.com/sean-sunagaku/promptlint-mcp

## Tweet 2
The fun rule is `contradiction`. Real system prompts in the wild ship pairs like:
- "be concise" ↔ "be thorough"
- "do not comment" ↔ "explain each step"
- "never ask the user" ↔ "ask the user when unclear"

Promptlint flags them as `error` and clamps your score to 59/100 if any exist.

## Tweet 3
Meta: I built this with an AI auto-improvement loop.
Customer AI uses the tool → writes feedback. Developer AI reads feedback → patches code. Repeat.

Three rounds took it from "trust 2/5" to ship.
Loop framework, prompts, persona spec:
https://github.com/sean-sunagaku/ai-auto-improve-app
