const lokiUrl = process.env.LOKI_URL;

function nowNanos(): string {
  return String(BigInt(Date.now()) * 1000000n);
}

export async function pushLoki(labels: Record<string, string>, line: unknown): Promise<void> {
  if (!lokiUrl || typeof fetch !== 'function') return;
  const url = `${lokiUrl}/loki/api/v1/push`;
  const stream = { stream: labels, values: [[nowNanos(), JSON.stringify(line)]] };
  const body = JSON.stringify({ streams: [stream] });
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  } catch {}
}
