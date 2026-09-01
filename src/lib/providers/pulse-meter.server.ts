function meterUrl(): string {
  const value = process.env["LEAH_PULSE_METER_URL"]?.trim() ?? "";
  if (!value) throw new Error("LEAH_PULSE_METER_URL is not configured");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.pathname.endsWith("/leah-meter")) {
    throw new Error("LEAH_PULSE_METER_URL must be an HTTPS leah-meter endpoint");
  }
  return url.toString();
}

function workerSecret(): string {
  const value = process.env["LEAH_WORKER_SECRET"]?.trim() ?? "";
  if (value.length < 32) throw new Error("LEAH_WORKER_SECRET is not configured");
  return value;
}

export async function pulseMeter(action: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (Object.prototype.hasOwnProperty.call(body, "workspace_id") || Object.prototype.hasOwnProperty.call(body, "workspaceId")) {
    throw new Error("workspace_id must never be supplied to the Pulse LEAH meter");
  }
  const response = await fetch(meterUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Leah-Worker-Secret": workerSecret(),
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : `LEAH meter HTTP ${response.status}`;
    throw new Error(message.slice(0, 240));
  }
  return data;
}
