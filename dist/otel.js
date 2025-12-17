"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelSDK = void 0;
exports.startOtel = startOtel;
exports.stopOtel = stopOtel;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const resources_1 = require("@opentelemetry/resources");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const serviceName = process.env.OTEL_SERVICE_NAME || 'observabilidade-otel-api';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`
});
exports.otelSDK = new sdk_node_1.NodeSDK({
    resource: new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    }),
    traceExporter,
    instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()]
});
async function startOtel() {
    await exports.otelSDK.start();
}
async function stopOtel() {
    await exports.otelSDK.shutdown();
}
