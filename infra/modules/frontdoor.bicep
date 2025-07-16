// modules/frontdoor.bicep
// Azure Front Door Standard with WAF, routing to API and WS endpoints

// modules/frontdoor.bicep content:
param name string
param location string

resource frontDoor 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: name
  location: location
  sku: { name: 'Standard_AzureFrontDoor' }
}

// WAF policy
resource waf 'Microsoft.Network/frontdoorWebApplicationFirewallPolicies@2025-03-01' = {
  name: '${name}-waf'
  location: location
  properties: {
     policySettings: {
      enabledState: 'Enabled'         // turn the policy on
      mode: 'Prevention'             // Prevention vs Detection
      redirectUrl: null              // optional custom redirect on block
      customBlockResponseStatusCode: 403
    }
    customRules: []
  }
}

// Front Door endpoint
resource fdEndpoint 'Microsoft.Cdn/profiles/endpoints@2023-05-01' = {
  name: 'endpoint'
  parent: frontDoor
  location: location
  properties: {
    origins: [ /* point to AKS ingress IP */ ]
    defaultOriginGroup: 'defaultGroup'
    routingRules: [
      {
        name: 'api-route'
        properties: {
          patternsToMatch: ['/api/*']
          originGroup: 'apiGroup'
          httpsRedirect: 'Enabled'
        }
      }
      {
        name: 'ws-route'
        properties: {
          patternsToMatch: ['/ws/quotes']
          originGroup: 'quoteGroup'
          httpsRedirect: 'Enabled'
        }
      }
    ]
  }
}

output frontDoorEndpoint string = fdEndpoint.properties.hostName

