Run 

`az deployment sub create --location eastus --template-file main.bicep`


Trading System Architecture with Observability
                                    ┌──────────────────────────────────────┐
                                    │        Azure Front Door              │
                                    │  • WAF + SSL + global routing        │
                                    │  • Real‑time analytics               │
                                    │  • WAF logs & security events        │
                                    └──────────────────────────────────────┘
                                                │
                                ┌───────────────┴───────────────┐
                                │  Traffic to SPA / REST & WS   │
                                └───────────────┬───────────────┘
                    ┌──────────────────┐            ┌────────────────────┐
                    │  web‑ui pod      │            │  quote‑api pod     │
                    │  (AKS)           │            │  (AKS)             │
                    │  • React/NextJS  │            │  • /v1/quotes      │
                    │  • App Insights  │───────────▶│  • OTEL traces     │
                    │  • Health checks │            │  • Custom metrics  │
                    └──────┬───────────┘            └─────────┬──────────┘
                           │ REST cart / trade ops               │
                  ┌────────▼──────────┐                  publishes fresh quotes
                  │ trade‑api pod    │◄───────────────────────────────────────────┐
                  │ (AKS)            │                                              │
                  │ • /v1/orders     │                                              │
                  │ • /v1/accounts   │                                              │
                  │ • OTEL traces    │                                              │
                  │ • Business metrics│                                             │
                  │ • Managed Identity├─┐                                           │
                  └──────┬────────────┘  │                                           │
                         │               │                                           │
               read‑through cache       │                                           │
                         │               │                                           │
                 ┌───────▼────────┐      │                                           │
                 │ Azure Cache    │      │       ┌─────────────────────────┐         │
                 │ for Redis      │      │       │   Azure Key Vault      │         │
                 │ • Cache hits/  │      │       │ • Secrets for SQL,     │         │
                 │   misses       │      │       │   Redis, API keys      │         │
                 │ • Pool stats   │      │       │ • Access policies      │         │
                 └───────┬────────┘      │       │ • Audit logs           │         │
                         │ MISS/writes   │       └────────┬────────────────┘         │
                         │               │                │ Managed Identities      │
                 ┌───────▼────────┐      │                │ per‑pod (trade, quote)  │
                 │ Azure SQL DB   │◄─────┘                └─────────────────────────┘
                 │ (Hyperscale)   │
                 │ • Query Perf   │
                 │ • Wait stats & │
                 │   Deadlock det │
                 │ • Conn. pool   │
                 └────────────────┘
                                                │
                                                ▼
                                 ┌─────────────────────────────────────┐
                                 │       Observability Layer         │
                                 │  • Azure Monitor (metrics + alerts)│
                                 │  • Application Insights (traces)  │
                                 │  • Log Analytics (logs & queries) │
                                 │  • Real‑time dashboards & alerts  │
                                 └─────────────────────────────────────┘
