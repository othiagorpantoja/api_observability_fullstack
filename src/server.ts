import express, { type Request, type Response, type NextFunction } from 'express';
import { context, trace } from '@opentelemetry/api';
import logger from './logger';
import { startOtel, stopOtel } from './otel';
import client from 'prom-client';
import { pushLoki } from './loki';

const app = express();
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const requestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP recebidas',
  labelNames: ['method', 'route', 'status']
});
register.registerMetric(requestCounter);

const requestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
register.registerMetric(requestDuration);

const alertsReceived = new client.Counter({
  name: 'alerts_received_total',
  help: 'Total de alertas recebidos via webhook',
  labelNames: ['alertname', 'severity']
});
register.registerMetric(alertsReceived);

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const span = trace.getSpan(context.active());
  const sc = span?.spanContext();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e9;
    const route = req.route?.path || req.path;
    requestCounter.labels(req.method, route, String(res.statusCode)).inc();
    requestDuration.labels(req.method, route, String(res.statusCode)).observe(duration);
    const logLine = { msg: 'http_request', method: req.method, route, statusCode: res.statusCode, duration_s: duration, trace_id: sc?.traceId, span_id: sc?.spanId };
    logger.info(logLine);
    pushLoki({
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

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/items', async (_req: Request, res: Response) => {
  await new Promise((r) => setTimeout(r, 50));
  res.json([{ id: 1, name: 'item-1' }, { id: 2, name: 'item-2' }]);
});

app.get('/api/error', (req: Request, res: Response) => {
  const span = trace.getSpan(context.active());
  const sc = span?.spanContext();
  const logLine = { msg: 'intentional_error', detail: 'Simulando erro para logs', trace_id: sc?.traceId, span_id: sc?.spanId };
  logger.error(logLine);
  pushLoki({
    level: 'error',
    service: process.env.OTEL_SERVICE_NAME || 'observabilidade-otel-api',
    env: process.env.NODE_ENV || 'development',
    route: '/api/error',
    trace_id: sc?.traceId || '',
    span_id: sc?.spanId || ''
  }, logLine);
  res.status(500).json({ error: 'simulated' });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.post('/alertmanager/webhook', (req: Request, res: Response) => {
  const payload = req.body as any;
  const alerts: any[] = Array.isArray(payload?.alerts) ? payload.alerts : [];
  for (const a of alerts) {
    const labels = a.labels || {};
    const alertname = labels.alertname || 'unknown';
    const severity = labels.severity || 'none';
    alertsReceived.labels(alertname, severity).inc();
    const logLine = { msg: 'alert_received', alertname, severity, status: a.status, labels, annotations: a.annotations };
    logger.warn(logLine);
    pushLoki({
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
  await startOtel();
  const server = app.listen(port, () => {
    logger.info({ msg: 'server_started', port });
  });
  const shutdown = async () => {
    logger.info({ msg: 'server_stopping' });
    server.close(() => process.exit(0));
    await stopOtel();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ msg: 'startup_error', error: err.message });
  process.exit(1);
});
