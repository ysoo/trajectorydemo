// modules/keyvaultRoleAssignment.bicep
// Assigns a role on a Key Vault to a managed identity (or other principal).

param principalName        string            // used as deterministic GUID seed
param principalId          string
param keyVaultResourceId   string            // full KV resourceId

@description('Full resourceId of the role definition, e.g. subscriptionResourceId("Microsoft.Authorization/roleDefinitions", guid)')
param roleDefinitionResourceId string = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'     // Key Vault Secrets User by default
)

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultResourceId, principalName, roleDefinitionResourceId)  // deterministic
  properties: {
    roleDefinitionId: roleDefinitionResourceId
    principalId:      principalId
    principalType:    'ServicePrincipal'
  }
}
