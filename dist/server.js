"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const api_1 = require("@opentelemetry/api");
const logger_1 = __importDefault(require("./logger"));
const otel_1 = require("./otel");
const prom_client_1 = __importDefault(require("prom-client"));
const loki_1 = require("./loki");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register });
const requestCounter = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Total de requisições HTTP recebidas',
    labelNames: ['method', 'route', 'status']
});
register.registerMetric(requestCounter);
const requestDuration = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração das requisições HTTP em segundos',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
register.registerMetric(requestDuration);
const alertsReceived = new prom_client_1.default.Counter({
    name: 'alerts_received_total',
    help: 'Total de alertas recebidos via webhook',
    labelNames: ['alertname', 'severity']
});
register.registerMetric(alertsReceived);
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    const span = api_1.trace.getSpan(api_1.context.active());
    const sc = span?.spanContext();
    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e9;
        const route = req.route?.path || req.path;
        requestCounter.labels(req.method, route, String(res.statusCode)).inc();
        requestDuration.labels(req.method, route, String(res.statusCode)).observe(duration);
        const logLine = { msg: 'http_request', method: req.method, route, statusCode: res.statusCode, duration_s: duration, trace_id: sc?.traceId, span_id: sc?.spanId };
        logger_1.default.info(logLine);
        (0, loki_1.pushLoki)({
            level: 'info',
            service: process.env.OTEL_SERVICE_NAME || 'observabilidade-otel-api',
            env: process.env.NODE_ENV || 'development',
            method: req.method,
            route,
            status: String(res.statusCode),
            trace_id: sc?.traceId || '',
            span_id: sc?.spanId || ''
        }, logLine);
    });
    next();
});
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/api/items', async (_req, res) => {
    await new Promise((r) => setTimeout(r, 50));
    res.json([{ id: 1, name: 'item-1' }, { id: 2, name: 'item-2' }]);
});
app.get('/api/error', (req, res) => {
    const span = api_1.trace.getSpan(api_1.context.active());
    const sc = span?.spanContext();
    const logLine = { msg: 'intentional_error', detail: 'Simulando erro para logs', trace_id: sc?.traceId, span_id: sc?.spanId };
    logger_1.default.error(logLine);
    (0, loki_1.pushLoki)({
        level: 'error',
        service: process.env.OTEL_SERVICE_NAME || 'observabilidade-otel-api',
        env: process.env.NODE_ENV || 'development',
        route: '/api/error',
        trace_id: sc?.traceId || '',
        span_id: sc?.spanId || ''
    }, logLine);
    res.status(500).json({ error: 'simulated' });
});
app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
app.post('/alertmanager/webhook', (req, res) => {
    const payload = req.body;
    const alerts = Array.isArray(payload?.alerts) ? payload.alerts : [];
    for (const a of alerts) {
        const labels = a.labels || {};
        const alertname = labels.alertname || 'unknown';
        const severity = labels.severity || 'none';
        alertsReceived.labels(alertname, severity).inc();
        const logLine = { msg: 'alert_received', alertname, severity, status: a.status, labels, annotations: a.annotations };
        logger_1.default.warn(logLine);
        (0, loki_1.pushLoki)({
            level: 'warn',
            service: process.env.OTEL_SERVICE_NAME || 'observabilidade-otel-api',
            env: process.env.NODE_ENV || 'development',
            alertname,
            severity
        }, logLine);
    }
    res.json({ received: alerts.length });
});
const port = Number(process.env.PORT || 3000);
async function main() {
    await (0, otel_1.startOtel)();
    const server = app.listen(port, () => {
        logger_1.default.info({ msg: 'server_started', port });
    });
    const shutdown = async () => {
        logger_1.default.info({ msg: 'server_stopping' });
        server.close(() => process.exit(0));
        await (0, otel_1.stopOtel)();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
main().catch((err) => {
    logger_1.default.error({ msg: 'startup_error', error: err.message });
    process.exit(1);
});
