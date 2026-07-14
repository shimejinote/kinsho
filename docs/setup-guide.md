# kinsho 構築ガイド（Azure + GitHub Actions）

この手順で、Bicep によるインフラ作成から Next.js 静的サイトの CI/CD までを一気通貫で行います。

## 前提

- Azure サブスクリプション（共同作成者以上）
- Azure CLI (`az`) 2.50+
- Node.js 20+
- GitHub リポジトリ（本コードを push 済み）
- （任意）[Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) v4

Windows PowerShell 例を主に記載します。Bash でも同等です。

---

## 1. リポジトリ準備

```powershell
cd c:\Users\seq\apps\kinsho
git init
git add .
git commit -m "chore: bootstrap kinsho multi-spa Azure foundation"
# GitHub にリモートを作成して push
gh repo create kinsho --private --source=. --remote=origin --push
```

---

## 2. Azure ログインとサブスクリプション選択

```powershell
az login
az account set --subscription "<SUBSCRIPTION_ID_OR_NAME>"
az account show --query "{name:name, id:id}" -o table
```

Bicep のインストール確認:

```powershell
az bicep version
# 古い場合
az bicep install
```

---

## 3. Bicep でインフラをデプロイ

既定パラメータ（`infra/main.bicepparam`）:

- リソースグループ: `rg-kinsho`
- Functions / 監視: `japaneast`
- Static Web Apps: `eastasia`（**Free SKU は japaneast 非対応**）
- SWA SKU: `Free`
- スタンドアロン Functions: **オン**（`dailyMemoryTimeQuota` キルスイッチ付き）。Y1 クォータが 0 の場合はクォータ申請が必要。それまでは `deployStandaloneFunctionApp=false` で SWA マネージド `api/` を使う
- Cost Management 予算: RG 月次アラート（`alertEmail` 必須、`budgetAmount` 既定 `1`）
- linkedBackends: 無効（Free では不可）

```powershell
cd c:\Users\seq\apps\kinsho

az deployment sub create `
  --name kinsho-infra `
  --location japaneast `
  --template-file infra/main.bicep `
  --parameters infra/main.bicepparam `
    alertEmail='you@example.com' `
    budgetAmount=1 `
    dailyMemoryTimeQuota=10000 `
    deployStandaloneFunctionApp=true `
  --query properties.outputs `
  -o json
```

- `alertEmail` は実在する通知先メールに置き換えてください（必須）。
- `budgetAmount` の単位はサブスクリプションの請求通貨です。USD 契約なら `1` ≈ $1。JPY 契約で約100円にしたい場合は `budgetAmount=100` を渡します。
- `dailyMemoryTimeQuota=10000` は日次 GB-s 上限（キルスイッチ）。毎日キャップしても月間無料枠 400,000 GB-s 未満に収まります。

デプロイ後、出力から次を控えます。

| Output | 用途 |
|--------|------|
| `staticWebAppName` | デプロイ トークン取得 |
| `staticWebAppHostname` | 公開 URL |
| `functionAppName` | BYO Functions デプロイ用 |
| `budgetName` | Cost Management 予算 |

リソース確認:

```powershell
az resource list -g rg-kinsho -o table
```

作成される主なリソース:

- `Microsoft.Web/staticSites` — Static Web Apps (Free)
- `Microsoft.Web/sites` + `serverfarms` (Y1) — Functions Consumption（`dailyMemoryTimeQuota`）
- `Microsoft.Storage/storageAccounts` — Functions 必須ストレージ
- `Microsoft.OperationalInsights/workspaces` + `Microsoft.Insights/components` — 監視
- `Microsoft.Consumption/budgets` — RG 月次予算アラート

### （任意）Standard + linkedBackends

`/api` プロキシを外部 Functions に寄せる場合のみ:

```powershell
az deployment sub create `
  --name kinsho-infra-std `
  --location japaneast `
  --template-file infra/main.bicep `
  --parameters infra/main.bicepparam `
    staticWebAppSku=Standard `
    linkFunctionAppAsBackend=true
```

---

## 4. Static Web Apps デプロイ トークンを取得

```powershell
$swaName = az deployment sub show `
  --name kinsho-infra `
  --query properties.outputs.staticWebAppName.value -o tsv

az staticwebapp secrets list `
  -n $swaName `
  -g rg-kinsho `
  --query "properties.apiKey" -o tsv
```

表示された値を GitHub Secret `AZURE_STATIC_WEB_APPS_API_TOKEN` に登録します。

```powershell
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "<API_KEY>"
```

---

## 5. GitHub Actions 用の Entra ID アプリ（OIDC）— IaC / Functions 用

SWA の静的＋マネージド API デプロイだけなら **手順 4 のトークンで十分**です。  
`infra.yml` や `deploy-functions.yml` を使う場合は OIDC を追加します。

```powershell
$subscriptionId = az account show --query id -o tsv
$repo = "<GITHUB_ORG_OR_USER>/kinsho"   # 例: seq/kinsho

# App registration
$appId = az ad app create --display-name "kinsho-github-oidc" --query appId -o tsv
$spId = az ad sp create --id $appId --query id -o tsv

# Federated credential (main branch)
az ad app federated-credential create --id $appId --parameters "{
  `"name`": `"kinsho-main`",
  `"issuer`": `"https://token.actions.githubusercontent.com`",
  `"subject`": `"repo:${repo}:ref:refs/heads/main`",
  `"audiences`": [`"api://AzureADTokenExchange`"]
}"

# Contributor on the resource group
az role assignment create `
  --assignee-object-id $spId `
  --assignee-principal-type ServicePrincipal `
  --role Contributor `
  --scope "/subscriptions/$subscriptionId/resourceGroups/rg-kinsho"

# Subscription-scoped deploy (resource group 作成を含む) なら Contributor を subscription にも付与
az role assignment create `
  --assignee-object-id $spId `
  --assignee-principal-type ServicePrincipal `
  --role Contributor `
  --scope "/subscriptions/$subscriptionId"
```

GitHub Secrets:

```powershell
$tenantId = az account show --query tenantId -o tsv
$funcName = az deployment sub show --name kinsho-infra --query properties.outputs.functionAppName.value -o tsv

gh secret set AZURE_CLIENT_ID --body $appId
gh secret set AZURE_TENANT_ID --body $tenantId
gh secret set AZURE_SUBSCRIPTION_ID --body $subscriptionId
gh secret set AZURE_FUNCTIONAPP_NAME --body $funcName
```

---

## 6. アプリの CI/CD（既定パス: SWA Free + マネージド API）

ワークフロー: `.github/workflows/azure-static-web-apps.yml`

- `web/` を `output: 'export'` でビルド → `web/out`
- `api/` を SWA マネージド Functions として同時デプロイ
- フロントからは相対パス `/api/health` で呼び出し（`NEXT_PUBLIC_API_BASE_URL` は空）

`main` へ push:

```powershell
git add .
git commit -m "ci: enable static web apps deploy"
git push -u origin main
```

Actions 完了後:

```text
https://<staticWebAppHostname>/
https://<staticWebAppHostname>/sample-app/
https://<staticWebAppHostname>/api/health
```

---

## 7. （任意）BYO Consumption Function App を使う場合

1. `.github/workflows/deploy-functions.yml` を実行（OIDC + `AZURE_FUNCTIONAPP_NAME` が必要）
2. Function App の CORS に SWA オリジンを追加:

```powershell
$swaHost = az deployment sub show --name kinsho-infra --query properties.outputs.staticWebAppHostname.value -o tsv
$funcName = az deployment sub show --name kinsho-infra --query properties.outputs.functionAppName.value -o tsv

az functionapp cors add -g rg-kinsho -n $funcName --allowed-origins "https://$swaHost"
```

3. GitHub Actions または SWA のアプリ設定で:

```text
NEXT_PUBLIC_API_BASE_URL=https://<functionAppHostname>
```

静的エクスポートではビルド時に埋め込まれるため、Actions の `web` ビルドステップで `env:` を渡すか、相対 `/api`（マネージド API / Standard linked）を使う方が単純です。

---

## 8. ローカル開発

### Frontend のみ

```powershell
cd web
Copy-Item .env.example .env.local
npm install
npm run dev
# http://localhost:3000/sample-app/
```

### Frontend + API（SWA CLI 推奨）

```powershell
npm install -g @azure/static-web-apps-cli
cd web
npm install
npm run build

cd ..\api
Copy-Item local.settings.json.example local.settings.json
npm install
npm run build

cd ..
swa start ./web/out --api-location ./api
# http://localhost:4280
```

---

## 9. 新しい独立 SPA を量産する

```text
web/app/<new-app>/
  layout.tsx   # そのアプリだけの UI シェル
  page.tsx     # エントリ
```

チェックリスト:

- [ ] ルートの共通ヘッダー／フッターを追加していない
- [ ] `trailingSlash: true` 前提で内部リンクは末尾 `/` 付き
- [ ] クライアント側の動的ルートがある場合は `staticwebapp.config.json` に rewrite を追加
- [ ] 共有 API は `/api/...`（または `NEXT_PUBLIC_API_BASE_URL`）経由

---

## 10. 運用メモ（コスト）

| リソース | 目安 |
|----------|------|
| SWA Free | $0（帯域・サイズ上限あり） |
| Functions Consumption | 実行に応じた従量（月間無料枠あり）。`dailyMemoryTimeQuota=10000` で日次キルスイッチ |
| Storage Standard_LRS | 僅少 |
| Log Analytics | 取り込み従量（保持 30 日設定済み） |
| Cost Management Budget | RG 月次キャップ（既定 1）。50% / 80% / 100% Actual + 100% Forecasted で `alertEmail` に通知 |

マネージド API だけ使う場合は `deployStandaloneFunctionApp=false` を渡してください。Y1 クォータ未付与のサブスクリプションでは Functions 作成が失敗します。
---

## トラブルシュート

| 症状 | 確認 |
|------|------|
| SWA デプロイ失敗 | Secret `AZURE_STATIC_WEB_APPS_API_TOKEN`、`web/out` の存在 |
| `/api/health` が 404 | `api/` のビルド成果物（`dist/`）、`main` フィールド、マネージド API デプロイログ |
| linkedBackends 失敗 | SWA SKU が Free になっていないか |
| CORS エラー（BYO） | Function App CORS に SWA の `https://*.azurestaticapps.net` を追加したか |
| 静的ページが古い | CDN 反映待ち、または Actions の成功とブラウザキャッシュ |
