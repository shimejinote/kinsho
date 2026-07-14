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
- `robots.txt` で `/api/` を Disallow
- ヘルスの詳細ログを抑制（取り込み節約）

## それでも足りないとき（無料で強い）

**Cloudflare Free** をカスタムドメインの前に置くと、Bot Fight・レート制限・簡易 WAF が使えます（Azure クォータ不要）。

1. 独自ドメインを Cloudflare に移管（または DNS だけ委譲）
2. SWA にカスタムドメインを追加（Bicep / CLI）
3. Cloudflare で:
   - Security → Bots → Bot Fight Mode ON
   - Rate limiting rule: `/api/*` など
   -（任意）Under Attack Mode は緊急時のみ

## 将来 Functions が使えるようになったら

`dailyMemoryTimeQuota=10000` のキルスイッチが API 実行量そのものを日次で止められます。
