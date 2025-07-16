// modules/monitoring.bicep

param location string

resource workspace 'Microsoft.OperationalInsights/workspaces@2021-12-01-preview' = {
  name: 'sreTradingLogAnalytics'
  location: location
  properties: { retentionInDays: 30 }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'sreTradingAppInsights'
  location: location
  kind: 'web'
  properties: { Application_Type: 'web' }
}
