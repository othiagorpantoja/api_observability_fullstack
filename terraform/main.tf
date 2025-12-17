terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = ">= 3.0.2"
    }
  }
}

provider "docker" {}

resource "docker_network" "observability" {
  name = "observability"
}

resource "docker_image" "grafana" { name = "grafana/grafana:11.2.0" }
resource "docker_image" "prometheus" { name = "prom/prometheus:v2.52.0" }
resource "docker_image" "jaeger" { name = "jaegertracing/all-in-one:1.57" }
resource "docker_image" "loki" { name = "grafana/loki:2.9.8" }
resource "docker_image" "promtail" { name = "grafana/promtail:2.9.8" }
resource "docker_image" "otel_collector" { name = "otel/opentelemetry-collector-contrib:0.103.0" }
resource "docker_image" "alertmanager" { name = "prom/alertmanager:v0.27.0" }
// Usar a imagem local previamente construída

resource "docker_container" "api" {
  name  = "api"
  image = "observabilidade-otel-api:local"
  networks_advanced { name = docker_network.observability.name }
  env = [
    "PORT=3000",
    "OTEL_SERVICE_NAME=observabilidade-otel-api",
    "OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318",
    "LOKI_URL=http://loki:3100",
    "API_REV=3"
  ]
  ports {
    internal = 3000
    external = 3000
  }
  depends_on = [docker_container.otel_collector]
}

resource "docker_container" "otel_collector" {
  name  = "otel-collector"
  image = docker_image.otel_collector.image_id
  networks_advanced { name = docker_network.observability.name }
  ports {
    internal = 4317
    external = 4317
  }
  ports {
    internal = 4318
    external = 4318
  }
  volumes {
    host_path      = abspath("${path.module}/../otel/otel-collector-config.yaml")
    container_path = "/etc/otel-collector-config.yaml"
    read_only      = true
  }
  command = ["--config", "/etc/otel-collector-config.yaml"]
}

resource "docker_container" "jaeger" {
  name  = "jaeger"
  image = docker_image.jaeger.image_id
  networks_advanced { name = docker_network.observability.name }
  ports {
    internal = 16686
    external = 16686
  }
  ports {
    internal = 14268
    external = 14268
  }
}

resource "docker_container" "prometheus" {
  name  = "prometheus"
  image = docker_image.prometheus.image_id
  networks_advanced { name = docker_network.observability.name }
  ports {
    internal = 9090
    external = 9090
  }
  env = [
    "PROM_ALERTING=1"
  ]
  volumes {
    host_path      = abspath("${path.module}/../prometheus/prometheus.yml")
    container_path = "/etc/prometheus/prometheus.yml"
    read_only      = true
  }
  volumes {
    host_path      = abspath("${path.module}/../prometheus/alerts.yml")
    container_path = "/etc/prometheus/alerts.yml"
    read_only      = true
  }
  volumes {
    host_path      = abspath("${path.module}/../data/prometheus")
    container_path = "/prometheus"
    read_only      = false
  }
}

resource "docker_container" "loki" {
  name  = "loki"
  image = docker_image.loki.image_id
  networks_advanced { name = docker_network.observability.name }
  ports {
    internal = 3100
    external = 3100
  }
  volumes {
    host_path      = abspath("${path.module}/../loki/loki-config.yml")
    container_path = "/etc/loki/loki-config.yml"
    read_only      = true
  }
  volumes {
    host_path      = abspath("${path.module}/../data/loki")
    container_path = "/loki"
    read_only      = false
  }
  command = ["-config.file=/etc/loki/loki-config.yml"]
}

resource "docker_container" "promtail" {
  name  = "promtail"
  image = docker_image.promtail.image_id
  networks_advanced { name = docker_network.observability.name }
  volumes {
    host_path      = abspath("${path.module}/../promtail/config.yml")
    container_path = "/etc/promtail/config.yml"
    read_only      = true
  }
  command = ["-config.file=/etc/promtail/config.yml"]
}

resource "docker_container" "alertmanager_default" {
  count = var.enable_slack ? 0 : 1
  name  = "alertmanager"
  image = docker_image.alertmanager.image_id
  networks_advanced { name = docker_network.observability.name }
  ports {
    internal = 9093
    external = 9093
  }
  volumes {
    host_path      = abspath("${path.module}/../alertmanager/alertmanager.yml")
    container_path = "/etc/alertmanager/alertmanager.yml"
    read_only      = true
  }
  command = ["--config.file=/etc/alertmanager/alertmanager.yml"]
}

resource "docker_container" "alertmanager_slack" {
  count = var.enable_slack ? 1 : 0
  name  = "alertmanager"
  image = docker_image.alertmanager.image_id
  networks_advanced { name = docker_network.observability.name }
  ports {
    internal = 9093
    external = 9093
  }
  env = [
    "SLACK_API_URL=${var.slack_api_url}"
  ]
  volumes {
    host_path      = abspath("${path.module}/../alertmanager/alertmanager-slack.yml")
    container_path = "/etc/alertmanager/alertmanager.yml"
    read_only      = true
  }
  command = ["--config.file=/etc/alertmanager/alertmanager.yml", "--config.expand-env"]
}

resource "docker_container" "grafana" {
  name  = "grafana"
  image = docker_image.grafana.image_id
  networks_advanced { name = docker_network.observability.name }
  ports {
    internal = 3000
    external = 3001
  }
  volumes {
    host_path      = abspath("${path.module}/../grafana/provisioning/datasources/datasources.yaml")
    container_path = "/etc/grafana/provisioning/datasources/datasources.yaml"
    read_only      = true
  }
  volumes {
    host_path      = abspath("${path.module}/../grafana/provisioning/dashboards/dashboards.yaml")
    container_path = "/etc/grafana/provisioning/dashboards/dashboards.yaml"
    read_only      = true
  }
  volumes {
    host_path      = abspath("${path.module}/../grafana/dashboards")
    container_path = "/var/lib/grafana/dashboards"
    read_only      = true
  }
}

output "grafana_url" {
  value = "http://localhost:3001"
}

output "prometheus_url" {
  value = "http://localhost:9090"
}

output "jaeger_url" {
  value = "http://localhost:16686"
}

output "loki_endpoint" {
  value = "http://localhost:3100"
}
