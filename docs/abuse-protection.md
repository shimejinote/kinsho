# 異常アクセス対策（無料枠前提）

Functions Consumption のクォータが取れなくても、**課金爆発**と**雑なスキャン**はかなり抑えられます。

## すでに効いているガード

| 層 | 内容 |
|----|------|
| SWA Free | 帯域・容量に上限。超えれば遅延/制限（急な従量課金にはなりにくい） |
| Budget ¥100 | `egaty@nifty.com` にアラート |
| Log Analytics 0.023 GB/日 | ログ破産を物理停止 |
| マネージド API | BYO Functions なし＝Y1 クォータ不要 |

## コード側で追加したガード

- スキャナ用パス（`.env` / `.git` / `wp-admin` 等）を 404
- CSP / Frame 拒否などのセキュリティヘッダ
- `/api/health` を IP あたり **20 req/分** に制限（429）
- `robots.ts` で主要 AI クローラーを `Disallow: /`、一般クローラーは許可（`/api/` のみ禁止）
- ヘルスの詳細ログを抑制（取り込み節約）

## shimeji.blog + Cloudflare チェックリスト

正規 URL `https://shimeji.blog` を Cloudflare Free 経由で SWA に載せる前提の運用チェック。手順の詳細は [`setup-guide.md`](setup-guide.md) の「カスタムドメイン + Cloudflare」を参照。

| 項目 | 状態の目安 |
|------|------------|
| お名前.com → Cloudflare へ NS 委譲 | Active |
| Azure SWA に `shimeji.blog`（必要なら `www`）追加 | Ready + 証明書 Valid |
| DNS: `_dnsauth` TXT（残す）、`@` / `www` CNAME → SWA | Proxied（オレンジ雲） |
| SSL/TLS | **Full (strict)** |
| Bot Fight Mode | ON |
| WAF マネージドルール（Free 範囲） | ON |
| Rate limiting `/api/*` | Free 枠内で厳しめ |
| www → apex 301 | Redirect Rule（任意） |
| Under Attack Mode | 平時 OFF / 緊急時のみ |
| SWA `globalHeaders` に HSTS / CSP / Frame 拒否 | デプロイ済みであること |
| `NEXT_PUBLIC_SITE_URL=https://shimeji.blog` | ビルド env |

確認:

- [ ] `https://shimeji.blog/` が表示される
- [ ] `https://shimeji.blog/api/health` が 200
- [ ] `https://www.shimeji.blog/` が apex に 301（設定した場合）
- [ ] Response headers に CSP / HSTS / `X-Frame-Options: DENY`
- [ ] 旧 `*.azurestaticapps.net` は当面生きる（リダイレクトは任意）

## 将来 Functions が使えるようになったら

`dailyMemoryTimeQuota=10000` のキルスイッチが API 実行量そのものを日次で止められます。
