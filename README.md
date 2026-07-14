# kinsho（菌床）

関連性のない複数の単発 Web アプリ（独立 SPA）を、**1 つの Azure 環境**で安価に量産・ホストするための基盤です。

## 構成概要

| レイヤ | 技術 | 役割 |
|--------|------|------|
| Frontend | Next.js (App Router) + Tailwind + **Static Export** | `/sample-app` のようにディレクトリ単位の独立 SPA |
| Hosting | Azure Static Web Apps (**Free**) | 静的配信 + （既定）マネージド API |
| Backend | Azure Functions (**Consumption / Y1**) | 共有 API（BYO 用に Bicep で同時作成） |
| Observability | Log Analytics + Application Insights | 推奨モニタリング |
| IaC | Bicep | `rg-kinsho` 以下をコード化 |

### Free プランに関する重要な制約

Azure Static Web Apps の **Free** では、外部 Functions を `/api` にリンクする **linkedBackends（Bring Your Own Functions）は使えません**（**Standard** が必要）。

そのため本リポジトリは次の 2 経路をサポートします。

1. **推奨（最安・既定）**: SWA Free の **マネージド API**（リポジトリの `api/` を SWA がホスト）
2. **BYO**: Bicep で用意した Consumption Function App を直接 URL 呼び出し（CORS）／または SWA を Standard にしてリンク

## ディレクトリ

```
kinsho/
├── infra/                 # Bicep（サブスクリプション スコープ）
│   ├── main.bicep
│   ├── main.bicepparam
│   └── modules/
├── web/                   # Next.js 静的エクスポート
│   └── app/
│       ├── layout.tsx     # 共通シェル（ヘッダー等なし）
│       ├── page.tsx       # ホスト索引（ポータルではない）
│       └── sample-app/    # 独立 SPA のサンプル
├── api/                   # Azure Functions (Node 20, v4 model)
└── .github/workflows/     # IaC / SWA / Functions デプロイ
```

## クイックスタート

ローカル:

```bash
cd web && npm install && npm run dev
# 別ターミナル
cd api && cp local.settings.json.example local.settings.json && npm install && npm start
```

Azure 構築〜CI/CD の手順は [docs/setup-guide.md](docs/setup-guide.md) を参照してください。

## 新しい SPA の追加手順

1. `web/app/sample-app` を `web/app/<your-app>` に複製
2. そのアプリ専用の `layout.tsx` / `page.tsx` で UI を完結させる（共通ヘッダーは作らない）
3. 必要なら `web/public/staticwebapp.config.json` にクライアント側ルート用 rewrite を追加
4. `main` へ push → GitHub Actions が `web/out` を SWA へデプロイ
