```
npm install
npm run build
npm run dev

$ACR_NAME = "myacr123"
docker build -t "$ACR_NAME.azurecr.io/trading-web-ui:1.0.0" .
docker push  "$ACR_NAME.azurecr.io/trading-web-ui:1.0.0"

kubectl apply -f web-ui-deployment.yaml
```