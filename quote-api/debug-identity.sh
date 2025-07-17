#!/bin/bash

# Debug script for Azure Workload Identity and Key Vault access
# Usage: ./debug-identity.sh <resource-group>

set -e

if [ $# -ne 1 ]; then
    echo "Usage: ./debug-identity.sh <resource-group>"
    echo "Example: ./debug-identity.sh sre-trading-rg"
    exit 1
fi

RESOURCE_GROUP=$1
IDENTITY_NAME="sre-trading-aks-quote-identity"
KEY_VAULT_NAME="sre-trading-kv"
SECRET_NAME="redis-connection-string"

echo "🔍 Debugging Azure Workload Identity and Key Vault access..."
echo ""

# Check if managed identity exists
echo "1️⃣ Checking managed identity..."
IDENTITY_EXISTS=$(az identity show --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query id -o tsv 2>/dev/null || echo "")
if [ -n "$IDENTITY_EXISTS" ]; then
    echo "✅ Managed identity exists: $IDENTITY_NAME"
    CLIENT_ID=$(az identity show --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query clientId -o tsv)
    PRINCIPAL_ID=$(az identity show --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv)
    echo "   Client ID: $CLIENT_ID"
    echo "   Principal ID: $PRINCIPAL_ID"
else
    echo "❌ Managed identity not found: $IDENTITY_NAME"
fi
echo ""

# Check Key Vault access
echo "2️⃣ Checking Key Vault access..."
KV_EXISTS=$(az keyvault show --name $KEY_VAULT_NAME --resource-group $RESOURCE_GROUP --query id -o tsv 2>/dev/null || echo "")
if [ -n "$KV_EXISTS" ]; then
    echo "✅ Key Vault exists: $KEY_VAULT_NAME"
    
    # Check if secret exists
    SECRET_EXISTS=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name $SECRET_NAME --query id -o tsv 2>/dev/null || echo "")
    if [ -n "$SECRET_EXISTS" ]; then
        echo "✅ Secret exists: $SECRET_NAME"
    else
        echo "❌ Secret not found: $SECRET_NAME"
    fi
    
    # Check RBAC settings
    RBAC_ENABLED=$(az keyvault show --name $KEY_VAULT_NAME --resource-group $RESOURCE_GROUP --query properties.enableRbacAuthorization -o tsv)
    if [ "$RBAC_ENABLED" = "true" ]; then
        echo "✅ Key Vault RBAC authorization enabled"
    else
        echo "⚠️  Key Vault RBAC authorization disabled (access policies mode)"
    fi
else
    echo "❌ Key Vault not found: $KEY_VAULT_NAME"
fi
echo ""

# Check role assignments
echo "3️⃣ Checking role assignments..."
if [ -n "$PRINCIPAL_ID" ] && [ -n "$KV_EXISTS" ]; then
    ROLE_ASSIGNMENTS=$(az role assignment list --assignee $PRINCIPAL_ID --scope $KV_EXISTS --query length(@) -o tsv)
    if [ "$ROLE_ASSIGNMENTS" -gt 0 ]; then
        echo "✅ Found $ROLE_ASSIGNMENTS role assignment(s) for managed identity on Key Vault"
        az role assignment list --assignee $PRINCIPAL_ID --scope $KV_EXISTS --query "[].{Role:roleDefinitionName,Scope:scope}" -o table
    else
        echo "❌ No role assignments found for managed identity on Key Vault"
    fi
else
    echo "⚠️  Cannot check role assignments - missing identity or Key Vault"
fi
echo ""

# Check AKS workload identity
echo "4️⃣ Checking AKS workload identity..."
AKS_NAME="sre-trading-aks"
AKS_EXISTS=$(az aks show --name $AKS_NAME --resource-group $RESOURCE_GROUP --query id -o tsv 2>/dev/null || echo "")
if [ -n "$AKS_EXISTS" ]; then
    echo "✅ AKS cluster exists: $AKS_NAME"
    
    # Check workload identity
    WORKLOAD_IDENTITY=$(az aks show --name $AKS_NAME --resource-group $RESOURCE_GROUP --query securityProfile.workloadIdentity.enabled -o tsv)
    if [ "$WORKLOAD_IDENTITY" = "true" ]; then
        echo "✅ Workload identity enabled on AKS"
    else
        echo "❌ Workload identity NOT enabled on AKS"
    fi
    
    # Check OIDC issuer
    OIDC_ENABLED=$(az aks show --name $AKS_NAME --resource-group $RESOURCE_GROUP --query oidcIssuerProfile.enabled -o tsv)
    if [ "$OIDC_ENABLED" = "true" ]; then
        echo "✅ OIDC issuer enabled on AKS"
        OIDC_URL=$(az aks show --name $AKS_NAME --resource-group $RESOURCE_GROUP --query oidcIssuerProfile.issuerUrl -o tsv)
        echo "   OIDC Issuer URL: $OIDC_URL"
    else
        echo "❌ OIDC issuer NOT enabled on AKS"
    fi
else
    echo "❌ AKS cluster not found: $AKS_NAME"
fi
echo ""

# Check federated identity credentials
echo "5️⃣ Checking federated identity credentials..."
if [ -n "$IDENTITY_EXISTS" ]; then
    FED_CREDS=$(az identity federated-credential list --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query length(@) -o tsv 2>/dev/null || echo "0")
    if [ "$FED_CREDS" -gt 0 ]; then
        echo "✅ Found $FED_CREDS federated credential(s)"
        az identity federated-credential list --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query "[].{Name:name,Subject:subject,Issuer:issuer}" -o table
    else
        echo "❌ No federated credentials found"
    fi
else
    echo "⚠️  Cannot check federated credentials - managed identity not found"
fi
echo ""

# Check Kubernetes service account
echo "6️⃣ Checking Kubernetes service account..."
SA_EXISTS=$(kubectl get serviceaccount quote-api-sa -n quote-api -o jsonpath='{.metadata.name}' 2>/dev/null || echo "")
if [ -n "$SA_EXISTS" ]; then
    echo "✅ Service account exists: quote-api-sa"
    
    # Check annotations
    CLIENT_ID_ANNOTATION=$(kubectl get serviceaccount quote-api-sa -n quote-api -o jsonpath='{.metadata.annotations.azure\.workload\.identity/client-id}' 2>/dev/null || echo "")
    if [ -n "$CLIENT_ID_ANNOTATION" ]; then
        echo "✅ Service account has workload identity annotation: $CLIENT_ID_ANNOTATION"
    else
        echo "❌ Service account missing workload identity annotation"
    fi
    
    # Check labels
    USE_LABEL=$(kubectl get serviceaccount quote-api-sa -n quote-api -o jsonpath='{.metadata.labels.azure\.workload\.identity/use}' 2>/dev/null || echo "")
    if [ "$USE_LABEL" = "true" ]; then
        echo "✅ Service account has workload identity label"
    else
        echo "❌ Service account missing workload identity label"
    fi
else
    echo "❌ Service account not found: quote-api-sa"
fi
echo ""

# Check pod configuration
echo "7️⃣ Checking pod configuration..."
POD_NAME=$(kubectl get pods -n quote-api -l app=quote-api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$POD_NAME" ]; then
    echo "✅ Found pod: $POD_NAME"
    
    # Check if pod uses service account
    POD_SA=$(kubectl get pod $POD_NAME -n quote-api -o jsonpath='{.spec.serviceAccountName}' 2>/dev/null || echo "")
    if [ "$POD_SA" = "quote-api-sa" ]; then
        echo "✅ Pod uses correct service account: $POD_SA"
    else
        echo "❌ Pod not using correct service account. Using: $POD_SA"
    fi
    
    # Check workload identity label
    POD_LABEL=$(kubectl get pod $POD_NAME -n quote-api -o jsonpath='{.metadata.labels.azure\.workload\.identity/use}' 2>/dev/null || echo "")
    if [ "$POD_LABEL" = "true" ]; then
        echo "✅ Pod has workload identity label"
    else
        echo "❌ Pod missing workload identity label"
    fi
    
    # Check environment variables
    echo ""
    echo "Environment variables in pod:"
    kubectl exec $POD_NAME -n quote-api -- env | grep -E "(AZURE_|KEY_VAULT)" || echo "   No Azure-related environment variables found"
else
    echo "❌ No quote-api pods found"
fi
echo ""

echo "🎯 Summary:"
echo "If you see ❌ above, those issues need to be fixed for workload identity to work."
echo ""
echo "💡 Next steps if issues found:"
echo "1. Redeploy infrastructure: az deployment sub create --location eastus --template-file Infra/main.bicep"
echo "2. Redeploy quote-api: ./deploy.sh $RESOURCE_GROUP <acr-name>"
echo "3. Restart pods: kubectl rollout restart deployment/quote-api -n quote-api" 