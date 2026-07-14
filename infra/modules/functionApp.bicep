@description('Azure region for the Function App')
param location string

@description('Resource name suffix for uniqueness')
param nameSuffix string

@description('Common tags')
param tags object = {}

@description('Function App name (globally unique)')
param functionAppName string = 'func-kinsho-${nameSuffix}'

@description('App Service Plan name')
param hostingPlanName string = 'asp-kinsho-${nameSuffix}'

@description('Storage account name (lowercase alphanumeric, 3-24 chars)')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('Application Insights connection string')
@secure()
param applicationInsightsConnectionString string

@description('Node.js version for Functions runtime (Windows Consumption)')
param nodeVersion string = '~20'

var storageBlobConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    defaultToOAuthAuthentication: true
  }
}

// Windows Consumption (Y1). Some new subscriptions have Linux Dynamic quota = 0.
resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: hostingPlanName
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: false
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      netFrameworkVersion: 'v4.0'
      powerShellVersion: ''
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [
          'http://localhost:4280'
          'http://localhost:3000'
        ]
        supportCredentials: false
      }
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageBlobConnectionString
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: storageBlobConnectionString
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: nodeVersion
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsightsConnectionString
        }
      ]
    }
  }
}

output functionAppId string = functionApp.id
output functionAppName string = functionApp.name
output functionAppDefaultHostname string = functionApp.properties.defaultHostName
output storageAccountName string = storageAccount.name
