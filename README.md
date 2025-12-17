# Observabilidade OTel API — Full Stack

API Node.js/TypeScript com observabilidade completa: OpenTelemetry (traces), Prometheus (métricas), Loki/Promtail (logs), Jaeger, Grafana, Alertmanager e provisionamento via Terraform (provider Docker). Inclui CI/CD com GitHub Actions.

## Componentes
- API (`Express`, `prom-client`, `winston`) e OTel SDK (`@opentelemetry/sdk-node`) exportando OTLP.
- Collector (`otel-collector-contrib`) encaminha para Jaeger via OTLP gRPC.
- Prometheus coleta `/metrics` e carrega regras de alertas.
- Alertmanager envia webhooks para a API.
- Loki recebe logs (envio direto via HTTP) e Promtail opcional.
- Grafana com datasources Prometheus, Loki e Jaeger e dashboards provisionados.

## Pré‑requisitos
- Docker Desktop
- Terraform 1.14+
- Node.js 18+

## Setup rápido
1. Instalar dependências e build local:
   - `npm install`
   - `npm run typecheck`
   - `npm run build`
   - `docker build -t observabilidade-otel-api:local .`
2. Provisionar stack:
   - `cd terraform`
   - `terraform init`
   - `terraform apply -auto-approve`
3. Acessos:
   - API: `http://localhost:3000`
   - Metrics: `http://localhost:3000/metrics`
   - Grafana: `http://localhost:3001` (admin/admin)
   - Prometheus: `http://localhost:9090`
   - Jaeger: `http://localhost:16686`
   - Alertmanager: `http://localhost:9093`
   - Loki: `http://localhost:3100`

## Endpoints da API
- `GET /health` — status
- `GET /api/items` — dados simulados
- `GET /api/error` — erro intencional
- `GET /metrics` — métricas Prometheus
- `POST /alertmanager/webhook` — recepção de alertas (webhook)

## Observabilidade
- Métricas
  - `http_requests_total{method,route,status}`
  - `http_request_duration_seconds{method,route,status}` (histogram)
  - `alerts_received_total{alertname,severity}`
  - Métricas default do Node.js via `prom-client.collectDefaultMetrics`
- Logs
  - Estruturados (`JSON`) com `winston` + envio direto opcional ao Loki (`LOKI_URL`).
  - Labels no Loki incluem `service`, `env`, `method`, `route`, `status`, `trace_id`, `span_id`.
- Traces
  - OTel auto‑instrumentation (HTTP/Express) e exportação OTLP (`4318`) ao Collector.
  - Collector exporta para Jaeger via OTLP gRPC (`4317`).
 - Dashboards
   - `API - Métricas`, `API - Logs`, `API - SLOs`, `Traces - Jaeger`.

## Ambientes e variáveis
- `OTEL_SERVICE_NAME` — nome do serviço (default: `observabilidade-otel-api`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` — endpoint OTLP (dev: `http://localhost:4318` / infra: `http://otel-collector:4318`)
- `LOKI_URL` — endpoint Loki para envio direto (ex.: `http://loki:3100`)

## Estrutura do projeto
- `src/server.ts` — servidor, métricas e endpoints
- `src/otel.ts` — OTel SDK e exportador OTLP
- `src/logger.ts` — logger JSON (Console) com fallback
- `src/loki.ts` — push de logs ao Loki via HTTP
- `otel/otel-collector-config.yaml` — pipelines OTel
- `prometheus/prometheus.yml` & `prometheus/alerts.yml` — scrape e alertas
- `alertmanager/alertmanager.yml` — webhook -> API
- `alertmanager/alertmanager-slack.yml` — receiver Slack opcional
- `grafana/provisioning/*` & `grafana/dashboards/*` — datasources e dashboards
- `terraform/main.tf` — containers e rede
- `terraform/variables.tf` — toggle `enable_slack` e `slack_api_url`
- `.github/workflows/*` — CI & CD

## Operação
- Subir: `terraform apply -auto-approve`
- Validar: chamadas em `/health`, `/metrics`, trafegar em `/api/items` e `/api/error` e ver no Grafana/Jaeger.
- Atualizar API:
  - `docker build -t observabilidade-otel-api:local .`
  - `terraform apply -auto-approve` (a env `API_REV` força recriação)
- Derrubar: `terraform destroy -auto-approve`
 - Habilitar Slack (opcional):
   - `terraform apply -auto-approve -var="enable_slack=true" -var="slack_api_url=<URL_WEBHOOK_SLACK>"`

## CI/CD
- CI: `typecheck` e `build` em PR/push (Node 20).
- CD: `workflow_dispatch` para `terraform init/validate/plan` (pode habilitar `apply` com backend remoto + segredos).

## Notas de Windows
- Promtail leitura de `/var/lib/docker/containers` pode não funcionar; uso de `LOKI_URL` garante logs no Loki.
- Volumes são montados via caminhos absolutos (`abspath`) no Terraform.
 - Persistência: dados em `data/prometheus` e `data/loki` no host.

## Segurança
- Não comitar segredos.
- Ao integrar Alertmanager com Slack/Email, usar variáveis de ambiente/secretos.

## Próximos passos
- Ajustar thresholds de alertas conforme SLOs e carga real.
- Enriquecer traces com spans custom e correlação de logs.
