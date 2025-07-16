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

// AKS managed cluster
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-03-01' = {
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

// Outputs
output clusterName  string = aksCluster.name
output principalId  string = aksCluster.identity.principalId   // useful for RBAC or ACR pull access
