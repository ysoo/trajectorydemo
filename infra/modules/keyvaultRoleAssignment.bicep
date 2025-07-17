// modules/keyvaultRoleAssignment.bicep
// Assigns a role on a Key Vault to a managed identity (or other principal).

param principalName string
param principalId string
param keyVaultResourceId string
param roleDefinitionResourceId string

@description('Deploy the role assignment if it does not exist')
param deployRoleAssignment bool = true

// Extract Key Vault name from the resource ID
var keyVaultName = split(keyVaultResourceId, '/')[8]

// Reference the existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' existing = {
  name: keyVaultName
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployRoleAssignment) {
  name: guid(keyVaultResourceId, principalId, roleDefinitionResourceId)
  scope: keyVault
  properties: {
    principalId: principalId
    roleDefinitionId: roleDefinitionResourceId
    principalType: 'ServicePrincipal'
  }
}

output assignmentId string = deployRoleAssignment ? roleAssignment.id : 'role-assignment-skipped'
output assignmentName string = deployRoleAssignment ? roleAssignment.name : 'role-assignment-skipped'
