// modules/identity.bicep

param name string
param location string

@description('Deploy the managed identity if it does not exist')
param deployIdentity bool = true

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = if (deployIdentity) {
  name: name
  location: location
}

// Reference existing identity if not deploying a new one
resource existingIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = if (!deployIdentity) {
  name: name
}

output clientId string = deployIdentity ? identity.properties.clientId : existingIdentity.properties.clientId
output principalId string = deployIdentity ? identity.properties.principalId : existingIdentity.properties.principalId
