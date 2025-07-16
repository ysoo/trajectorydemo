// modules/sql.bicep

param serverName string
param dbName string
param location string

resource sqlServer 'Microsoft.Sql/servers@2022-02-01-preview' = {
  name: serverName
  location: location
  properties: {
    administratorLogin: 'sqladmin'
    administratorLoginPassword: 'P@ssw0rd!' // replace with a secure param
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2022-02-01-preview' = {
  parent: sqlServer
  name: dbName
  properties: { }
  sku: { 
    name: 'GP_Gen5_2'
    tier: 'GeneralPurpose' 
    family: 'Gen5' 
    capacity: 2 
  }
}

output fqdn string = sqlServer.properties.fullyQualifiedDomainName
