# Observabilidade — Métricas, Logs, Traces

## Métricas
- Expostas em `GET /metrics` via `prom-client`.
- Principais:
  - `http_requests_total{method,route,status}` — contagem por método/rota/status.
  - `http_request_duration_seconds{method,route,status}` — histograma de latência (buckets em segundos).
  - `alerts_received_total{alertname,severity}` — quantidade de alertas recebidos via webhook.
- Métricas default Node.js habilitadas: GC, heap, event loop, versão etc.

## Logs
- Gerados com `winston` em JSON.
- Middleware de requisições:
  - Campos: `msg`, `method`, `route`, `statusCode`, `duration_s`, `trace_id`, `span_id`.
  - Envio opcional ao Loki (`LOKI_URL`) via `src/loki.ts`.
  - Labels Loki: `service`, `env`, `method`, `route`, `status`, `trace_id`, `span_id`.
  - Erros intencionais (`/api/error`) permitem validação da pipeline.

## Traces
- `@opentelemetry/sdk-node` com auto‑instrumentation (`getNodeAutoInstrumentations`).
- Exportador OTLP HTTP configurado para Collector (`OTEL_EXPORTER_OTLP_ENDPOINT` → `/v1/traces`).
- Collector exporta para Jaeger via OTLP gRPC.
- Resource attributes: `service.name`, `deployment.environment`.

## Grafana
- Datasources provisionados: Prometheus, Loki, Jaeger.
- Dashboards:
  - `API - Métricas`: RPS e latência p95.
  - `API - Logs`: timeseries por rota + stream de logs.
  - `Traces - Jaeger`: link para UI.
  - `API - SLOs`: disponibilidade, erro % e latência p95; tabela por rota.

## Alertas (Prometheus)
- `HighLatencyP95`: p95 > 0.5s por 5m.
- `HighErrorRate`: erros 5xx > 5% por 5m.
- Ajuste thresholds conforme SLOs e contexto.

## Boas Práticas
- Evitar logs sensíveis; mascarar dados.
- Padronizar labels/rotas.
- Revisar buckets de latência conforme perfil de tráfego.
 - Correlacionar logs ↔ traces usando `trace_id`/`span_id` no Explore (Loki).
