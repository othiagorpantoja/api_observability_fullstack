# Grafana — Datasources e Dashboards

## Datasources
- Provisionados em `grafana/provisioning/datasources/datasources.yaml`:
  - Prometheus (`http://prometheus:9090`)
  - Loki (`http://loki:3100`)
  - Jaeger (`http://jaeger:16686`)

## Dashboards
- `grafana/dashboards/api-metrics.json` — RPS e latência p95.
  - Inclui “Top rotas por p95 (5m)” com thresholds e drill‑down para logs.
  - Inclui “Top rotas por erro % (5m)” com thresholds e drill‑down para logs.
- `grafana/dashboards/api-logs.json` — timeseries de logs por rota e stream.
- `grafana/dashboards/traces-jaeger.json` — link para Jaeger UI.
- `grafana/dashboards/api-slo.json` — disponibilidade, erro % e p95; visão por rota.
- `grafana/dashboards/logs-traces.json` — instruções e painel de logs com correlação para Jaeger.
 - `grafana/dashboards/alerts-overview.json` — tabela de alertas ativos (via `ALERTS`).

## Explore
- Logs: datasource `Loki`, filtros por `service`, `route`, `level`.
- Métricas: datasource `Prometheus`, queries de latência e erros.
- Traces: usar Jaeger UI (link no dashboard).
 - Data links: derived field `trace_id` no Loki gera link direto para Jaeger.

## Customização
- Importar novos dashboards via UI.
- Ajustar datasources e provisionamento alterando arquivos na pasta `provisioning`.
