# Trading Infrastructure as Code

This Bicep template deploys the infrastructure for the SRE Trading application on Azure with support for conditional deployment to avoid recreating existing resources.

## Quick Start

**Production deployment:**
```bash
az deployment sub create --location eastus --template-file main.bicep
```

**Skip existing resources:**
```bash
az deployment sub create \
  --location eastus \
  --template-file main.bicep \
  --parameters deployResourceGroup=false \
               deployAks=false \
               deployRedis=false
```

## Resources Deployed

- **Resource Group**: Container for all resources
- **AKS Cluster**: Kubernetes cluster for running containers  
- **Redis Cache**: In-memory cache for real-time data
- **Key Vault**: Secure storage for secrets and keys
- **Managed Identities**: Service identities for secure access
- **Role Assignments**: RBAC permissions for managed identities

## 🚀 Conditional Deployment Feature

The template supports **conditional deployment** to avoid recreating existing resources. Each resource type can be enabled or disabled using boolean parameters.

### Conditional Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `deployResourceGroup` | `true` | Deploy resource group if it doesn't exist |
| `deployRedis` | `true` | Deploy Redis cache if it doesn't exist |
| `deployAks` | `true` | Deploy AKS cluster if it doesn't exist |
| `deployKeyVault` | `true` | Deploy Key Vault if it doesn't exist |
| `deployIdentities` | `true` | Deploy managed identities if they don't exist |
| `deployRedisSecret` | `true` | Deploy Redis connection secret to Key Vault |
| `deployRoleAssignments` | `true` | Deploy role assignments for managed identities |

### Usage Examples

#### 1. Fresh Deployment (Deploy Everything)
```bash
az deployment sub create \
  --location "East US" \
  --template-file main.bicep
```

#### 2. Skip Existing Infrastructure
```bash
az deployment sub create \
  --location "East US" \
  --template-file main.bicep \
  --parameters deployResourceGroup=false \
               deployAks=false \
               deployRedis=false \
               deployKeyVault=false
```

#### 3. Only Deploy Secrets and Role Assignments
```bash
az deployment sub create \
  --location "East US" \
  --template-file main.bicep \
  --parameters deployResourceGroup=false \
               deployRedis=false \
               deployAks=false \
               deployKeyVault=false \
               deployIdentities=false \
               deployRedisSecret=true \
               deployRoleAssignments=true
```

## Benefits

✅ **Faster Deployments**: Skip time-consuming resources that already exist  
✅ **Cost Optimization**: Avoid accidental recreation of expensive resources  
✅ **Incremental Updates**: Deploy only what's changed  
✅ **Safe Updates**: Reference existing resources without modifying them  

## Resource Dependencies

The template automatically handles dependencies:
- Role assignments depend on identities and Key Vault
- Redis secret depends on Redis and Key Vault  
- Existing resources are referenced when not being deployed
- Conditional `dependsOn` ensures proper ordering

## Outputs

All outputs are conditional and will reference existing resources when not deploying new ones:

- `aksClusterNameOut`: AKS cluster name
- `redisHost`: Redis hostname  
- `keyVaultUri`: Key Vault URI
- `tradeApiIdentityClientId`: Trade API identity client ID
- `quoteApiIdentityClientId`: Quote API identity client ID

## Troubleshooting

**Resource already exists error:**
- Set the corresponding `deploy*` parameter to `false`

**Missing resource error:**
- Ensure the resource exists before setting `deploy*` to `false`
- Check resource names match exactly

**Permission errors:**
- Ensure you have Owner or Contributor access to the subscription/resource group
