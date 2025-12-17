import { createLogger, format, transports } from 'winston';

const baseTransports: any[] = [new transports.Console()];

const lokiUrl = process.env.LOKI_URL;
if (lokiUrl) {
  try {
    const LokiTransport = require('@mgcrea/winston-loki');
    baseTransports.push(
      new LokiTransport({
        host: lokiUrl,
        json: true,
        labels: {
          service: process.env.OTEL_SERVICE_NAME || 'observabilidade-otel-api',
          env: process.env.NODE_ENV || 'development'
        },
        gracefulShutdown: true
      })
    );
  } catch (e) {
    // Se o pacote não estiver disponível, seguir apenas com Console
  }
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: baseTransports
});

export default logger;
