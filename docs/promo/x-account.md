# X — 専用アカウント設計書

`promptlint-mcp` の宣伝・運用用の X アカウントを別途作る前提のドラフト。
ユーザー個人アカウントから切り離し、プロダクトのコミュニティハブとして機能させる。

---

## アカウント仕様

### Display name 候補
- `Promptlint` ← 第一候補（短い、覚えやすい）
- `Promptlint MCP`
- `Promptlint · AI prompt linter`

### Handle (`@`) — 推奨確定順
**第一候補: `@promptlint_mcp`** （プロダクト名と完全一致、`mcp` で技術者向けの意図が伝わる、絵文字含めて 14 chars でリプライ時に圧迫しない）

取れない場合の優先順位:
1. `@promptlint_mcp` ← 推奨
2. `@promptlint` （短くてベスト、ただし汎用語で取得済みの可能性高）
3. `@promptlintdev` （個人開発者の自己主張寄り）
4. `@promptlintapp`
5. `@promptlinthq` （複数人運営感）

> X は handle 検索 API を未認証で叩けない。空き確認は手動でブラウザから `x.com/promptlint_mcp` 等を開いて 404 を確認する。AI 側からは claude-in-chrome 経由で同じことをやれる（`mcp__claude-in-chrome__navigate` → ページが「This account doesn't exist」を返せば空き）。

### Bio (160 chars)
```
Static linter for AI prompts. Catches contradictions, strips fluff, saves tokens. CLI + MCP server for Claude Code & Cursor. OSS · MIT.
```
(135 chars — 余白あり、emoji 1〜2 個追加可)

絵文字入り版:
```
🔍 Static linter for AI prompts. Catches contradictions · strips fluff · saves tokens. CLI + MCP server for Claude Code / Cursor. OSS · MIT.
```

### Location
`Open Source` or `MCP ecosystem`

### Website
`https://github.com/sean-sunagaku/promptlint-mcp`

### Birthday
プロダクト初リリース日: 2026-04-24

---

## ビジュアル

### Generated assets (確定版、`./assets/` に同梱)
| 用途 | ファイル | サイズ |
| ---- | -------- | ------ |
| Profile picture | [`assets/avatar-400.png`](./assets/avatar-400.png) | 400×400 |
|                 | [`assets/avatar-256.png`](./assets/avatar-256.png) | 256×256 (フォールバック) |
| X header | [`assets/x-header.png`](./assets/x-header.png) | 1500×500 |
| OG image (HN/Reddit/PH) | [`assets/og.png`](./assets/og.png) | 1200×630 |
| SVG ソース | `assets/avatar.svg`, `assets/x-header.svg`, `assets/og.svg` | — |

ロゴモチーフ: ターミナルプロンプト記号 `>_` を主体に、緑のチェックマークバッジで「lint = pass / fail を一目で示す」を表現。配色は GitHub のダーク UI（#0d1117 / #3fb950）に寄せて開発者文化に馴染ませる。

修正したい場合は `assets/*.svg` を編集 → `rsvg-convert -w <px> -h <px> -o <name>.png <name>.svg` で再生成。

### Pinned tweet
[x-single.md](./x-single.md) の本文をそのまま使用。
画像添付: `assets/og.png`（CLI 出力をデザインしたもの）。

---

## 運用ポリシー

### 投稿頻度
- 週 2〜3 回（火・木・土の 9:00 JST = 17:00 PT 前夜が無難）
- リリース時のみ追加投稿

### トピック・ローテーション
1. **「prompt の罠」シリーズ** — 実在する prompt の悪手を 1 つ取り上げ、promptlint がどう検出するかを screenshot 付きで紹介
2. **新ルール追加のお知らせ** — `v0.1.x` リリースごとに 1 投稿
3. **AI ツール連携 Tip** — Claude Code / Cursor / Windsurf に MCP として組み込む使い方
4. **メタネタ** — auto-improve loop で何ラウンド回ったか、どのフィードバックが効いたか

### トーン
- フランクでデータドリブン。スコア・トークン削減数を必ず数字で出す。
- 罵倒はしない（誰の prompt でも晒さない、合成例で語る）。
- ハッシュタグは控えめ: `#AI` `#PromptEngineering` `#MCP` `#OSS` のうち 1〜2 個。

### 関わるアカウント（mention OK）
- `@AnthropicAI` `@AnthropicAIJP` — Claude / MCP 関連リリース時
- `@cursor_ai` — Cursor 連携の話題
- `@simonw` — prompt eng / lint コミュニティの著名人
- `@swyx` — AI Engineer 系
- `@karpathy` — 大物、relevant な時のみ

### NG 行動
- DM 経由のスパム
- フォロワー買い
- 競合（他 MCP）のディスり
- 「Pro tier 課金してください」直球（Issue #1 経由で誘導）

---

## 立ち上げシーケンス（Day 0–7）

### Day 0（アカウント作成）
1. **電話番号認証** — ユーザー手動。AI 自動化不可。
2. Display name / handle / bio 入力
3. プロフィール画像 + ヘッダーアップロード
4. Pinned tweet 投稿（[x-single.md](./x-single.md)）
5. フォロー: `@AnthropicAI`、`@cursor_ai`、`@simonw`、関連プロダクト 10 件

### Day 1
- "prompt の罠 #1: 矛盾"
  - 例: `"be concise" + "be thorough"` を含む合成 prompt の screenshot
  - promptlint で error 検出 + score 14/100 の screenshot
  - Repo URL

### Day 3
- "prompt の罠 #2: 冗長"
  - 同じ意味の文を 2 回書いている例 → redundancy warn の screenshot

### Day 5
- 連携 Tip: `claude mcp add promptlint -- node …/src/mcp.mjs` のコマンド + Claude Code でのデモ動画 (asciinema or 短い MP4)

### Day 7
- メタ投稿: "Built this with an AI auto-improvement loop. 4 rounds, here's the diff." — round-001〜round-003 の commit hash と修正概要をスレッドで

---

## Computer-Use / claude-in-chrome での運用フロー

事前条件: 上記 Day 0 を人間が完了させ、対象ブラウザで X にログイン済みであること。

各投稿時の自動化:

1. AI が `docs/promo/x-*.md` の最新ドラフトを生成 or 取得
2. claude-in-chrome MCP で `https://x.com/compose/post` を開く
3. テキストエリアにドラフトを `mcp__claude-in-chrome__form_input` で入力
4. 画像が必要なら添付（drag-and-drop / file picker）
5. **送信ボタン直前で停止** — `take_screenshot` でユーザーに最終確認を求める
6. ユーザー OK → クリック送信。NG → ドラフトを `docs/promo/sent-history/` にアーカイブして終了

> ⚠ 規約遵守: X の Automation Rules（自動投稿は API 経由か明示的な人間操作か）に従い、過剰な投稿頻度・自動 like / フォローは禁止。当面は **手動または半手動投稿のみ**。

---

## 自動化を Phase 2 に進める場合（参考）

完全自動投稿に進める場合は以下の選択肢:

- **X API v2 Free tier** — 月 1,500 ツイート上限。Developer App 申請が必要（メール審査）。
- **Buffer / Typefully** — サードパーティ予約投稿。OAuth で連携、API 申請不要。
- **GitHub Actions cron** — 上記いずれかの API キーを secrets に入れて週次投稿。

最初の 1 ヶ月は手動運用でフィードバックを観察し、トピックローテーションが安定してから自動化検討で OK。

---

## ハンドオフチェックリスト（ユーザー作業）

- [ ] X で新規アカウント作成（電話・メール認証）
- [ ] handle 取得（候補から空きを選ぶ）
- [ ] bio / location / website 入力（上記コピペ）
- [ ] プロフィール画像 + ヘッダー画像アップロード（後日 AI が生成可）
- [ ] pinned tweet 投稿（claude-in-chrome 経由で AI が代行可）
- [ ] Day 1 投稿予約 / 実行
