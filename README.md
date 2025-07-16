Trading System Architecture 
                               ┌────────────────────┐
                               │     web‑ui pod     │
                               │        (AKS)       │
                               │ • React/NextJS UI  │
                               │ • Health checks    │
                               └────────┬───────────┘
                    REST / gRPC         │           WebSocket quotes
                                         │                     ▲
                                         │                     │
                  ┌──────────────────────▼─────────────────────┐
                  │               AKS cluster                  │
                  │                                            │
                  │  ┌────────────────────┐   ┌────────────────────┐
                  │  │   trade‑api pod    │   │   quote‑api pod    │
                  │  │      (AKS)         │   │      (AKS)         │
                  │  │ • /v1/orders       │   │ • /v1/quotes       │
                  │  │ • /v1/accounts     │   │ • Publishes ticks  │
                  │  │ • Managed ID*      │   │ • Managed ID*      │
                  │  └────────┬───────────┘   └────────┬───────────┘
                  │           │ read‑through cache      │
                  └───────────┼──────────────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Azure Redis  │
                       │   Cache      │
                       └──────────────┘
                              ▲
                              │ secrets / connection
                              │ via Managed Identity*
                       ┌──────────────┐
                       │ Azure Key    │
                       │   Vault      │
                       └──────────────┘
