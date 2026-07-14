# OIDC setup for GitHub Actions → Azure (no client secret)

## Prerequisites

- Azure CLI logged in with permission to create Entra apps and assign roles
- GitHub repo: `shimejinote/kinsho`
- Resource group: `rg-kinsho` (already exists)

## 1. Create Entra ID app + service principal

```powershell
$appName = "kinsho-github-oidc"
$appId = az ad app create --display-name $appName --query appId -o tsv
$spObjectId = az ad sp create --id $appId --query id -o tsv
Write-Output "AZURE_CLIENT_ID=$appId"
Write-Output "SP_OBJECT_ID=$spObjectId"
```

## 2. Federated credential (GitHub main branch)

```powershell
$appId = "<AZURE_CLIENT_ID from step 1>"
$repo = "shimejinote/kinsho"

az ad app federated-credential create --id $appId --parameters "{
  `"name`": `"github-kinsho-main`",
  `"issuer`": `"https://token.actions.githubusercontent.com`",
  `"subject`": `"repo:${repo}:ref:refs/heads/main`",
  `"audiences`": [`"api://AzureADTokenExchange`"],
  `"description`": `"GitHub Actions OIDC for kinsho main`"
}"
```

(Optional) Allow `workflow_dispatch` from any branch / PRs later by adding more credentials with subjects like `repo:shimejinote/kinsho:pull_request`.

## 3. Contributor on `rg-kinsho`

```powershell
$subscriptionId = "2fb349dd-a811-4608-893a-714e33b4ae3b"
$spObjectId = "<SP_OBJECT_ID from step 1>"

az role assignment create `
  --assignee-object-id $spObjectId `
  --assignee-principal-type ServicePrincipal `
  --role Contributor `
  --scope "/subscriptions/$subscriptionId/resourceGroups/rg-kinsho"
```

## 4. GitHub repository secrets (no passwords)

```powershell
$tenantId = az account show --query tenantId -o tsv
$subscriptionId = "2fb349dd-a811-4608-893a-714e33b4ae3b"
$appId = "<AZURE_CLIENT_ID>"

gh secret set AZURE_CLIENT_ID --repo shimejinote/kinsho --body $appId
gh secret set AZURE_TENANT_ID --repo shimejinote/kinsho --body $tenantId
gh secret set AZURE_SUBSCRIPTION_ID --repo shimejinote/kinsho --body $subscriptionId
```

SWA deploy token is **fetched at runtime via OIDC** in `.github/workflows/deploy.yml` (no need to store `AZURE_STATIC_WEB_APPS_API_TOKEN` for main deploys). Keep the existing SWA token secret only if you still use the legacy PR workflow.

## Pipeline

`.github/workflows/deploy.yml` on `main` push:

1. `azure/login@v2` (OIDC)
2. `azure/arm-deploy@v2` → `infra/resources.bicep` (RG scope)
3. Build Next.js static export
4. Deploy SWA + managed API
