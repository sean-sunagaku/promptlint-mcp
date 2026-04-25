---
title: "I shipped an OSS package using only AI agents (here's the diff)"
published: false
description: "Two AI agent teams — one builds, one launches — took promptlint-mcp from empty repo to npm v0.1.2 with awesome-mcp PRs, Discussions threads, OG images, and CHANGELOG, with one manual step (npm 2FA) along the way."
tags: ai, opensource, productivity, javascript
canonical_url: https://github.com/sean-sunagaku/promptlint-mcp
cover_image: https://raw.githubusercontent.com/sean-sunagaku/promptlint-mcp/main/docs/promo/assets/og.png
---

> ⚠ Submission target: dev.to (primary), hashnode + Zenn (mirror).
> Set `published: true` after a final readthrough. Replace `<token>` in dev.to API publish step.

## TL;DR

I built [promptlint-mcp](https://github.com/sean-sunagaku/promptlint-mcp) — a static linter for AI prompts (CLI + MCP server) — by chaining two AI agent teams together:

1. **[ai-auto-improve-app](https://github.com/sean-sunagaku/ai-auto-improve-app)** — _Customer AI_ uses the tool, writes a feedback file. _Developer AI_ reads the feedback, patches the code. Repeat. 7 rounds of customer × 5 of developer.
2. **[ai-launch-team](https://github.com/sean-sunagaku/ai-launch-team)** — 5 sub-agents (strategist / copy / assets / publish / metrics) executed npm publish, GitHub Release, awesome-mcp PRs ×2, Discussions threads ×2, OG/avatar SVG→PNG, social copy drafts.

The only manual steps were the platform-mandated SMS/OTP gates (npm 2FA setup, X account creation if needed). Everything else was Claude.

## Why this is different from "vibe-coding a project"

Most "I built X with AI" posts are about the **build** loop. This one is about the **release** loop too.

Three things mattered:

### 1. Customer AI is _strict_, not encouraging

The customer agent is told to use emotion words ("だるい", "気持ちいい", "裏切られた") and rate `Trust: 2/5` if the tool's `--trim` mode produces broken English. It's also told what NOT to touch ("Don't touch list") so the developer agent doesn't churn good code on each round.

Round 1 customer caught a real bug:

> `"Thank you for helping the user with this task."` was being trimmed to `" for helping the user with this task."` — orphan space, lowercase start. The developer agent had to introduce sentence-aware fluff removal in Round 1, then verb-aware sentence preservation in Round 2 (when 2-word imperatives like "Refactor the code." started disappearing).

The diff is in the git log: [`round-001`, `round-002`, `round-003`, `round-005`](https://github.com/sean-sunagaku/promptlint-mcp/commits/main).

### 2. Promote-gate is a separate loop

After "the product works" (`Round 4: SHIP YES`), there's a separate Round 5 customer that asks: "If you saw this on Hacker News, would you `npm install` it?"

Round 5 said NO — README still said _"Not on npm yet"_. So the loop kept rolling: Round 5 developer published to npm, Round 6 customer verified, Round 7 customer ran a cold-start `npm install -g` and rated it 5/5 across all axes.

This is the part that vibe-coding never gets to. Without the promote-gate, you ship something that "compiles" but isn't actually distributable.

### 3. Distribution-publisher closes 80% of the launch

The launch agent automated:

- `npm publish --access public` (with a Granular Access Token + Bypass-2FA in `~/.npmrc`)
- `gh release create v0.1.2 --notes-file CHANGELOG.md`
- `gh repo fork punkpeye/awesome-mcp-servers` → branch → bullet → PR with `🤖🤖🤖` per their CONTRIBUTING fast-track
- Same again for `awesome-mcp-devtools`
- `gh api graphql createDiscussion` ×2 with seed threads (Welcome + "suggest a contradiction pair")
- `pinIssue` mutation to pin the Pro early-access Issue

What it _can't_ do without human help: post to Hacker News / X / Reddit. Those need a logged-in browser session. With the [Claude in Chrome extension](https://claude.ai/chrome) installed, even that becomes a 1-click confirm rather than 30 seconds of copy-paste.

## What promptlint-mcp actually does

5 rules, 6 contradiction-pair labels, ~300 lines of pure JS:

```text
$ npx -p promptlint-mcp promptlint examples/bad-prompt.md
  score  14/100
  tokens 367 → 307 (-60, 16% saved)
  issues 14

  error  [contradiction] Contradicting directives (length): "concise" vs "detailed"
  error  [contradiction] Contradicting directives (commenting): "do not add comments" vs "explain each step"
  warn   [long-example] Code example is 783 chars
  info   [trailing-fluff] "thanks" fluff (match 1 of 2)
  ...
```

`--trim` returns a sentence-aware cleaned version. `--json` for programmatic use. MCP server exposes `lint_prompt` and `trim_prompt` so Claude Code agents can lint their own subagent prompts before spawning them.

```sh
claude mcp add promptlint -- npx -y promptlint-mcp
```

## Cost / time

- ~6 hours of Claude session time (single conversation, with sub-agents)
- 0 tokens spent on stack-overflow searches
- 1 OTP entry (npm 2FA the first time) — afterwards a token in `.npmrc` made it fully autonomous
- 1 token for the `Granular Access Token` (revocable, scoped to one package)

## What's free and what's not

- **All of [`promptlint-mcp`](https://github.com/sean-sunagaku/promptlint-mcp)** — MIT, 5 rules, both binaries, MCP server. Free.
- **The [auto-improve loop](https://github.com/sean-sunagaku/ai-auto-improve-app)** — MIT, Customer/Developer prompts + loop.sh. Free.
- **The [launch team](https://github.com/sean-sunagaku/ai-launch-team)** — MIT, 5 agents + 11 channel templates + 3 playbooks. Free.

A Pro tier for promptlint is **planned** (team rule dictionary, lint history, CI integration) but not shipped — track interest on [Issue #1](https://github.com/sean-sunagaku/promptlint-mcp/issues/1).

## Try it

```sh
npm install -g promptlint-mcp
promptlint your-system-prompt.md
```

If it finds something embarrassing, post it (anonymized) on the [Discussions thread](https://github.com/sean-sunagaku/promptlint-mcp/discussions/4) — those become the next round of contradiction pairs.

---

## How to publish to dev.to (auto)

1. Get a token: https://dev.to/settings/extensions → API Keys → "Generate API key"
2. ```sh
   curl -X POST https://dev.to/api/articles \
     -H "api-key: $DEVTO_TOKEN" \
     -H "content-type: application/json" \
     --data @- <<JSON
   { "article": { "title": "...", "body_markdown": "...", "tags": ["ai","opensource"], "published": true } }
   JSON
   ```
3. Or paste the body of this file (after stripping the `## How to publish` section) into the dev.to web editor.

Mirror to:
- **hashnode**: same Markdown, paste into editor.
- **Zenn**: convert frontmatter to Zenn format (`title:` `topics:` `type: tech` `published: true`).
- **Medium**: less ideal — Markdown formatting drifts.
