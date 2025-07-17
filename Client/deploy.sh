#!/bin/bash

# Web UI Deployment Script for Existing Azure Resources
# Usage: ./deploy.sh <resource-group> <acr-name> [image-tag]

set -e

# Check arguments
if [ $# -lt 2 ] || [ $# -gt 3 ]; then
    echo "Usage: ./deploy.sh <resource-group> <acr-name> [image-tag]"
    echo "Example: ./deploy.sh my-rg my-acr"
    echo "Example: ./deploy.sh my-rg my-acr v1.1"
    exit 1
fi

RESOURCE_GROUP=$1
ACR_NAME=$2
# Generate unique tag if none provided (timestamp-based)
IMAGE_TAG=${3:-"v2.0.0"}

echo "🚀 Deploying Web UI to existing Azure resources..."
echo "   Resource Group: $RESOURCE_GROUP"
echo "   ACR: $ACR_NAME"
echo "   Image Tag: $IMAGE_TAG"
echo ""

# Get ACR login server
echo "🐳 Getting ACR details..."
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo "✅ ACR: $ACR_LOGIN_SERVER"

# Login to ACR and build/push image
echo "🔨 Building and pushing Docker image..."
az acr login --name $ACR_NAME

# Build with environment variables for production
docker build \
  --build-arg VITE_QUOTE_API_BASE_URL=http://20.236.212.26 \
  --build-arg VITE_QUOTE_API_WS_URL=ws://20.236.212.26/ws \
  -t $ACR_LOGIN_SERVER/trading-web-ui:$IMAGE_TAG .

docker push $ACR_LOGIN_SERVER/trading-web-ui:$IMAGE_TAG
echo "✅ Image pushed to ACR"

# Create temporary deployment file with substitutions
echo "📝 Preparing Kubernetes deployment..."
cp k8s/web-ui-deployment.yaml k8s/web-ui-deployment-temp.yaml

# Replace ACR server placeholder
echo "🔧 Updating ACR server..."
sed -i "s|<ACR_SERVER>|$ACR_LOGIN_SERVER|g" k8s/web-ui-deployment-temp.yaml

# Replace image tag placeholder
echo "🔧 Updating image tag..."
sed -i "s|<IMAGE_TAG>|$IMAGE_TAG|g" k8s/web-ui-deployment-temp.yaml

echo "✅ Configuration updated"

# Deploy to Kubernetes
echo "🚀 Deploying to Kubernetes..."
kubectl apply -f k8s/web-ui-deployment-temp.yaml

# Force rollout restart to ensure new image is pulled
echo "🔄 Forcing deployment rollout restart..."
kubectl rollout restart deployment/web-ui

# Clean up temporary file
rm k8s/web-ui-deployment-temp.yaml

# Wait for deployment
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/web-ui --timeout=300s

# Show status
echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Deployment Status:"
kubectl get pods -l app=web-ui
echo ""
echo "🏷️  Current Image:"
kubectl get deployment web-ui -o jsonpath='{.spec.template.spec.containers[0].image}'
echo ""
echo ""
echo "🌐 Service Details:"
kubectl get service web-ui-svc
echo ""
echo "🔗 Internal Service URL:"
echo "   Web UI: http://web-ui-svc.default.svc.cluster.local"
echo ""
echo "🧪 Test the deployment:"
echo "   kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -- sh"
echo "   # Inside pod: curl http://web-ui-svc.default.svc.cluster.local"
echo ""
echo "📱 Access the Web UI:"
echo "   kubectl port-forward service/web-ui-svc 8080:80"
echo "   # Then open http://localhost:8080 in your browser"
echo ""
echo "🔍 Check logs:"
echo "   kubectl logs -l app=web-ui --tail=50"
echo ""
echo "📊 Scale deployment (if needed):"
echo "   kubectl scale deployment web-ui --replicas=3" 