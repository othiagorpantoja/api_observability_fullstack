# Alertas — Regras e Tuning

## Regras Atuais (`prometheus/alerts.yml`)
- `HighLatencyP95`
  - Query: `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m]))) > 0.5`
  - `for: 5m`, `severity: warning`
- `HighErrorRate`
  - Query: `(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > 0.05`
  - `for: 5m`, `severity: warning`
 - `HighLatencyP95ByRoute`
   - Query: `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))) > 0.5`
   - `for: 5m`, `severity: warning`, com label `route`
 - `HighErrorRateByRoute`
   - Query: `((sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))) / (sum by (route) (rate(http_requests_total[5m])))) > 0.05`
   - `for: 5m`, `severity: warning`, com label `route`

## Pipeline de Alerta
- Prometheus avalia regras e envia para Alertmanager (`alerting` em `prometheus.yml`).
- Alertmanager encaminha ao webhook da API (`/alertmanager/webhook`).
- API contabiliza métricas e registra logs com labels.
 - Visualização no Grafana: use o dashboard “Alerts Overview”.

## Tuning
- Ajustar limiares conforme SLOs e carga real.
- Acrescentar silenciamentos e roteamento por `severity`/`alertname` no Alertmanager.
- Integrar canais externos (Slack/Email) adicionando `receivers` no `alertmanager.yml`.

## Slack (opcional)
- Toggle via Terraform:
  - `cd terraform`
  - `terraform apply -auto-approve -var="enable_slack=true" -var="slack_api_url=<URL_WEBHOOK_SLACK>"`
- Config usa `alertmanager/alertmanager-slack.yml` e `--config.expand-env`.
- Roteamento: alertas `severity="critical"` vão para o receiver `slack`.
