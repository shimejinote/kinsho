targetScope = 'resourceGroup'

@description('Primary Azure region for Functions and monitoring')
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
''')
param deployStandaloneFunctionApp bool = true

@description('When true and SKU is Standard, link the Consumption Function App as SWA backend')
param linkFunctionAppAsBackend bool = false

@description('Email for Cost Management budget alerts (required)')
param alertEmail string

@description('Monthly RG budget amount in billing currency (default 100 ≈ ¥100 on JPY accounts)')
@minValue(1)
param budgetAmount int = 100

@description('Functions daily GB-s kill switch (default 10000 keeps monthly use under free grant)')
param dailyMemoryTimeQuota int = 10000

@description('Optional override for name uniqueness. Leave empty to auto-generate.')
param nameSuffixOverride string = ''

@description('Extra CORS origins for standalone Function App (e.g. https://<swa>.azurestaticapps.net)')
param functionAppCorsOrigins array = []

// Matches legacy uniqueString(subscriptionId, 'rg-kinsho', location) used by main.bicep
var nameSuffix = empty(nameSuffixOverride)
  ? uniqueString(subscription().subscriptionId, resourceGroup().name, location)
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

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    nameSuffix: nameSuffix
    tags: tags
  }
}

module functionApp 'modules/functionApp.bicep' = if (deployStandaloneFunctionApp) {
  name: 'functionApp'
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
  params: {
    location: staticWebAppLocation
    nameSuffix: nameSuffix
    tags: tags
    skuName: staticWebAppSku
    linkedBackendResourceId: (linkFunctionAppAsBackend && staticWebAppSku == 'Standard')
      ? (functionApp.?outputs.functionAppId ?? '')
      : ''
    linkedBackendRegion: location
  }
}

module budget 'modules/budget.bicep' = {
  name: 'budget'
  params: {
    alertEmail: alertEmail
    budgetAmount: budgetAmount
  }
}

output nameSuffix string = nameSuffix
output staticWebAppName string = staticWebApp.outputs.staticWebAppName
output staticWebAppHostname string = staticWebApp.outputs.defaultHostname
output functionAppName string = functionApp.?outputs.functionAppName ?? ''
output functionAppHostname string = functionApp.?outputs.functionAppDefaultHostname ?? ''
output applicationInsightsId string = monitoring.outputs.applicationInsightsId
output budgetName string = budget.outputs.budgetName
