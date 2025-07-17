// modules/federatedIdentity.bicep
// Creates a federated identity credential for Azure Workload Identity

param identityName string
param oidcIssuerUrl string
param serviceAccountNamespace string
param serviceAccountName string

@description('Deploy the federated identity credential if it does not exist')
param deployFederatedIdentity bool = true

// Reference the existing managed identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: identityName
}

// Create federated identity credential
resource federatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = if (deployFederatedIdentity) {
  name: '${serviceAccountNamespace}-${serviceAccountName}'
  parent: managedIdentity
  properties: {
    issuer: oidcIssuerUrl
    subject: 'system:serviceaccount:${serviceAccountNamespace}:${serviceAccountName}'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

output federatedCredentialId string = deployFederatedIdentity ? federatedCredential.id : 'federated-credential-skipped' 
