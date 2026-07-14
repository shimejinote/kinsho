targetScope = 'subscription'

@description('Primary Azure region for resource group, Functions, and monitoring')
param location string = 'japaneast'

@description('Static Web Apps region (Free SKU is NOT available in japaneast). Closest to Japan: eastasia.')
@allowed([
  'eastasia'
  'centralus'
  'eastus2'
  'westus2'
  'westeurope'
])
param staticWebAppLocation string = 'eastasia'

@description('Resource group name')
param resourceGroupName string = 'rg-kinsho'

@description('''
Static Web Apps SKU.
- Free: cheapest; use managed API folder (api/) OR call Functions via absolute URL + CORS.
- Standard (~$9/mo): required to link an external Functions app under /api via linkedBackends.
''')
@allowed([
  'Free'
  'Standard'
])
param staticWebAppSku string = 'Free'

@description('''
Deploy a standalone Consumption Function App (BYO).
Requires App Service / Dynamic quota on the subscription.
Free-tier SWA managed API (repo api/) does NOT need this.
''')
param deployStandaloneFunctionApp bool = true

@description('When true and SKU is Standard, link the Consumption Function App as SWA backend')
param linkFunctionAppAsBackend bool = false

@description('Email for Cost Management budget alerts (required)')
param alertEmail string

@description('Monthly RG budget amount in billing currency units (default 1 ≈ $1 USD)')
@minValue(1)
param budgetAmount int = 1

@description('Functions daily GB-s kill switch (default 10000 keeps monthly use under free grant)')
param dailyMemoryTimeQuota int = 10000

@description('Optional override for name uniqueness. Leave empty to auto-generate.')
param nameSuffixOverride string = ''

@description('Extra CORS origins for standalone Function App (e.g. https://<swa>.azurestaticapps.net)')
param functionAppCorsOrigins array = []

var nameSuffix = empty(nameSuffixOverride)
  ? uniqueString(subscription().subscriptionId, resourceGroupName, location)
  : nameSuffixOverride

var tags = {
  project: 'kinsho'
  environment: 'shared'
  managedBy: 'bicep'
}

var defaultCorsOrigins = [
  'http://localhost:4280'
  'http://localhost:3000'
]

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    location: location
    nameSuffix: nameSuffix
    tags: tags
  }
}

module functionApp 'modules/functionApp.bicep' = if (deployStandaloneFunctionApp) {
  name: 'functionApp'
  scope: rg
  params: {
    location: location
    nameSuffix: nameSuffix
    tags: tags
    storageAccountName: take('stgkinsho${nameSuffix}', 24)
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    dailyMemoryTimeQuota: dailyMemoryTimeQuota
    corsAllowedOrigins: concat(defaultCorsOrigins, functionAppCorsOrigins)
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: 'staticWebApp'
  scope: rg
  params: {
    location: staticWebAppLocation
    nameSuffix: nameSuffix
    tags: tags
    skuName: staticWebAppSku
    linkedBackendResourceId: (deployStandaloneFunctionApp && linkFunctionAppAsBackend && staticWebAppSku == 'Standard')
      ? functionApp.outputs.functionAppId
      : ''
    linkedBackendRegion: location
  }
}

module budget 'modules/budget.bicep' = {
  name: 'budget'
  scope: rg
  params: {
    alertEmail: alertEmail
    budgetAmount: budgetAmount
  }
}

output resourceGroupName string = rg.name
output nameSuffix string = nameSuffix
output staticWebAppName string = staticWebApp.outputs.staticWebAppName
output staticWebAppHostname string = staticWebApp.outputs.defaultHostname
output functionAppName string = deployStandaloneFunctionApp ? functionApp.outputs.functionAppName : ''
output functionAppHostname string = deployStandaloneFunctionApp ? functionApp.outputs.functionAppDefaultHostname : ''
output applicationInsightsId string = monitoring.outputs.applicationInsightsId
output budgetName string = budget.outputs.budgetName
