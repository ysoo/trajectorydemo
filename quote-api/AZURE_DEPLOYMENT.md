# Azure Kubernetes Service (AKS) Deployment Guide

This guide walks you through deploying the Quote API to an existing Azure Kubernetes Service (AKS) cluster with Azure Redis Cache integration. The Quote API will be accessible internally within the cluster for frontend UI pods.

## Prerequisites

- Existing Azure resources:
  - AKS cluster with kubectl access
  - Azure Container Registry (ACR) attached to AKS
  - Azure Redis Cache instance
- Docker installed locally
- kubectl configured for your AKS cluster

## 1. Prepare Azure Resources

### 1.1 Get Azure Redis Connection Details

```bash
# Set your Azure resource variables
RESOURCE_GROUP="your-resource-group"
REDIS_NAME="your-redis-name"
ACR_NAME="your-acr-name"

# Get Redis connection details
REDIS_HOSTNAME=$(az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query hostName --output tsv)
REDIS_SSL_PORT=$(az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query sslPort --output tsv)
REDIS_ACCESS_KEY=$(az redis list-keys --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query primaryKey --output tsv)

# Construct Redis connection string
REDIS_CONNECTION_STRING="redis://:$REDIS_ACCESS_KEY@$REDIS_HOSTNAME:$REDIS_SSL_PORT/0?ssl=true"
echo "Redis Connection String: $REDIS_CONNECTION_STRING"

# Base64 encode for Kubernetes secret
REDIS_CONNECTION_STRING_B64=$(echo -n "$REDIS_CONNECTION_STRING" | base64)
echo "Base64 Encoded: $REDIS_CONNECTION_STRING_B64"
```

### 1.2 Get ACR Login Server

```bash
# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo "ACR Login Server: $ACR_LOGIN_SERVER"
```

## 2. Build and Push Docker Image

### 2.1 Build and Push to ACR

```bash
# Navigate to quote-api directory
cd quote-api

# Login to ACR
az acr login --name $ACR_NAME

# Build and push Docker image
docker build -t $ACR_LOGIN_SERVER/quote-api:latest .
docker push $ACR_LOGIN_SERVER/quote-api:latest

# Verify image
az acr repository list --name $ACR_NAME --output table
```

## 3. Configure Kubernetes Deployment

### 3.1 Update Deployment Configuration

```bash
# Update the deployment file with your ACR image
sed -i "s|<YOUR_ACR_LOGIN_SERVER>|$ACR_LOGIN_SERVER|g" k8s-deployment.yaml

# Update the secret with your base64 encoded Redis connection string
sed -i "s|<BASE64_ENCODED_AZURE_REDIS_CONNECTION_STRING>|$REDIS_CONNECTION_STRING_B64|g" k8s-deployment.yaml
```

## 4. Deploy to Kubernetes

### 4.1 Deploy All Resources

```bash
# Deploy the Quote API
kubectl apply -f k8s-deployment.yaml
```

### 4.2 Verify Deployment

```bash
# Check if namespace is created
kubectl get namespace quote-api

# Check if pods are running
kubectl get pods -n quote-api

# Check deployment status
kubectl get deployment quote-api -n quote-api

# Check service
kubectl get service quote-api-service -n quote-api

# View logs
kubectl logs -f deployment/quote-api -n quote-api
```

## 5. Test Internal Connectivity

### 5.1 Test from Another Pod

```bash
# Create a test pod to verify internal connectivity
kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -- sh

# Inside the test pod, test the Quote API
curl http://quote-api-service.quote-api.svc.cluster.local/health
curl "http://quote-api-service.quote-api.svc.cluster.local/v1/quotes?symbol=MSFT"
```

### 5.2 Port Forward for Local Testing (Optional)

```bash
# Port forward to test locally
kubectl port-forward service/quote-api-service 8080:80 -n quote-api

# In another terminal, test the API
curl http://localhost:8080/health
curl "http://localhost:8080/v1/quotes?symbol=MSFT"

# Test WebSocket (update test-client.js to use localhost:8080)
npm run test-client
```

## 6. Frontend Integration

### 6.1 Access from Frontend Pods

Your frontend UI pods can access the Quote API using the internal service DNS name:

**REST API Endpoint:**
```
http://quote-api-service.quote-api.svc.cluster.local/v1/quotes?symbol=MSFT
```

**WebSocket Endpoint:**
```
ws://quote-api-service.quote-api.svc.cluster.local/ws
```

**Health Check:**
```
http://quote-api-service.quote-api.svc.cluster.local/health
```

### 6.2 Cross-Namespace Access

If your frontend is in a different namespace, you can:

1. **Use the full DNS name** (recommended):
   ```
   http://quote-api-service.quote-api.svc.cluster.local
   ```

2. **Create a service in your frontend namespace** that references the quote-api service:
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: quote-api
     namespace: your-frontend-namespace
   spec:
     type: ExternalName
     externalName: quote-api-service.quote-api.svc.cluster.local
     ports:
     - port: 80
   ```

## 7. Monitoring and Scaling

### 7.1 Check HPA Status

```bash
# Monitor horizontal pod autoscaler
kubectl get hpa quote-api-hpa -n quote-api

# Watch HPA in real-time
kubectl get hpa quote-api-hpa -n quote-api --watch
```

### 7.2 Check Pod Disruption Budget

```bash
# Check PDB status
kubectl get pdb quote-api-pdb -n quote-api
```

### 7.3 Generate Load for Testing

```bash
# Create a load generator to test scaling
kubectl run load-generator --image=busybox --rm -it --restart=Never -- \
  /bin/sh -c "while sleep 0.1; do wget -q -O- http://quote-api-service.quote-api.svc.cluster.local/v1/quotes?symbol=MSFT; done"
```

## 8. Troubleshooting

### 8.1 Common Issues

1. **Pod stuck in Pending**: Check node resources and quotas
2. **ImagePullBackOff**: Verify ACR permissions and image name
3. **Redis connection errors**: Check connection string and Azure Redis firewall
4. **Health check failures**: Verify Redis accessibility from pods

### 8.2 Debug Commands

```bash
# Describe pod for detailed information
kubectl describe pod <pod-name> -n quote-api

# Check pod logs
kubectl logs <pod-name> -n quote-api

# Check events
kubectl get events -n quote-api --sort-by='.lastTimestamp'

# Test Redis connectivity from pod
kubectl exec -it <pod-name> -n quote-api -- sh
# Inside pod: telnet <redis-hostname> 6380

# Check service endpoints
kubectl get endpoints quote-api-service -n quote-api

# Check secret
kubectl get secret quote-api-secret -n quote-api -o yaml
```

## 9. Update and Rollback

### 9.1 Update Deployment

```bash
# Build and push new image version
docker build -t $ACR_LOGIN_SERVER/quote-api:v2.0.0 .
docker push $ACR_LOGIN_SERVER/quote-api:v2.0.0

# Update deployment
kubectl set image deployment/quote-api quote-api=$ACR_LOGIN_SERVER/quote-api:v2.0.0 -n quote-api

# Check rollout status
kubectl rollout status deployment/quote-api -n quote-api
```

### 9.2 Rollback if Needed

```bash
# Check rollout history
kubectl rollout history deployment/quote-api -n quote-api

# Rollback to previous version
kubectl rollout undo deployment/quote-api -n quote-api
```

## 10. Cleanup

### 10.1 Remove Quote API Resources

```bash
# Delete all Quote API resources
kubectl delete -f k8s-deployment.yaml

# Or delete namespace (removes everything)
kubectl delete namespace quote-api
```

## 11. Service Discovery Reference

For your frontend application, use these internal endpoints:

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Health Check | `http://quote-api-service.quote-api.svc.cluster.local/health` | Service health status |
| Quote Snapshot | `http://quote-api-service.quote-api.svc.cluster.local/v1/quotes?symbol=MSFT` | Get latest quote |
| WebSocket Stream | `ws://quote-api-service.quote-api.svc.cluster.local/ws` | Real-time quotes |

## 12. Environment Variables for Frontend

Set these environment variables in your frontend deployment to connect to the Quote API:

```yaml
env:
- name: QUOTE_API_BASE_URL
  value: "http://quote-api-service.quote-api.svc.cluster.local"
- name: QUOTE_API_WS_URL
  value: "ws://quote-api-service.quote-api.svc.cluster.local/ws"
``` 