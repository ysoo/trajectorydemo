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

// ──────────── Conditional Deployment Parameters ────────────────
@description('Deploy resource group if it does not exist')
param deployResourceGroup bool = true

@description('Deploy Redis cache if it does not exist')
param deployRedis bool = true

@description('Deploy AKS cluster if it does not exist')
param deployAks bool = true

@description('Deploy Key Vault if it does not exist')
param deployKeyVault bool = true

@description('Deploy managed identities if they do not exist')
param deployIdentities bool = true

@description('Deploy Redis connection secret to Key Vault')
param deployRedisSecret bool = true

@description('Deploy role assignments for managed identities')
param deployRoleAssignments bool = true

// ───────────────────── Resource Group (scope) ──────────────────
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = if (deployResourceGroup) {
  name: resourceGroupName
  location: location
  tags: {
    Environment: 'Production'
    Project: 'Infrastructure'
  }
}

// Reference existing resource group if not deploying a new one
resource existingRg 'Microsoft.Resources/resourceGroups@2023-07-01' existing = if (!deployResourceGroup) {
  name: resourceGroupName
}

// ──────────────── User‑Assigned Managed Identities ─────────────
var tradeIdentityName = '${aksClusterName}-trade-identity'
var quoteIdentityName = '${aksClusterName}-quote-identity'

module tradeIdentity './modules/identity.bicep' = if (deployIdentities) {
  name:  'deployTradeIdentity'
  scope: resourceGroup(resourceGroupName)
  params: {
    name:     tradeIdentityName
    location: location
    deployIdentity: deployIdentities
  }
}

module quoteIdentity './modules/identity.bicep' = if (deployIdentities) {
  name:  'deployQuoteIdentity'
  scope: resourceGroup(resourceGroupName)
  params: {
    name:     quoteIdentityName
    location: location
    deployIdentity: deployIdentities
  }
}

// Reference existing identities if not deploying new ones
resource existingTradeIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = if (!deployIdentities) {
  name: tradeIdentityName
  scope: resourceGroup(resourceGroupName)
}

resource existingQuoteIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = if (!deployIdentities) {
  name: quoteIdentityName
  scope: resourceGroup(resourceGroupName)
}

// ─────────────── Child Modules (scoped to RG) ──────────────────
module redis './modules/redis.bicep' = if (deployRedis) {
  name: 'deployRedis'    
  scope: resourceGroup(resourceGroupName)
  params: { 
    name: redisName
    location: location
    deployRedis: deployRedis
  } 
}

module aks './modules/aks.bicep' = if (deployAks) {
  name: 'deployAks'       
  scope: resourceGroup(resourceGroupName)
  params: { 
    name: aksClusterName
    location: 'Central US'
    deployAks: deployAks
  }
}

module keyVault './modules/keyvault.bicep' = if (deployKeyVault) {
  name: 'deployKeyVault'
  scope: resourceGroup(resourceGroupName)
  params: { 
    name: keyVaultName
    location: location
    deployKeyVault: deployKeyVault
  } 
}

// ───────────── Key Vault Reference (existing or new) ────────────
resource kv 'Microsoft.KeyVault/vaults@2023-02-01' existing = {
  name: keyVaultName
  scope: resourceGroup(resourceGroupName)
}

// ─────────────────── Redis Connection Secret ──────────────────
module redisSecret './modules/redisSecret.bicep' = if (deployRedisSecret) {
  name: 'deployRedisSecret'
  scope: resourceGroup(resourceGroupName)
  params: {
    keyVaultName: keyVaultName
    redisName: redisName
    secretName: 'redis-connection-string'
    deploySecret: deployRedisSecret
  }
  dependsOn: deployKeyVault && deployRedis ? [ keyVault, redis ] : deployKeyVault ? [ keyVault ] : deployRedis ? [ redis ] : []
}

var kvSecretsUserRoleResourceId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)

module tradeKvRole './modules/keyvaultRoleAssignment.bicep' = if (deployRoleAssignments) {
  name:  'assignTradeIdentityKvRole'
  scope: resourceGroup(resourceGroupName)
  params: {
    principalName:        tradeIdentityName
    principalId:          deployIdentities ? tradeIdentity.outputs.principalId : existingTradeIdentity.properties.principalId
    keyVaultResourceId:   kv.id
    roleDefinitionResourceId: kvSecretsUserRoleResourceId
    deployRoleAssignment: deployRoleAssignments
  }
  dependsOn: deployKeyVault && deployIdentities ? [ keyVault, tradeIdentity ] : deployKeyVault ? [ keyVault ] : deployIdentities ? [ tradeIdentity ] : []
}

module quoteKvRole './modules/keyvaultRoleAssignment.bicep' = if (deployRoleAssignments) {
  name:  'assignQuoteIdentityKvRole'
  scope: resourceGroup(resourceGroupName)
  params: {
    principalName:        quoteIdentityName
    principalId:          deployIdentities ? quoteIdentity.outputs.principalId : existingQuoteIdentity.properties.principalId
    keyVaultResourceId:   kv.id
    roleDefinitionResourceId: kvSecretsUserRoleResourceId
    deployRoleAssignment: deployRoleAssignments
  }
  dependsOn: deployKeyVault && deployIdentities ? [ keyVault, quoteIdentity ] : deployKeyVault ? [ keyVault ] : deployIdentities ? [ quoteIdentity ] : []
}

// ────────────────────────── Outputs ────────────────────────────
output aksClusterNameOut string = deployAks ? aks.outputs.clusterName : aksClusterName
output redisHost string = deployRedis ? redis.outputs.hostName : '${redisName}.redis.cache.windows.net'
output keyVaultUri string = deployKeyVault ? keyVault.outputs.vaultUri : 'https://${keyVaultName}.vault.azure.net/'

output tradeApiIdentityClientId string = deployIdentities ? tradeIdentity.outputs.clientId : existingTradeIdentity.properties.clientId
output tradeApiIdentityPrincipalId string = deployIdentities ? tradeIdentity.outputs.principalId : existingTradeIdentity.properties.principalId
output quoteApiIdentityClientId string = deployIdentities ? quoteIdentity.outputs.clientId : existingQuoteIdentity.properties.clientId
output quoteApiIdentityPrincipalId string = deployIdentities ? quoteIdentity.outputs.principalId : existingQuoteIdentity.properties.principalId
