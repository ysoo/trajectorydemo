targetScope = 'subscription'

// ───────────────────────── Parameters ──────────────────────────
param resourceGroupName string = 'sre-trading-rg'
param location string = 'East US'
param aksClusterName string = 'sre-trading-aks'
// param sqlServerName string = 'sretradingsql'
// param sqlDbName string = 'tradingdb'
param redisName string = 'sre-trading-redis'
// param frontDoorName string = 'sreTradingFD'
param keyVaultName string = 'sre-trading-kv'

// ───────────────────── Resource Group (scope) ──────────────────
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: {
    Environment: 'Production'
    Project: 'Infrastructure'
  }
}

// ──────────────── User‑Assigned Managed Identities ─────────────
var tradeIdentityName = '${aksClusterName}-trade-identity'
var quoteIdentityName = '${aksClusterName}-quote-identity'

module tradeIdentity './modules/identity.bicep' = {
  name:  'deployTradeIdentity'
  scope: rg
  params: {
    name:     tradeIdentityName
    location: location
  }
}

module quoteIdentity './modules/identity.bicep' = {
  name:  'deployQuoteIdentity'
  scope: rg
  params: {
    name:     quoteIdentityName
    location: location
  }
}


// ─────────────── Child Modules (scoped to RG) ──────────────────
module redis      './modules/redis.bicep'       = {
  name: 'deployRedis'    
  scope: rg
  params: { 
    name: redisName
    location: location 
  } 
}
module aks        './modules/aks.bicep'         = {
  name: 'deployAks'       
  scope: rg
  params: { 
    name: aksClusterName
    location: 'Central US' 
  }
}
module keyVault   './modules/keyvault.bicep'    = {
  name: 'deployKeyVault'
  scope: rg
  params: { 
    name: keyVaultName
    location: location 
  } 
}

// ───────────── Existing Key Vault (for role scope) ─────────────
resource kv 'Microsoft.KeyVault/vaults@2023-02-01' existing = {
  name: keyVaultName
  scope: rg
}

var kvSecretsUserRoleResourceId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)

module tradeKvRole './modules/keyvaultRoleAssignment.bicep' = {
  name:  'assignTradeIdentityKvRole'
  scope: rg
  params: {
    principalName:        tradeIdentityName
    principalId:          tradeIdentity.outputs.principalId
    keyVaultResourceId:   kv.id
    roleDefinitionResourceId: kvSecretsUserRoleResourceId
  }
  dependsOn: [ keyVault ]
}

module quoteKvRole './modules/keyvaultRoleAssignment.bicep' = {
  name:  'assignQuoteIdentityKvRole'
  scope: rg
  params: {
    principalName:        quoteIdentityName
    principalId:          quoteIdentity.outputs.principalId
    keyVaultResourceId:   kv.id
    roleDefinitionResourceId: kvSecretsUserRoleResourceId
  }
  dependsOn: [ keyVault ]
}

// ────────────────────────── Outputs ────────────────────────────
output aksClusterNameOut string = aks.outputs.clusterName
output redisHost string = redis.outputs.hostName
output keyVaultUri string = keyVault.outputs.vaultUri

output tradeApiIdentityClientId string = tradeIdentity.outputs.clientId
output tradeApiIdentityPrincipalId string = tradeIdentity.outputs.principalId
output quoteApiIdentityClientId string = quoteIdentity.outputs.clientId
output quoteApiIdentityPrincipalId string = quoteIdentity.outputs.principalId
