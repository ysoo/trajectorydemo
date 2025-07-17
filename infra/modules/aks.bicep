// modules/aks.bicep
// Minimal AKS cluster with managed identity (no servicePrincipalProfile needed).

param name          string
param location      string
@minValue(1)
param agentCount    int    = 3
param nodeVmSize    string = 'Standard_D4s_v5'
@allowed([
  'azure'
  'kubenet'
])
param networkPlugin string = 'azure'

@description('Deploy the AKS cluster if it does not exist')
param deployAks bool = true

// AKS managed cluster
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-03-01' = if (deployAks) {
  name:     name
  location: location
  sku: {
    name: 'Base'
    tier: 'Standard'
  }

  // <‑‑‑ This is the critical fix
  identity: {
    type: 'SystemAssigned'
  }

  properties: {
    dnsPrefix: name
    enableRBAC: true
    
    // Enable workload identity and OIDC issuer for Azure Workload Identity
    oidcIssuerProfile: {
      enabled: true
    }
    securityProfile: {
      workloadIdentity: {
        enabled: true
      }
    }

    networkProfile: {
      networkPlugin: networkPlugin
      loadBalancerSku: 'standard'
    }

    agentPoolProfiles: [
      {
        name:   'agentpool'
        type:   'VirtualMachineScaleSets'
        mode:   'System'
        count:  agentCount
        vmSize: nodeVmSize
        osType: 'Linux'
        maxPods: 110
      }
    ]
  }
}

// Reference existing AKS cluster if not deploying a new one
resource existingAks 'Microsoft.ContainerService/managedClusters@2023-03-01' existing = if (!deployAks) {
  name: name
}

// Outputs
output clusterName  string = deployAks ? aksCluster.name : existingAks.name
output principalId  string = deployAks ? aksCluster.identity.principalId : existingAks.identity.principalId   // useful for RBAC or ACR pull access
output oidcIssuerUrl string = deployAks ? aksCluster.properties.oidcIssuerProfile.issuerURL : existingAks.properties.oidcIssuerProfile.issuerURL
