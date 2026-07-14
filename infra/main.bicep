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

@allowed([
  'Free'
  'Standard'
])
param staticWebAppSku string = 'Free'

param deployStandaloneFunctionApp bool = true
param linkFunctionAppAsBackend bool = false

@description('Email for Cost Management budget alerts (required)')
param alertEmail string

@minValue(1)
param budgetAmount int = 100

param dailyMemoryTimeQuota int = 10000
param nameSuffixOverride string = ''
param functionAppCorsOrigins array = []

var tags = {
  project: 'kinsho'
  environment: 'shared'
  managedBy: 'bicep'
}

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    location: location
    staticWebAppLocation: staticWebAppLocation
    staticWebAppSku: staticWebAppSku
    deployStandaloneFunctionApp: deployStandaloneFunctionApp
    linkFunctionAppAsBackend: linkFunctionAppAsBackend
    alertEmail: alertEmail
    budgetAmount: budgetAmount
    dailyMemoryTimeQuota: dailyMemoryTimeQuota
    nameSuffixOverride: nameSuffixOverride
    functionAppCorsOrigins: functionAppCorsOrigins
  }
}

output resourceGroupName string = rg.name
output nameSuffix string = resources.outputs.nameSuffix
output staticWebAppName string = resources.outputs.staticWebAppName
output staticWebAppHostname string = resources.outputs.staticWebAppHostname
output functionAppName string = resources.outputs.functionAppName
output functionAppHostname string = resources.outputs.functionAppHostname
output applicationInsightsId string = resources.outputs.applicationInsightsId
output budgetName string = resources.outputs.budgetName
