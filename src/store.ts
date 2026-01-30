import { fail } from "./errors";

export interface Store {
  get(hash: string, field: string): Promise<string | null>;
  set(hash: string, field: string, value: string): Promise<void>;
  delete(hash: string, field: string): Promise<void>;
  list(hash: string): Promise<Array<{ field: string; value: string }>>;
}

interface UpstashResponse<T> {
  result?: T;
  error?: string;
}

export function createStore(url: string, token: string): Store {
  const baseUrl = url.replace(/\/$/, "");

  async function command<T>(cmd: string, ...args: string[]): Promise<T> {
    let res: Response;
    try {
      res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([cmd, ...args]),
      });
    } catch (err) {
      return fail("NETWORK", `store request failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) {
      const text = await res.text();
      return fail("NETWORK", `store request failed (${res.status}): ${text}`);
    }

    let data: UpstashResponse<T>;
    try {
      data = (await res.json()) as UpstashResponse<T>;
    } catch {
      return fail("NETWORK", "store response was not valid JSON");
    }

    if (data.error) {
      return fail("NETWORK", data.error);
    }

    return data.result as T;
  }

  return {
    async get(hash, field) {
      const result = await command<string | null>("HGET", hash, field);
      return result ?? null;
    },
    async set(hash, field, value) {
      await command<number>("HSET", hash, field, value);
    },
    async delete(hash, field) {
      await command<number>("HDEL", hash, field);
    },
    async list(hash) {
      const result = await command<unknown>("HGETALL", hash);
      if (!result) return [];
      if (!Array.isArray(result)) {
        return fail("NETWORK", "store response for HGETALL was not an array");
      }
      const pairs: Array<{ field: string; value: string }> = [];
      for (let i = 0; i < result.length; i += 2) {
        const field = result[i];
        const value = result[i + 1];
        if (typeof field !== "string" || typeof value !== "string") {
          return fail("NETWORK", "store response for HGETALL contained invalid entries");
        }
        pairs.push({ field, value });
      }
      pairs.sort((a, b) => a.field.localeCompare(b.field));
      return pairs;
    },
  };
}
