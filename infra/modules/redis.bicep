// modules/redis.bicep
param name string
param location string

@description('Deploy the Redis cache if it does not exist')
param deployRedis bool = true

resource redisCache 'Microsoft.Cache/Redis@2024-11-01' = if (deployRedis) {
  name: name
  location: location
  properties: {
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    sku: { 
      name: 'Standard'
      family: 'C'
      capacity: 1
    }
  }
}

// Reference existing Redis if not deploying a new one
resource existingRedis 'Microsoft.Cache/Redis@2024-11-01' existing = if (!deployRedis) {
  name: name
}

output hostName string = deployRedis ? redisCache.properties.hostName : existingRedis.properties.hostName

