"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const baseTransports = [new winston_1.transports.Console()];
const lokiUrl = process.env.LOKI_URL;
if (lokiUrl) {
    try {
        const LokiTransport = require('@mgcrea/winston-loki');
        baseTransports.push(new LokiTransport({
            host: lokiUrl,
            json: true,
            labels: {
                service: process.env.OTEL_SERVICE_NAME || 'observabilidade-otel-api',
                env: process.env.NODE_ENV || 'development'
            },
            gracefulShutdown: true
        }));
    }
    catch (e) {
        // Se o pacote não estiver disponível, seguir apenas com Console
    }
}
const logger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
    transports: baseTransports
});
exports.default = logger;
