// Deploys one user‑assigned managed identity and returns its details.

param name     string
param location string

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name:     name
  location: location
}

output clientId     string = identity.properties.clientId
output principalId  string = identity.properties.principalId
output resourceId   string = identity.id
output name         string = identity.name     // handy for deterministic GUIDs
