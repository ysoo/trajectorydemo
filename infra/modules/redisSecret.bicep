// modules/redisSecret.bicep
param keyVaultName string
param redisName string
param secretName string = 'redis-connection-string'
param databaseNumber int = 0

// Reference existing resources
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: keyVaultName
}

resource redisCache 'Microsoft.Cache/Redis@2024-11-01' existing = {
  name: redisName
}

// Create the connection string secret
resource redisConnectionSecret 'Microsoft.KeyVault/vaults/secrets@2022-07-01' = {
  name: secretName
  parent: keyVault
  properties: {
    value: 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:6380/${databaseNumber}'
    contentType: 'application/x-redis-url'
  }
}

output secretUri string = redisConnectionSecret.properties.secretUri
output secretName string = redisConnectionSecret.name
