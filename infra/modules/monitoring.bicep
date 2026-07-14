@description('Azure region for monitoring resources')
param location string

@description('Resource name suffix for uniqueness')
param nameSuffix string

@description('Common tags applied to all resources')
param tags object = {}

@description('Log Analytics workspace name')
param logAnalyticsWorkspaceName string = 'log-kinsho-${nameSuffix}'

@description('Application Insights name')
param applicationInsightsName string = 'appi-kinsho-${nameSuffix}'

// ~23 MB/day hard cap. Float via json() — Bicep integer-only literals cannot express 0.023.
var logAnalyticsDailyQuotaGb = json('0.023')

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: logAnalyticsDailyQuotaGb
    }
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output logAnalyticsWorkspaceId string = logAnalytics.id
output applicationInsightsId string = applicationInsights.id
output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString
output applicationInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey
