// modules/redis.bicep
param name string
param location string

resource redisCache 'Microsoft.Cache/Redis@2024-11-01' = {
  name: name
  location: location
  sku: { 
    name: 'Premium'
    family: 'P1'
    capacity: 1
  }
  properties: {
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

output hostName string = redisCache.properties.hostName

