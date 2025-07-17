#!/bin/bash

# Quote API Deployment Script for Existing Azure Resources
# Usage: ./deploy.sh <resource-group> <acr-name> <redis-name>

set -e

# Check arguments
if [ $# -ne 3 ]; then
    echo "Usage: ./deploy.sh <resource-group> <acr-name> <redis-name>"
    echo "Example: ./deploy.sh my-rg my-acr my-redis"
    exit 1
fi

RESOURCE_GROUP=$1
ACR_NAME=$2
REDIS_NAME=$3

echo "🚀 Deploying Quote API to existing Azure resources..."
echo "   Resource Group: $RESOURCE_GROUP"
echo "   ACR: $ACR_NAME"
echo "   Redis: $REDIS_NAME"
echo ""

# Get Redis connection details
echo "📡 Getting Redis connection details..."
REDIS_HOSTNAME=$(az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query hostName --output tsv)
REDIS_SSL_PORT=$(az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query sslPort --output tsv)
REDIS_ACCESS_KEY=$(az redis list-keys --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query primaryKey --output tsv)

# Construct Redis connection string
REDIS_CONNECTION_STRING="redis://:$REDIS_ACCESS_KEY@$REDIS_HOSTNAME:$REDIS_SSL_PORT/0?ssl=true"
REDIS_CONNECTION_STRING_B64=$(echo -n "$REDIS_CONNECTION_STRING" | base64 | tr -d '\n')

echo "✅ Redis connection configured"

# Get ACR login server
echo "🐳 Getting ACR details..."
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo "✅ ACR: $ACR_LOGIN_SERVER"

# Login to ACR and build/push image
echo "🔨 Building and pushing Docker image..."
az acr login --name $ACR_NAME
docker build -t $ACR_LOGIN_SERVER/quote-api:latest .
docker push $ACR_LOGIN_SERVER/quote-api:latest
echo "✅ Image pushed to ACR"

# Create temporary deployment file with substitutions
echo "📝 Preparing Kubernetes deployment..."
cp k8s-deployment.yaml k8s-deployment-temp.yaml

# Use more robust replacement method
echo "🔧 Updating ACR image..."
# Escape forward slashes in ACR_LOGIN_SERVER for sed
ACR_ESCAPED=$(echo "$ACR_LOGIN_SERVER" | sed 's/\//\\\//g')
sed -i "s/<YOUR_ACR_LOGIN_SERVER>/$ACR_ESCAPED/g" k8s-deployment-temp.yaml

echo "🔧 Updating Redis connection..."
# Use printf to handle special characters in base64 string
printf '%s\n' "g/<BASE64_ENCODED_AZURE_REDIS_CONNECTION_STRING>/s//<BASE64_ENCODED_AZURE_REDIS_CONNECTION_STRING>/$REDIS_CONNECTION_STRING_B64/g" | sed -i -f - k8s-deployment-temp.yaml 2>/dev/null || {
    # Fallback method using awk
    awk -v old="<BASE64_ENCODED_AZURE_REDIS_CONNECTION_STRING>" -v new="$REDIS_CONNECTION_STRING_B64" 'gsub(old,new)1' k8s-deployment-temp.yaml > k8s-deployment-temp2.yaml
    mv k8s-deployment-temp2.yaml k8s-deployment-temp.yaml
}

echo "✅ Configuration updated"

# Deploy to Kubernetes
echo "🚀 Deploying to Kubernetes..."
kubectl apply -f k8s-deployment-temp.yaml

# Force rollout restart to ensure new image is pulled
echo "🔄 Forcing deployment rollout restart..."
kubectl rollout restart deployment/quote-api -n quote-api

# Clean up temporary file
rm k8s-deployment-temp.yaml

# Wait for deployment
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/quote-api -n quote-api

# Show status
echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Deployment Status:"
kubectl get pods -n quote-api
echo ""
echo "🌐 Service Details:"
kubectl get service quote-api-service -n quote-api
echo ""
echo "🔗 Internal Service URL:"
echo "   REST API: http://quote-api-service.quote-api.svc.cluster.local/v1/quotes?symbol=MSFT"
echo "   WebSocket: ws://quote-api-service.quote-api.svc.cluster.local/ws"
echo "   Health: http://quote-api-service.quote-api.svc.cluster.local/health"
echo ""
echo "🧪 Test the deployment:"
echo "   kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -- sh"
echo "   # Inside pod: curl http://quote-api-service.quote-api.svc.cluster.local/health"
echo ""
echo "📈 Monitor HPA:"
echo "   kubectl get hpa quote-api-hpa -n quote-api --watch"
echo ""
echo "🌐 External Access:"
kubectl get service quote-api-external -n quote-api
echo ""
echo "🔌 For local development (port forwarding):"
echo "   kubectl port-forward service/quote-api-service 8080:80 -n quote-api"
echo "   # Then use: http://localhost:8080"
echo ""
echo "🔗 External LoadBalancer URL:"
EXTERNAL_IP=$(kubectl get service quote-api-external -n quote-api -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending...")
echo "   REST API: http://$EXTERNAL_IP/v1/quotes?symbol=MSFT"
echo "   WebSocket: ws://$EXTERNAL_IP/ws"
echo "   Health: http://$EXTERNAL_IP/health"