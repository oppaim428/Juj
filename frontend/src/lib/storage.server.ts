// Emergent Object Storage over its HTTP API. The storage key is minted once and reused.
const BASE = `${((process.env["INTEGRATION_PROXY_URL"] || "").trim() || "https://integrations.emergentagent.com").replace(/\/+$/, "")}/objstore/api/v1/storage`;
export const APP_PREFIX = "juj";
let key: Promise<string> | undefined;

function storageKey(force = false) {
  if (force) key = undefined;
  key ??= fetch(`${BASE}/init`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ emergent_key: process.env["EMERGENT_LLM_KEY"] }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error(`storage init ${r.status}`);
      return ((await r.json()) as { storage_key: string }).storage_key;
    })
    .catch((e) => {
      key = undefined;
      throw e;
    });
  return key;
}

async function call(path: string, init: RequestInit, retry = true): Promise<Response> {
  const r = await fetch(`${BASE}/objects/${path}`, { ...init, headers: { ...(init.headers as Record<string, string>), "X-Storage-Key": await storageKey() } });
  if (r.status === 404 && retry) {
    await storageKey(true);
    return call(path, init, false);
  }
  return r;
}

export async function putObject(path: string, data: Uint8Array, contentType: string) {
  const r = await call(path, { method: "PUT", headers: { "Content-Type": contentType }, body: data });
  if (!r.ok) throw new Error(`storage put ${r.status}`);
  return (await r.json()) as { path: string; size: number };
}

export async function getObject(path: string) {
  const r = await call(path, { method: "GET" });
  if (!r.ok) return null;
  return { body: await r.arrayBuffer(), type: r.headers.get("content-type") ?? "application/octet-stream" };
}
