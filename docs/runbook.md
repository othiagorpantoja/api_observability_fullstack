# Runbook — Observabilidade OTel API

Guia operacional para incidentes envolvendo API, Coletor OTel, Prometheus, Alertmanager, Loki, Grafana e Jaeger.

## Papéis e Escopo
- API de aplicação (porta `3000`): responde e expõe `/metrics`.
- Coletor OTel (`4317`, `4318`): recebe OTLP e encaminha para Jaeger.
- Prometheus (`9090`): coleta métricas e avalia regras.
- Alertmanager (`9093`): roteia alertas.
- Grafana (`3001`): visualização.
- Loki (`3100`): armazenamento de logs.
- Jaeger (`16686`): visualização de traces.

## Diagnóstico Rápido
1. Verificar saúde da API:
   - `Invoke-WebRequest -Uri http://localhost:3000/health`
2. Confirmar métricas:
   - `Invoke-WebRequest -Uri http://localhost:3000/metrics`
3. Confirmar Prometheus e Alertmanager:
   - `Invoke-WebRequest -Uri http://localhost:9090`
   - `Invoke-WebRequest -Uri http://localhost:9093`
4. Confirmar Grafana e Jaeger:
   - `Invoke-WebRequest -Uri http://localhost:3001`
   - `Invoke-WebRequest -Uri http://localhost:16686`
5. Checar SLOs:
   - Painel “API - SLOs” no Grafana.

## Playbooks de Incidente
### Latência Alta (p95)
- Detecção: alerta `HighLatencyP95` (p95 > 0.5s por 5m).
- Ações:
  - Checar tráfego recente e rotas com maior latência no dashboard “API - Métricas”.
  - Ver traces no Jaeger para rotas afetadas, identificar spans lentos.
  - Investigar logs (Grafana Explore Loki) e aplicar otimizações (caching, I/O, dependências). 
  - Validar após mitigação: latência retorna abaixo do threshold.

### Taxa de Erros Alta (5xx)
- Detecção: alerta `HighErrorRate` (>5% por 5m).
- Ações:
  - Inspecionar `/api/error` e rotas reais com 5xx nos logs.
  - Ver traces e mensagens de erro (stack) nos logs.
  - Corrigir regressões e reimplantar a API.
  - Confirmar redução de erros e fechamento do alerta.
  - Se habilitado, validar entrega no Slack (receiver `slack`).

### Sem Traces no Jaeger
- Sintomas: Jaeger sem dados para `observabilidade-otel-api`.
- Ações:
  - Confirmar Collector vivo (`4317`,`4318`).
  - Validar `OTEL_EXPORTER_OTLP_ENDPOINT` da API (infra: `http://otel-collector:4318`).
  - Checar `otel/otel-collector-config.yaml` pipelines (receivers/exporters). 
  - Reiniciar Collector e API: `terraform apply -auto-approve`.

### Sem Logs no Loki
- Sintomas: Grafana Explore vazio.
- Ações:
  - Confirmar `LOKI_URL` configurado na API (`http://loki:3100`).
  - Gerar tráfego e verificar labels (`service`, `route`, `level`).
  - Verificar saúde do Loki (`/ready`, `/metrics`), reiniciar contêiner se necessário.

### Prometheus ou Alertmanager indisponíveis
- Ações:
  - Ver logs dos contêineres e volumes montados.
  - Reaplicar Terraform.
  - Validar `rule_files` e `alerting` no `prometheus.yml`.

### Grafana indisponível
- Ações:
  - Reiniciar contêiner Grafana.
  - Verificar provisioning de datasources e dashboards.

## Remediação e Reimplantação
- Atualizar API:
  - `docker build -t observabilidade-otel-api:local .`
  - `terraform apply -auto-approve`
- Derrubar a infra: `terraform destroy -auto-approve`
 - Habilitar Slack (opcional): `terraform apply -auto-approve -var="enable_slack=true" -var="slack_api_url=<URL_WEBHOOK_SLACK>"`

## Padrões de Logs e Métricas
- Logs: JSON com campos `msg`, `method`, `route`, `statusCode`, `duration_s`.
- Métricas: `http_requests_total`, `http_request_duration_seconds`, `alerts_received_total`.
 - Persistência: histórico mantém‑se após reinícios (Prometheus/Loki com volumes).

## SLOs sugeridos
- Disponibilidade da API ≥ 99.9%
- Latência p95 ≤ 250ms (ajustar thresholds de alerta conforme contexto)
- Erro 5xx ≤ 1%

## Escalonamento
- Se serviços base (Docker/Host) apresentam falhas persistentes, escalar para suporte de plataforma.

## Checklist de Encerramento
- Alertas resolvidos ou silenciados conscientemente (com justificativa).
- Dashboards retornaram a valores normais.
- Logs e traces confirmados.
- Post‑mortem (se aplicável) e melhoria contínua registrada.
