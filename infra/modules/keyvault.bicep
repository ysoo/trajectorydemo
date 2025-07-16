// modules/keyvault.bicep

param name string
param location string

resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: name
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    accessPolicies: []
    enabledForDeployment: true
    enabledForTemplateDeployment: true
  }
}

output vaultUri string = keyVault.properties.vaultUri
