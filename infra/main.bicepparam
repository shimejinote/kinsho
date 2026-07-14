using 'main.bicep'

param location = 'japaneast'
param staticWebAppLocation = 'eastasia'
param resourceGroupName = 'rg-kinsho'
param staticWebAppSku = 'Free'
// Required for cost alerts — override at deploy time:
param alertEmail = 'egaty@nifty.com'
param budgetAmount = 1
param dailyMemoryTimeQuota = 10000
// Y1/Dynamic quota is currently 0 on this subscription — keep false until quota is granted.
// SWA Free managed API (repo api/) remains the live backend. Kill switch applies only to standalone FA.
param deployStandaloneFunctionApp = false
param linkFunctionAppAsBackend = false
