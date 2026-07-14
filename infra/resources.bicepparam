using 'resources.bicep'

param location = 'japaneast'
param staticWebAppLocation = 'eastasia'
param staticWebAppSku = 'Free'
param alertEmail = 'egaty@nifty.com'
param budgetAmount = 100
param dailyMemoryTimeQuota = 10000
param deployStandaloneFunctionApp = false
param linkFunctionAppAsBackend = false
