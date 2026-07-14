@description('Azure region for Static Web Apps (limited set of allowed regions)')
param location string

@description('Resource name suffix for uniqueness')
param nameSuffix string

@description('Common tags')
param tags object = {}

@description('Static Web App name')
param staticWebAppName string = 'swa-kinsho-${nameSuffix}'

@description('''
SKU: Free supports managed API (api/ in repo) only.
Standard is required to link an external Azure Functions app (linkedBackends).
''')
@allowed([
  'Free'
  'Standard'
])
param skuName string = 'Free'

@description('Optional: Function App resource ID to link as backend (requires Standard SKU)')
param linkedBackendResourceId string = ''

@description('Region of the linked Functions app (required when linking)')
param linkedBackendRegion string = location

var sku = skuName == 'Free'
  ? {
      name: 'Free'
      tier: 'Free'
    }
  : {
      name: 'Standard'
      tier: 'Standard'
    }

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: sku
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: skuName == 'Standard' ? 'Enabled' : 'Disabled'
    // Repository is wired later via GitHub Actions / portal; keep IaC repo-agnostic.
    provider: 'None'
  }
}

resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = if (!empty(linkedBackendResourceId) && skuName == 'Standard') {
  parent: staticWebApp
  name: 'linkedBackend'
  properties: {
    backendResourceId: linkedBackendResourceId
    region: linkedBackendRegion
  }
}

output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname // SWA API uses defaultHostname
