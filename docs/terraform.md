# Terraform — Infra via Provider Docker

## Visão Geral
- Cria rede `observability` e containers: API, Collector, Prometheus, Alertmanager, Loki, Promtail, Grafana, Jaeger.
- Volumes montam configurações locais (Prometheus, Alertmanager, Grafana, Loki, Collector).

## Recursos Principais (`terraform/main.tf`)
- `docker_network.observability`
- `docker_image.*` para cada serviço
- `docker_container.*` com portas, envs e volumes
- `output` com URLs úteis
 - Variáveis: `terraform/variables.tf` (`enable_slack`, `slack_api_url`)

## Fluxo de Trabalho
- Inicializar: `terraform init`
- Planejar/aplicar: `terraform apply -auto-approve`
- Destruir: `terraform destroy -auto-approve`

## Atualização da API
- Rebuild: `docker build -t observabilidade-otel-api:local .`
- `terraform apply -auto-approve` (env `API_REV` força recriação da API)

## Notas
- Windows: caminhos absolutos via `abspath`, evitar volumes de host não suportados (ex.: leitura de `/var/lib/docker/containers`).
- Collector usa config em `otel/otel-collector-config.yaml` para pipelines OTLP.
- Prometheus carrega `prometheus.yml` e `alerts.yml`; Alertmanager usa `alertmanager.yml`.
 - Persistência: volumes em `data/prometheus` → `/prometheus` e `data/loki` → `/loki`.

## Slack opcional
- Toggle via `-var="enable_slack=true" -var="slack_api_url=<URL_WEBHOOK_SLACK>"`.
- Usa `alertmanager/alertmanager-slack.yml` com `--config.expand-env`.
