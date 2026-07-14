using 'main.bicep'

param location = 'japaneast'
param staticWebAppLocation = 'eastasia'
param resourceGroupName = 'rg-kinsho'
param staticWebAppSku = 'Free'
// This subscription currently has Dynamic/Y1 quota = 0.
// SWA Free managed API (repo api/) is used instead; enable later after quota increase.
param deployStandaloneFunctionApp = false
param linkFunctionAppAsBackend = false
