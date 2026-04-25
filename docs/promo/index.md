# Promo content drafts

各ファイルは「ブラウザで該当サービスを開いて貼り付ける」前提のドラフト。
URL の最終確認・投稿ボタン押下は人間 or Computer-Use セッションで実行する。

| File | Where | Notes |
| ---- | ----- | ----- |
| `x-single.md`        | https://x.com/compose/post                    | 1 ツイート版（〜280 chars） |
| `x-thread.md`        | https://x.com/compose/post                    | 3 ツイートのスレッド |
| `show-hn.md`         | https://news.ycombinator.com/submit           | Show HN 規約に従ったタイトル + 本文 |
| `reddit-claude.md`   | https://www.reddit.com/r/ClaudeAI/submit      | r/ClaudeAI 向け、フランクな文体 |
| `reddit-localllama.md` | https://www.reddit.com/r/LocalLLaMA/submit  | r/LocalLLaMA 向け、ゼロネットワーク強調 |
| `awesome-mcp-pr.md`  | https://github.com/punkpeye/awesome-mcp-servers (fork → PR) | 1 行掲載用 markdown bullet |
| `producthunt.md`     | https://www.producthunt.com/products/new      | ProductHunt 用タイトル/タグライン/説明 |

## 投稿順序の推奨

1. **awesome-mcp-pr** — PR 作って審査待ちにしておく（merge まで時間がかかる）
2. **GitHub Discussions の Welcome 投稿** — 自リポジトリで作っておく
3. **Show HN** — 朝 7:00–9:00 PT の月〜木が前線に乗りやすい
4. **X single tweet** — Show HN 投稿の 5–10 分後（HN URL 同梱）
5. **r/ClaudeAI / r/LocalLLaMA** — HN が伸びてから（Reddit は重複ソースに厳しい）
6. **X thread** — HN 結果が判明した翌日に「ループで作った話」を主軸で
7. **ProductHunt** — 1 週間後を目処に、星が 50+ 付いてから

## アカウント前提

- GitHub: 既存 `sean-sunagaku` 使用
- X / HN / Reddit / ProductHunt: ユーザーの既存アカウントが必要。ない場合は事前作成（電話・メール認証要）。
- Computer-Use / claude-in-chrome MCP でブラウザ操作 → 投稿フォームに貼付け → 最終 send 確認まで自動化可。
