@description('Azure region for public media storage')
param location string

@description('Resource name suffix for uniqueness')
param nameSuffix string

@description('Common tags')
param tags object = {}

@description('Storage account name (lowercase alphanumeric, 3-24 chars)')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('Public blob container for large static assets (GLB, etc.)')
param containerName string = 'media'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    // Public read for browser-loaded meshes / media (separate from Functions storage)
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowSharedKeyAccess: true
    defaultToOAuthAuthentication: false
  }
}

resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: [
            '*'
          ]
          allowedMethods: [
            'GET'
            'HEAD'
            'OPTIONS'
          ]
          allowedHeaders: [
            '*'
          ]
          exposedHeaders: [
            '*'
          ]
          maxAgeInSeconds: 86400
        }
      ]
    }
  }
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: containerName
  properties: {
    publicAccess: 'Blob'
  }
}

var blobBaseUrl = 'https://${storageAccount.name}.blob.${environment().suffixes.storage}/${containerName}'

output storageAccountName string = storageAccount.name
output containerName string = mediaContainer.name
output blobBaseUrl string = blobBaseUrl
output mediaNoumaiBrainUrl string = '${blobBaseUrl}/noumai/head_allen_fit.glb'
