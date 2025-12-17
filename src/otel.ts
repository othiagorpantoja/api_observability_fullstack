import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const serviceName = process.env.OTEL_SERVICE_NAME || 'observabilidade-otel-api';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`
});

export const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()]
});

export async function startOtel() {
  await otelSDK.start();
}

export async function stopOtel() {
  await otelSDK.shutdown();
}
