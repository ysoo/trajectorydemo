// modules/keyvaultRoleAssignment.bicep
// Assigns a role on a Key Vault to a managed identity (or other principal).

param principalName string
param principalId string
param keyVaultResourceId string
param roleDefinitionResourceId string

@description('Deploy the role assignment if it does not exist')
param deployRoleAssignment bool = true

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployRoleAssignment) {
  name: guid(keyVaultResourceId, principalId, roleDefinitionResourceId)
  scope: resourceGroup()
  properties: {
    principalId: principalId
    roleDefinitionId: roleDefinitionResourceId
    principalType: 'ServicePrincipal'
  }
}

output assignmentId string = deployRoleAssignment ? roleAssignment.id : 'role-assignment-skipped'
output assignmentName string = deployRoleAssignment ? roleAssignment.name : 'role-assignment-skipped'
