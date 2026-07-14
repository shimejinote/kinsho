using 'main.bicep'

param location = 'japaneast'
param staticWebAppLocation = 'eastasia'
param resourceGroupName = 'rg-kinsho'
param staticWebAppSku = 'Free'
// Required for cost alerts — override at deploy time:
param alertEmail = 'egaty@nifty.com'
param budgetAmount = 1
param dailyMemoryTimeQuota = 10000
// Standalone Consumption Functions with dailyMemoryTimeQuota kill switch.
// If Y1/Dynamic quota is 0, request quota increase or set deployStandaloneFunctionApp=false
// and use SWA Free managed API (repo api/) instead.
param deployStandaloneFunctionApp = true
param linkFunctionAppAsBackend = false
