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
var publisherIdentityName = '${aksClusterName}-publisher-identity'
var subscriberIdentityName = '${aksClusterName}-subscriber-identity'

module publisherIdentity './modules/identity.bicep' = if (deployIdentities) {
  name:  'deployTradeIdentity'
  scope: resourceGroup(resourceGroupName)
  params: {
    name:     publisherIdentityName
    location: location
    deployIdentity: deployIdentities
  }
}

module subscriberIdentity './modules/identity.bicep' = if (deployIdentities) {
  name:  'deployQuoteIdentity'
  scope: resourceGroup(resourceGroupName)
  params: {
    name:     subscriberIdentityName
    location: location
    deployIdentity: deployIdentities
  }
}

// Reference existing identities if not deploying new ones
resource existingPublisherIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = if (!deployIdentities) {
  name: publisherIdentityName
  scope: resourceGroup(resourceGroupName)
}

resource existingSubscriberIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = if (!deployIdentities) {
  name: subscriberIdentityName
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

module publisherKvRole './modules/keyvaultRoleAssignment.bicep' = if (deployRoleAssignments) {
  name:  'assignPublisherIdentityKvRole'
  scope: resourceGroup(resourceGroupName)
  params: {
    principalName:        publisherIdentityName
    principalId:          deployIdentities ? publisherIdentity.outputs.principalId : existingPublisherIdentity.properties.principalId
    keyVaultResourceId:   kv.id
    roleDefinitionResourceId: kvSecretsUserRoleResourceId
    deployRoleAssignment: deployRoleAssignments
  }
    dependsOn: deployKeyVault && deployIdentities ? [ keyVault, publisherIdentity ] : deployKeyVault ? [ keyVault ] : deployIdentities ? [ publisherIdentity ] : []
}

module subscriberKvRole './modules/keyvaultRoleAssignment.bicep' = if (deployRoleAssignments) {
  name:  'assignSubscriberIdentityKvRole'
  scope: resourceGroup(resourceGroupName)
  params: {
    principalName:        subscriberIdentityName
    principalId:          deployIdentities ? subscriberIdentity.outputs.principalId : existingSubscriberIdentity.properties.principalId
    keyVaultResourceId:   kv.id
    roleDefinitionResourceId: kvSecretsUserRoleResourceId
    deployRoleAssignment: deployRoleAssignments
  }
  dependsOn: deployKeyVault && deployIdentities ? [ keyVault, subscriberIdentity ] : deployKeyVault ? [ keyVault ] : deployIdentities ? [ subscriberIdentity ] : []
}

// ─────────────── Federated Identity Credentials ──────────────────
module subscriberFederatedIdentity './modules/federatedIdentity.bicep' = if (deployIdentities && deployAks) {
  name: 'deploySubscriberFederatedIdentity'
  scope: resourceGroup(resourceGroupName)
  params: {
    identityName: subscriberIdentityName
    oidcIssuerUrl: aks.outputs.oidcIssuerUrl
    serviceAccountNamespace: 'quote-api'
    serviceAccountName: 'quote-api-sa'
    deployFederatedIdentity: deployIdentities && deployAks
  }
  dependsOn: deployIdentities && deployAks ? [ subscriberIdentity, aks ] : []
}

module publisherFederatedIdentity './modules/federatedIdentity.bicep' = if (deployIdentities && deployAks) {
  name: 'deployPublisherFederatedIdentity'
  scope: resourceGroup(resourceGroupName)
  params: {
    identityName: publisherIdentityName
    oidcIssuerUrl: aks.outputs.oidcIssuerUrl
    serviceAccountNamespace: 'quote-api-publisher'
    serviceAccountName: 'quote-api-publisher-sa'
    deployFederatedIdentity: deployIdentities && deployAks
  }
  dependsOn: deployIdentities && deployAks ? [ publisherIdentity, aks ] : []
}

// ────────────────────────── Outputs ────────────────────────────
output aksClusterNameOut string = deployAks ? aks.outputs.clusterName : aksClusterName
output redisHost string = deployRedis ? redis.outputs.hostName : '${redisName}.redis.cache.windows.net'
output keyVaultUri string = deployKeyVault ? keyVault.outputs.vaultUri : 'https://${keyVaultName}.vault.azure.net/'

output publisherApiIdentityClientId string = deployIdentities ? publisherIdentity.outputs.clientId : existingPublisherIdentity.properties.clientId
output publisherApiIdentityPrincipalId string = deployIdentities ? publisherIdentity.outputs.principalId : existingPublisherIdentity.properties.principalId
output subscriberApiIdentityClientId string = deployIdentities ? subscriberIdentity.outputs.clientId : existingSubscriberIdentity.properties.clientId
output subscriberApiIdentityPrincipalId string = deployIdentities ? subscriberIdentity.outputs.principalId : existingSubscriberIdentity.properties.principalId
