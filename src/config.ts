import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fail } from "./errors";

export interface StoreConfig {
  url: string;
  token: string;
}

const ENV_URL = "CTXBIN_STORE_URL";
const ENV_TOKEN = "CTXBIN_STORE_TOKEN";

export async function loadConfig(): Promise<StoreConfig> {
  const envUrl = process.env[ENV_URL];
  const envToken = process.env[ENV_TOKEN];

  if (envUrl || envToken) {
    if (!envUrl || !envToken) {
      return fail("INVALID_INPUT", "both CTXBIN_STORE_URL and CTXBIN_STORE_TOKEN must be set");
    }
    return { url: envUrl, token: envToken };
  }

  const configPath = path.join(os.homedir(), ".ctxbin", "config.json");
  let raw: string;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch {
    return fail("INVALID_INPUT", "missing CTXBIN_STORE_URL/CTXBIN_STORE_TOKEN and no ~/.ctxbin/config.json");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("INVALID_INPUT", "invalid JSON in ~/.ctxbin/config.json");
  }

  const url = parsed.store_url || parsed.storeUrl || parsed.url;
  const token = parsed.store_token || parsed.storeToken || parsed.token;
  if (!url || !token) {
    return fail("INVALID_INPUT", "config.json must include store_url and store_token");
  }

  return { url, token };
}

export async function writeConfig(config: StoreConfig): Promise<void> {
  const dir = path.join(os.homedir(), ".ctxbin");
  const configPath = path.join(dir, "config.json");
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const payload = {
    store_url: config.url,
    store_token: config.token,
  };
  await fs.writeFile(configPath, JSON.stringify(payload, null, 2), "utf8");
}
