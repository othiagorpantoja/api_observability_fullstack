"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushLoki = pushLoki;
const lokiUrl = process.env.LOKI_URL;
function nowNanos() {
    return String(BigInt(Date.now()) * 1000000n);
}
async function pushLoki(labels, line) {
    if (!lokiUrl || typeof fetch !== 'function')
        return;
    const url = `${lokiUrl}/loki/api/v1/push`;
    const stream = { stream: labels, values: [[nowNanos(), JSON.stringify(line)]] };
    const body = JSON.stringify({ streams: [stream] });
    try {
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    }
    catch { }
}
