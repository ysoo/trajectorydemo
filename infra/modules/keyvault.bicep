// modules/keyvault.bicep

param name string
param location string

@description('Deploy the Key Vault if it does not exist')
param deployKeyVault bool = true

resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = if (deployKeyVault) {
  name: name
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true  // Enable RBAC instead of access policies
    accessPolicies: []
    enabledForDeployment: true
    enabledForTemplateDeployment: true
  }
}

// Reference existing Key Vault if not deploying a new one
resource existingKeyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = if (!deployKeyVault) {
  name: name
}

output vaultUri string = deployKeyVault ? keyVault.properties.vaultUri : existingKeyVault.properties.vaultUri
