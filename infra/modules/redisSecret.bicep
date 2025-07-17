// modules/redisSecret.bicep

param keyVaultName string
param redisName string 
param secretName string

@description('Deploy the Redis connection secret if it does not exist')
param deploySecret bool = true

// Reference the existing resources
resource kv 'Microsoft.KeyVault/vaults@2023-02-01' existing = {
  name: keyVaultName
}

resource redis 'Microsoft.Cache/Redis@2024-11-01' existing = {
  name: redisName
}

// Create the secret only if deploySecret is true
resource redisConnectionSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = if (deploySecret) {
  parent: kv
  name: secretName
  properties: {
    value: '${redis.properties.hostName}:6380,password=${redis.listKeys().primaryKey},ssl=True,abortConnect=False'
  }
}

output secretUri string = deploySecret ? redisConnectionSecret.properties.secretUri : 'https://${keyVaultName}.vault.azure.net/secrets/${secretName}'
